# ARCHITECTURE — Crypto Alert

> How the system is built. Scope lives in `SPEC.md`; exact contracts in `API.md`; schema in `DATABASE.md`. If this file and API.md/DATABASE.md disagree on a name or field, **API.md / DATABASE.md win** and this file must be fixed.

## 1. System overview

```mermaid
flowchart LR
  subgraph Binance["Binance (public market data, no API key)"]
    BREST["REST https://data-api.binance.vision"]
    BWS["WS wss://data-stream.binance.vision"]
  end
  subgraph Server["Backend — one NestJS process (Singapore)"]
    PROV["MarketDataProvider\n(BinanceProvider | MockProvider)"]
    BUS["PriceBus (in-process events)"]
    TS["TickerStore (memory)"]
    CC["CandleCacheService"]
    SM["SubscriptionManager (ref-count)"]
    GW["RealtimeGateway (Socket.IO)"]
    AW["AlertWorker"]
    NS["NotificationService → channels"]
    API["REST /api/v1/*"]
    SPA["Static frontend (built)"]
  end
  DB[(PostgreSQL)]
  Browser["Browser — React SPA"]

  BREST --> PROV
  BWS -- "1 connection" --> PROV
  PROV --> BUS
  BUS --> TS
  BUS --> GW
  BUS --> AW
  AW --> DB
  AW --> NS --> GW
  CC <--> DB
  CC --> PROV
  SM --> PROV
  GW --> SM
  API <--> DB
  Browser <-- "HTTPS /api/v1" --> API
  Browser <-- "Socket.IO /socket.io" --> GW
  Browser --> SPA
```

**Golden rule:** browsers never talk to Binance. The backend keeps **one** upstream WebSocket and fans out via Socket.IO rooms.

## 2. Components

| Component | Side | Responsibility |
|---|---|---|
| `MarketDataProvider` (interface) | BE | `listSymbols()`, `get24hTickers()`, `getKlines(symbol, interval, {limit, endTime})`, `subscribeKlines(symbol, interval)`, `unsubscribeKlines(...)`, events `ticker`, `kline`, `status`. Only place that knows Binance. |
| `BinanceProvider` | BE | REST client + single WS client (combined stream). Reconnect with backoff; resubscribe on reconnect. |
| `MockProvider` | BE | Deterministic data for tests/offline dev; controlled by test endpoints (§8). |
| `PriceBus` | BE | In-process event emitter: `ticker`, `kline`, `status`. Decouples provider from consumers. |
| `TickerStore` | BE | Latest 24h ticker per USDT symbol (memory). Serves `GET /market/tickers`; used for alert "already met" check. |
| `SymbolRegistry` | BE | USDT/TRADING symbols + `tickSize`/precision; refreshed every 6 h. |
| `CandleCacheService` | BE | Serves klines: DB cache for closed candles + provider for the missing/recent ones. |
| `SubscriptionManager` | BE | Ref-counts Socket.IO kline rooms → upstream subscribe/unsubscribe (5 s grace on 0). |
| `RealtimeGateway` | BE | Socket.IO server: handshake auth, room join/leave, emits. |
| `AlertWorker` | BE | In-memory index of ACTIVE alerts; evaluates every ticker; triggers exactly once. |
| `NotificationService` + `NotificationChannel` | BE | Persists notification, then dispatches to all registered channels (now only `InAppChannel`). |
| REST modules | BE | auth, users (profile+settings), market, watchlist, alerts, notifications, health, test-support. |
| SPA | FE | React + Vite; TanStack Query for REST, Socket.IO client for live data, Lightweight Charts v5. |

## 3. Data flows

### 3.1 Market list
1. Startup: provider loads `exchangeInfo` → `SymbolRegistry` (USDT, TRADING, spot); `ticker/24hr` → `TickerStore`; subscribes `!miniTicker@arr` permanently.
2. Browser: `GET /api/v1/market/tickers` (snapshot) → then `tickers:subscribe` → joins room `tickers`.
3. Each `!miniTicker@arr` message (~1/s) → filter to USDT symbols → update `TickerStore` → emit **one batched** `tickers:update` (only changed symbols) to room `tickers` → PriceBus `ticker` events also feed `AlertWorker`.
4. Frontend merges updates into the TanStack Query cache; rows flash on change. List is virtualised (`@tanstack/react-virtual`).

### 3.2 Chart (history + live candle)
1. Browser: `GET /api/v1/market/klines?symbol=BTCUSDT&interval=1h&limit=1000`.
2. `CandleCacheService`:
   - Read closed candles from `candles` table for (symbol, interval) covering the requested window.
   - If the DB already contains the expected window up to the **last closed** candle → fetch only the latest 2 candles (last closed + open) from provider.
   - Otherwise → fetch the full window from provider REST (`/api/v3/klines`, max 1000), **upsert closed candles only**.
   - The open (current) candle is never stored.
3. Browser emits `kline:subscribe {symbol, interval}` → joins room `kline:BTCUSDT:1h` → `SubscriptionManager` ref-count 0→1 → provider `SUBSCRIBE btcusdt@kline_1h`.
4. Upstream kline event → emit `kline:update` to the room; when `isClosed` → also upsert into `candles`.
5. Switching symbol/timeframe: client emits `kline:unsubscribe` for the old pair before subscribing the new one. Room empty for 5 s → upstream `UNSUBSCRIBE`.
6. Frontend: `series.setData()` on load, `series.update()` on each `kline:update`; indicators recomputed for the last candle only (incremental) or fully on load.

### 3.3 Alert → notification
```mermaid
sequenceDiagram
  participant P as Provider (ticker)
  participant W as AlertWorker
  participant D as PostgreSQL
  participant N as NotificationService
  participant G as Gateway (room user:{id})
  P->>W: ticker {symbol, lastPrice}
  W->>W: match ACTIVE alerts for symbol (ABOVE: p ≥ target, BELOW: p ≤ target)
  W->>D: TX: UPDATE alerts SET status=TRIGGERED … WHERE id=? AND status=ACTIVE  (rowcount must be 1)<br/>INSERT notifications (type=ALERT_TRIGGERED, payload)
  W->>W: remove alert from index
  W->>N: dispatch(notification)
  N->>G: InAppChannel → emit notification:new to user:{id}
  Note over G: offline user → nothing emitted; unread row waits in DB
```

### 3.4 Session restore & login
App start → `POST /api/v1/auth/refresh` (cookie) → access token in memory → `GET /api/v1/users/me` (profile + settings) → apply locale/theme/timezone → reconnect socket with token → `GET /notifications` (returns `unreadCount`) → if unread > 0 show summary toast (AC-NOTIF-04).
On every socket `connect` (first connect and every reconnect, including after login/token refresh) a logged-in client invalidates `['notifications']` and `['alerts']`; for unread notifications newer than the newest one already shown in this tab it shows the same toast as `notification:new` and updates the bell (first load in a tab only sets that baseline; the summary toast covers older unread ones).

## 4. Real-time relay design (BinanceProvider)

| Concern | Design |
|---|---|
| Connection | One `ws` connection to `wss://data-stream.binance.vision/stream` (combined streams). Stream names lower-case: `btcusdt@kline_1h`, `!miniTicker@arr`. |
| Subscribe | Live `{"method":"SUBSCRIBE","params":[...],"id":n}` / `UNSUBSCRIBE`. Outgoing messages queued and sent ≤ 4 per second (Binance limit 5/s). Max 1024 streams/connection. |
| Limits | Each socket may hold at most **2** kline subscriptions; a further `kline:subscribe` gets ack error `SUBSCRIPTION_LIMIT_REACHED`. Global cap: at most **200** upstream kline streams; beyond that `kline:subscribe` gets `MARKET_DATA_UNAVAILABLE`. |
| Keep-alive | Respond to server ping frames (the `ws` library does this automatically). Watchdog: if no message for 30 s → force reconnect. |
| Lifetime | Binance closes connections after 24 h → proactively reconnect at 23 h. |
| Reconnect | Exponential backoff 1 s, 2 s, 4 s … max 30 s, ±20 % jitter; reset after 60 s healthy. On open: resubscribe every active stream + `!miniTicker@arr`. |
| Status | Provider emits `status: connected | reconnecting` → gateway emits `market:status` to all clients (AC-RT-06). |
| Gap recovery | After upstream reconnect, re-fetch latest 2 candles via REST for each active kline stream and emit them as `kline:update`. |
| Client side | Socket.IO client auto-reconnect (1 s → max 10 s). On reconnect: re-emit current subscriptions and refetch klines (AC-RT-05). UI banner from socket `disconnect`/`connect` events. The client also listens to window `offline`/`online`: on `offline` it shows the banner and calls `socket.disconnect()`; on `online` it calls `socket.connect()`. Server Socket.IO options: `pingInterval: 10000`, `pingTimeout: 5000`. On every `connect`, a logged-in client re-syncs notifications and alerts as in §3.4. |
| REST limits | Request weight budget well under 6000/min: tickers snapshot only at startup and every 5 min; exchangeInfo every 6 h; klines cached. HTTP 429/418 → back off and return `MARKET_DATA_UNAVAILABLE`. |

## 5. Alert worker design

| Aspect | Design |
|---|---|
| Location | Same Nest process as API (`AlertsModule`), starts on `onApplicationBootstrap`. Single instance assumed (ADR-06). |
| Index | `Map<symbol, Alert[]>` of ACTIVE alerts (small scale: linear scan per tick is fine). |
| Load | On boot (and on test endpoint "reload worker") load all ACTIVE alerts from DB. |
| Sync | `AlertsService.create/delete` updates the index synchronously after the DB write succeeds. |
| Trigger | Condition met → atomic conditional `UPDATE … WHERE status='ACTIVE'` + insert notification in **one transaction**; only if 1 row updated → dispatch. Guarantees one-shot even with bursts of ticks. |
| Concurrency | Per-symbol "in-flight" set so the same alert is not processed twice while its transaction runs. |
| Notification content | Structured, no sentences: `type: "ALERT_TRIGGERED"`, `payload: {alertId, symbol, condition, targetPrice, triggeredPrice}`. Frontend renders translated text. |
| Channels | `NotificationChannel { name; send(userId, notification): Promise<void> }`. `NotificationsModule` injects all channels via a multi-provider token `NOTIFICATION_CHANNELS`. Worker never knows channels. A failing channel is logged and does not roll back the trigger. |

## 6. Auth design

| Item | Design |
|---|---|
| Password | argon2id hash; never serialised (Prisma `select` excludes it; response DTOs whitelist fields). |
| Access token | JWT HS256, 15 min (`JWT_ACCESS_TTL_SECONDS`), claims `sub` (user id, integer), `role`. Stored **in memory only** on the client. Sent as `Authorization: Bearer`. |
| Refresh token | 32 random bytes (base64url), stored as SHA-256 hash in `refresh_tokens`, 7 days. Cookie `refresh_token`: httpOnly, `Secure` in prod, `SameSite=Lax`, `Path=/api/v1/auth`. **Rotated** on every refresh. Grace window: a token rotated less than 10 s ago that is presented again (e.g. two tabs refreshing at once) is not reuse — issue a new refresh + access token for that user without revoking others. After that window, reuse of a revoked token → revoke all tokens of that user. Uses existing `revoked_at` / `replaced_by_id`; no schema change. |
| Client 401 handling | HTTP wrapper: on `UNAUTHENTICATED`/`TOKEN_EXPIRED` → single-flight `POST /auth/refresh` → retry once → else logout. |
| Change password | Revokes all refresh tokens except the current one (AC-PROF-04). |
| Socket auth | Handshake `auth: { token }` (optional). Valid → join `user:{id}`. Guests get public rooms only. After login/logout/refresh the client reconnects the socket with the new token. |
| Rate limit | `@nestjs/throttler` on `POST /auth/login` and `/auth/register`: `LOGIN_RATE_LIMIT_PER_MINUTE` per IP → `RATE_LIMITED`. The throttler keys on `req.ip`; the backend sets Express `trust proxy` to `TRUST_PROXY_HOPS` (0 = `X-Forwarded-For` never trusted; 1 on Railway) so `req.ip` is the real client IP. |

## 7. Folder structure

```text
/                     root package.json (npm workspaces: backend, frontend, e2e), docker-compose.yml, .env.example, .github/workflows/ci.yml, CLAUDE.md, README.md
/backend
  prisma/             schema.prisma · migrations/ · seed.ts
  src/
    main.ts · app.module.ts
    config/           env schema validation (fail fast on missing vars)
    common/           envelope.interceptor · all-exceptions.filter · app-error.ts · error-codes.ts · decimal-to-number serializer · guards/ · decorators/
    prisma/           prisma.module · prisma.service
    modules/
      auth/           controller · service · password.service · refresh-token.service · dto/
      users/          controller (/users/me, settings) · service · dto/
      market/         controller · market.service · symbol-registry · ticker-store · candle-cache.service · subscription-manager · price-bus
        providers/    market-data-provider.interface.ts · binance/ (rest.client, ws.client, binance.provider) · mock/ (mock.provider, fixtures/)
      realtime/       realtime.gateway · realtime.service (emitToUser, emitToRoom)
      watchlist/      controller · service · dto/
      alerts/         controller · service · alert-worker.service · alert-index · dto/
      notifications/  controller · service · channels/ (notification-channel.interface.ts, in-app.channel.ts)
      health/         controller
      test-support/   controller (imported ONLY when ENABLE_TEST_ENDPOINTS=true AND MARKET_DATA_PROVIDER=mock)
  test/               integration/*.int-spec.ts (real Postgres test DB) · helpers/
/frontend
  src/
    app/              App · router · providers · layout/ (Header, Footer, DashboardLayout, MobileTabBar)
    features/
      auth/           LoginPage · RegisterPage · RequireAuth · auth.store · api
      account/        AccountPage (profile, password, preferences)
      market/         MarketList · useTickers · symbols
      chart/          CandleChart · TimeframeBar · ChartLegend · chart-theme
      indicators/     lib/ (sma, rsi, macd — pure functions) · IndicatorMenu · useIndicatorSettings
      watchlist/ · alerts/ · notifications/
    shared/
      api/            http client · envelope & error types · DTO types (mirror API.md)
      socket/         socket client · useSocketEvent · connection status
      i18n/           init · locales/vi.json · locales/en.json
      format/         formatPrice · formatPercent · formatCompact · formatDateTime (Intl, locale + timezone aware)
      theme/          tokens.css · ThemeProvider
      preferences/    guest (localStorage) ↔ account (API) sync
      ui/             Button · Input · Select · Tabs · Toast · Badge · Modal · Spinner · EmptyState
/e2e                  playwright.config.ts · tests/<feature>.spec.ts · fixtures/indicators.golden.json · helpers/ (mock control, login)
/docs                 SPEC · ARCHITECTURE · API · DATABASE · PROGRESS · TRACEABILITY · PROMPTS
```

Layering (BE): controller (HTTP + DTO validation) → service (business rules, throws `AppError(code)`) → Prisma. No Prisma in controllers/gateways. Feature modules talk via exported services or PriceBus events only.

## 8. Test mode & MockProvider

| Item | Design |
|---|---|
| Activation | MockProvider: `MARKET_DATA_PROVIDER=mock`. Test endpoints only when `ENABLE_TEST_ENDPOINTS=true` **and** `MARKET_DATA_PROVIDER=mock` (same rule as API.md §3.8; never in production; app refuses to start if both `NODE_ENV=production` and this flag are true). |
| Symbols | `BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, XRPUSDT, DOGEUSDT, ADAUSDT, LINKUSDT` + non-USDT `ETHBTC`, `BTCUSDC` (must be filtered out). |
| Candles | BTCUSDT 1h = committed fixture of 1000 real candles (`mock/fixtures/BTCUSDT-1h.json`), timestamps shifted so the last one is the current open candle. All others: seeded PRNG per (symbol, interval) → identical on every run. |
| Ticks | Static unless pushed (deterministic). `MOCK_AUTO_TICK=true` enables a random walk for offline manual dev. Heartbeat every 10 s keeps `lastMessageAt` fresh. |
| Control endpoints | `/api/v1/test/*`: reset DB + reseed + reset mock; push tick; close candle; simulate upstream disconnect; stats (upstream subscriptions, provider REST call counts); reload alert worker. Exact contracts in API.md. |
| Golden indicators | `e2e/fixtures/indicators.golden.json` generated once by a script from the BTCUSDT-1h fixture using an independent oracle library (`technicalindicators`, devDependency only), never from app code. |
| E2E run | Playwright `webServer` first runs `prisma migrate deploy` against the test `DATABASE_URL`, then builds frontend, starts backend on port 3100 with `NODE_ENV=test`, mock provider, test DB, `SERVE_FRONTEND=true`. `workers: 1`; each test calls reset first. |

## 9. Testing & CI

| Layer | Tool | Scope |
|---|---|---|
| BE unit | Jest | services, alert matching, candle-cache window logic, error mapping |
| BE integration | Jest + supertest + **real Postgres** (`crypto_alert_test`; the script runs `prisma migrate deploy` on it first) | auth (register/login/refresh rotation/reuse/change password), watchlist, alerts + worker trigger + notification |
| FE unit | Vitest + Testing Library | indicator lib vs oracle, formatters, i18n key parity (vi.json keys = en.json keys) |
| Lint | ESLint + `eslint-plugin-i18next` (`no-literal-string` in JSX) + Prettier | both sides |
| E2E | Playwright (Chromium) | one test per AC ID |
| CI | GitHub Actions on every push/PR: Postgres 16 service → `npm ci` → `prisma migrate deploy` → typecheck → lint → unit → integration → build → Playwright; upload Playwright HTML report as artifact. `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`; caches npm (`actions/setup-node` cache) and Playwright browsers (`~/.cache/ms-playwright`). |

## 10. Deployment

| Item | Choice |
|---|---|
| Host | Railway, region **Singapore** (`asia-southeast1`), Hobby plan. One web service + Railway PostgreSQL in the same region. Binance returns HTTP 451 for US IPs → never deploy to a US region. |
| Topology | Same origin: NestJS serves `/api/v1/*`, `/socket.io/*` and the built SPA (Express static middleware + SPA fallback to `index.html` in `backend/src/configure-app.ts`; `/api` and `/socket.io` excluded). No CORS and simple cookies in prod. Dev: Vite proxies `/api` and `/socket.io` to the backend. |
| Start | Root `npm start` = `cd backend && npx prisma migrate deploy && node dist/main.js` (Railpack runs root `npm run build` then `npm start`). Healthcheck `GET /api/v1/health` and restart policy On Failure ×5 are set in Railway service settings (dashboard). No railway.json/railway.toml: Railway Config as Code is deprecated (cutoff 2026-12-01). |
| Deploy method | Railway CLI `railway up`, run by Claude Code: from the phase branch for the Phase 0 smoke deploy and the Phase 7 pre-release check, from `main` after every merge (Merge Prompt). The owner only creates the account, logs in and picks the Singapore region. |
| Seed | `npm run db:seed -w backend` run once manually after first deploy (idempotent upsert of demo data). |
| Binance check (Phase 0) | `/api/v1/health` reports provider connected + recent `lastMessageAt`; if not → region is wrong. |
| Fallback | Render, Singapore region (free tier sleeps after 15 min idle → worker paused; demo only). |

### 10.1 Environment variables (documented in `.env.example`)

| Var | Example / default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `3000` | e2e uses 3100 |
| `DATABASE_URL` | `postgresql://app:app@localhost:5432/crypto_alert` | test: `…/crypto_alert_test` |
| `JWT_ACCESS_SECRET` | *(32+ random chars)* | required |
| `JWT_ACCESS_TTL_SECONDS` | `900` | e2e: `5` for AC-AUTH-06 |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | |
| `COOKIE_SECURE` | `false` | `true` in prod |
| `MARKET_DATA_PROVIDER` | `binance` | `binance` \| `mock` |
| `BINANCE_REST_BASE_URL` | `https://data-api.binance.vision` | |
| `BINANCE_WS_BASE_URL` | `wss://data-stream.binance.vision` | |
| `MOCK_AUTO_TICK` | `false` | |
| `ENABLE_TEST_ENDPOINTS` | `false` | `true` only in e2e |
| `LOGIN_RATE_LIMIT_PER_MINUTE` | `10` | e2e: `5` |
| `TRUST_PROXY_HOPS` | `0` | Express `trust proxy` hops; `1` on Railway; `0` = never trust `X-Forwarded-For` |
| `SERVE_FRONTEND` | `false` | `true` in prod and e2e |
| `FRONTEND_DIST_PATH` | `../frontend/dist` | |
| `LOG_LEVEL` | `info` | |
| `VITE_API_BASE_URL` (FE) | `/api/v1` | |

## 11. UI guidelines

No Figma. Clean trading-dashboard look *inspired by* Binance/TradingView layouts; **no** copied logos, names or brand colors. Every visual value comes from a token (CSS variable) — no raw hex/px in components (Tailwind v4 `@theme` maps tokens to utilities). A future Figma redesign = change token values + component styles only.

### 11.1 Layout per page

| Page | Desktop (≥ 1024 px) | Mobile (< 1024 px) |
|---|---|---|
| Header (all pages, 56 px) | Logo + app name · (spacer) · market-data status badge · language switcher (VI/EN) · theme toggle · bell · user menu or Login/Register | Same, compact; bell + menu icons only |
| `/trade/:symbol` | 3 columns: **Market list 320 px** (search + virtual list) · **Chart flex** (symbol header with star, price, 24h change → timeframe bar + Indicators button → price pane → RSI pane → MACD pane) · **Right panel 340 px** tabs *Watchlist / Alerts* | Bottom tab bar *Markets / Chart / Watchlist / Alerts* (56 px); one panel at a time; chart fills height |
| `/login`, `/register` | Centered card 400 px | Full-width card, 16 px margin |
| `/account` | Single column 640 px: Profile · Change password · Preferences (language, theme, timezone) | Full width |
| 404 | Centered message + Home button | same |
| Footer (all pages) | Official Vietnamese title (`data-testid="footer-title"`) · translated disclaimer · "Đồ án chuyên ngành — UIT" (`data-testid="footer-course"`); title and course line stay Vietnamese in both languages (12 px, muted) | same, wraps |

### 11.2 Color tokens

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--color-bg` | `#0F1115` | `#F7F8FA` | page background |
| `--color-surface` | `#161A20` | `#FFFFFF` | panels, cards |
| `--color-surface-2` | `#1E232B` | `#F0F2F5` | hover, inputs, selected row |
| `--color-border` | `#2A303A` | `#DDE1E6` | dividers |
| `--color-text` | `#E6E8EB` | `#12161C` | primary text |
| `--color-text-muted` | `#8B93A1` | `#5B6472` | labels, secondary |
| `--color-accent` | `#3B82F6` | `#2563EB` | primary buttons, links, active tab, focus ring, info/success toasts |
| `--color-danger` | `#F97316` | `#C2410C` | errors, destructive buttons (**orange — red is reserved for price down**) |
| `--color-warning` | `#F59E0B` | `#B45309` | "Reconnecting…", "Market data delayed" |
| `--color-up` | `#26A69A` | `#0A7F6F` | price up, bullish candle, MACD hist ≥ 0 |
| `--color-down` | `#EF5350` | `#D32F2F` | price down, bearish candle, MACD hist < 0 |
| `--color-chart-grid` | `#1E232B` | `#EEF0F3` | chart grid |
| `--color-chart-crosshair` | `#5B6472` | `#9AA3AF` | crosshair |
| `--color-ind-1/2/3` | `#F59E0B` / `#A855F7` / `#38BDF8` | `#D97706` / `#9333EA` / `#0284C7` | MA lines 1–3 |
| `--color-ind-rsi` | `#A855F7` | `#9333EA` | RSI line |
| `--color-ind-macd` / `--color-ind-signal` | `#3B82F6` / `#F97316` | `#2563EB` / `#EA580C` | MACD / signal |

Rule: **green/red only for price direction** (text, candles, MACD histogram, flash). Chart reads tokens via `getComputedStyle` and calls `chart.applyOptions()` on theme change. Lightweight Charts `layout.attributionLogo` stays `true`.

### 11.3 Typography, spacing, shape

| Item | Value |
|---|---|
| Font | Inter (self-hosted `@fontsource/inter`), fallback `system-ui, sans-serif`; all numbers `font-variant-numeric: tabular-nums` |
| Sizes | 12 (meta, footer) · 13 (table rows) · 14 (body, inputs) · 16 (section titles) · 20 (price in chart header) · 24 (page titles) |
| Weights | 400 body · 500 labels/buttons · 600 headings, price |
| Spacing scale | 4 · 8 · 12 · 16 · 24 · 32 px (`--space-1…6`) |
| Radius | 4 (inputs, rows) · 6 (buttons) · 8 (cards, panels) |
| Sizes | market row 32 px; button height 32 (sm) / 40 (md); input 40 |
| Motion | price flash: background `--color-up`/`--color-down` at 20 % opacity, fade 600 ms; respect `prefers-reduced-motion` |
| Focus | 2 px `--color-accent` outline, offset 2 px |
| Empty/loading | Skeleton rows for lists, spinner for chart, translated empty states with an action button |

## 12. Decision records

| ID | Decision | Reason | Consequence |
|---|---|---|---|
| ADR-01 | **NestJS** instead of Express (report said Express, "subject to change") | Modules/DI/guards/pipes give Claude Code a fixed structure; built-in Socket.IO gateway, throttler, static file serving | Slightly more boilerplate |
| ADR-02 | **Socket.IO** to browsers; raw `ws` to Binance | Rooms, auto-reconnect, auth handshake out of the box | Browser can't use plain WS clients (fine) |
| ADR-03 | **INTEGER autoincrement IDs**, not BigInt | BigInt serialises as string → FE/BE type mismatch | Max ~2.1 billion rows per table (enough) |
| ADR-04 | Prices as **Decimal in DB, number in JSON** | Exact storage; simple FE types | Global serializer converts `Prisma.Decimal` → `number` |
| ADR-05 | **binance.vision** market-data endpoints, **Singapore** hosting | No API key; Binance blocks US IPs (HTTP 451) | Deployment region is a hard constraint |
| ADR-06 | Single process, **in-process worker**, no Redis/queue | Small scale, simpler deploy | Horizontal scaling later needs Redis adapter + separate worker |
| ADR-07 | **i18n via error codes**; react-i18next; vi default | Backend language-agnostic; adding a locale = add one JSON file | Every UI string needs a key (lint-enforced) |
| ADR-08 | **No Figma first**; design tokens | Time; redesign possible later | Tokens must be respected strictly |
| ADR-09 | **Indicators on the frontend** (pure TS functions) | No server load; instant period changes | 1000-candle window limits MA ≤ 200 |
| ADR-10 | **Same-origin deploy** (backend serves SPA) | One service, no CORS, simple cookies | Frontend redeploys with backend |
| ADR-11 | Access JWT in memory + rotating refresh cookie (hashed in DB) | XSS can't read refresh token; sessions revocable | Session restore needs `/auth/refresh` on app start |
| ADR-12 | **MockProvider + test endpoints** | Deterministic e2e for live-data features | Test endpoints must be impossible to enable in prod |
| ADR-13 | **Git workflow**: public GitHub repo (owner decision: unlimited free CI minutes); `main` always working; one branch `phase-N-<name>` per phase, merged `--no-ff` only after CI green + review PASS, tagged `v0.N` (`v1.0` final); Conventional Commits; no force-push / history rewrite / branch or tag deletion; secrets check before every commit | Solo beginner needs safe, reversible steps and clear restore points | Undo is always `git revert` or a new branch (see ROLLBACK PROMPT) |

## 13. Future extensions (NOT to be built now)

| Extension | Where it plugs in |
|---|---|
| Paper trading | New BE module `trading/` (tables `paper_accounts`, `paper_orders`, `paper_positions`), fills at `TickerStore` price, listens to PriceBus; FE `features/trading/` + new right-panel tab. No change to market/alerts. |
| Backtesting | New BE module `backtest/` reading the `candles` cache; move `features/indicators/lib` into a shared workspace package so BE and FE use the same functions. |
| Stock market provider | New `StockProvider implements MarketDataProvider`; add `market` field to symbol metadata + provider registry keyed by market. Charts/alerts unchanged (they consume the interface). |
| Email / Telegram alerts | New `EmailChannel` / `TelegramChannel implements NotificationChannel`, registered in `NOTIFICATION_CHANNELS`; per-user opt-in columns in `user_settings` via a new migration. Alert worker unchanged. |
| Admin dashboard | `@Roles('admin')` guard using existing `users.role`; routes under `/api/v1/admin/*`; FE route `/admin`. |
| Figma redesign | Replace values in `shared/theme/tokens.css` and restyle `shared/ui/*`; no logic changes. |
| More locales | Add `locales/<code>.json`; key-parity test covers it. |
| Scale-out | Socket.IO Redis adapter; move `AlertWorker` to its own process consuming a Redis stream. |
