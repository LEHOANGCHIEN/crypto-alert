# PROGRESS — Crypto Alert

> Claude Code ticks checklist items as they are completed (one commit each) and appends **one dated log line per session**. The owner reads only the "Status" table and the log.
> Log line format: `- YYYY-MM-DD · <model + effort> · <what was done> · last commit <short-hash> · CI <green/red>`
> On merge add: `- YYYY-MM-DD · MERGED into main · merge <short-hash> · tag v0.N · CI green · deployed`

## Status

| Phase | Name | Branch | Settings | Target dates | State |
|---|---|---|---|---|---|
| 0 | Scaffold, i18n, tokens, DB, CI, e2e, smoke deploy | `phase-0-scaffold` | Sonnet 5.5 + Medium | Nov 24–25 | done |
| 1 | Auth & account | `phase-1-auth` | Sonnet 5.5 + Medium | Nov 26–27 | done |
| 2 | Market list + chart (REST) | `phase-2-market-chart` | Sonnet 5.5 + Medium | Nov 28–29 | done |
| 3 | Real-time relay | `phase-3-realtime` | Opus 5.5 + High | Nov 30–Dec 1 | done |
| 4 | Indicators | `phase-4-indicators` | Opus 5.5 + High | Dec 2 | done |
| 5 | Watchlist | `phase-5-watchlist` | Sonnet 5.5 + Medium | Dec 3 | done |
| 6 | Alerts + notifications | `phase-6-alerts` | Opus 5.5 + High | Dec 4–5 | done |
| 6a | UI redesign | `phase-6a-ui-redesign` | Sonnet 5.5 + Medium | Dec 6 | done |
| 6b | Pages (nav, bottom panel, /alerts, /notifications, /coin) | `phase-6b-pages` | Sonnet 5.5 + Medium | Dec 7 | not started |
| 7 | Hardening, final deploy, demo | `phase-7-release` | Sonnet 5.5 + Medium | Dec 8–9 | not started |
| — | Buffer for slips | — | — | Dec 10–11 | — |

Schedule (all 2026): Phase 0 starts Nov 24; the last phase (7) ends **Dec 9**; buffer until Dec 11 (6a and 6b added by reviews/ui-polish.decision.md).

**Every phase ends with:** CI green → **Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-N-review.decision.md; paste into the builder: Read reviews/phase-N-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.** → if PASS, *Merge Prompt* (Sonnet 5.5 + Medium): merge, tag `v0.N`, redeploy `main` to Railway.
**Usage rule:** near the weekly quota limit (`/usage`) → Sonnet 5.5 + Medium for everything except Phase Review (this includes phases 3, 4, 6 and Stuck Bug sessions); the review stays Opus 5.5 + High.
**Bug rule:** same bug failed 2–3 times → *Stuck Bug Prompt* with **Opus 5.5 + Extra** (near the weekly quota limit → Sonnet 5.5 + Medium).

---

## Phase 0 — Scaffold
**Settings before starting:** Sonnet 5.5 + Medium · Plan mode ON · prompt: *Kickoff Prompt* (first session), then *Phase Start Prompt* with N=0 for later sessions
**ACs:** AC-OPS-01, AC-I18N-01, AC-THEME-01, AC-UI-03, AC-UI-04
**Owner actions needed (Claude Code gives Vietnamese steps):** `gh auth login`; create Railway account (Hobby plan); `railway login`; create a Railway project with PostgreSQL in region Singapore.

- [x] `git init` on `main`; complete `.gitignore` (`node_modules/`, `dist/`, `build/`, `.env`, `.env.*`, `!.env.example`, `coverage/`, `playwright-report/`, `test-results/`, `blob-report/`, `.vite/`, `*.log`, `.DS_Store`)
- [x] First commit = docs only (`CLAUDE.md`, `docs/`, `backend/CONTEXT.md`, `frontend/CONTEXT.md`, `.gitignore`): `docs: initial project documentation`
- [x] Public GitHub repo (`gh repo create crypto-alert --public --source=. --remote=origin --push`); `main` pushed
- [x] Branch `phase-0-scaffold` created and pushed
- [x] Root `package.json` with workspaces + scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `check`, `db:migrate`, `db:seed`, `secrets:check`
- [x] `docker-compose.yml` (Postgres 16; creates `crypto_alert` and `crypto_alert_test`)
- [x] `.env.example` with every var of ARCHITECTURE §10.1; env validation fails fast on missing vars
- [x] `scripts/check-secrets.mjs` (blocks staged `.env*`, private keys, non-local DB URLs with passwords, long random secrets; always allows `.env.example`, `package-lock.json` and `**/fixtures/**`) + pre-commit hook (`simple-git-hooks`)
- [x] Backend skeleton: global prefix `/api/v1`, envelope interceptor, exception filter, `AppError`, all error codes from API.md §1.2, Decimal→number serializer, validation pipe mapping to field codes
- [x] Prisma schema copied verbatim from DATABASE.md §3; `init` migration incl. §3.1 raw SQL; seed per DATABASE.md §6
- [x] `MarketDataProvider` interface; minimal `BinanceProvider` (REST ping + WS `!miniTicker@arr` to track `connected`/`lastMessageAt`); minimal `MockProvider` (heartbeat)
- [x] `GET /api/v1/health` per API.md; `test-support` module with `POST /test/reset` (guarded per API.md §3.8; app refuses to boot with test endpoints in production)
- [x] Serve built frontend from backend (`SERVE_FRONTEND`), SPA fallback
- [x] Frontend skeleton: routes of SPEC §3 (pages may be placeholders), header (language switcher, theme toggle), footer (exact title + disclaimer), 404 page
- [x] Design tokens (ARCHITECTURE §11.2) in `tokens.css` + Tailwind v4 `@theme`; ThemeProvider (dark default, guest choice in localStorage)
- [x] react-i18next with `vi.json`/`en.json` (vi default), `<html lang>` sync; ESLint `i18next/no-literal-string`; Vitest key-parity test; format helpers skeleton
- [x] `e2e/` workspace: Playwright config (`webServer` per ARCHITECTURE §8, Chromium, workers 1), helpers (`resetApp()`), tests for this phase's ACs
- [x] `.github/workflows/ci.yml` per ARCHITECTURE §9 (Postgres service, Playwright report artifact); CI green
- [x] Railway service settings (healthcheck `/api/v1/health`, restart On Failure ×5) + root build/start scripts (no railway.json); smoke deploy with `railway up` from this branch; env vars set in Railway; **health on the deployed URL shows `provider: "binance"`, `connected: true`** (proves Singapore region can reach Binance); deployed URL written in the log
- [x] `README.md`: exact Vietnamese title, what the app does, how to run locally, link to docs
- [x] TRACEABILITY updated; log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-0-review.decision.md; paste into the builder: Read reviews/phase-0-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
- 2026-11-24 · Sonnet 5.5 + Medium · Phase 0 complete: git/GitHub, workspaces, Postgres+Prisma init migration+seed, NestJS skeleton (envelope, errors, health, test reset), Binance/mock providers, React+Tailwind tokens+i18n skeleton, Playwright tests for 5 ACs, CI, README; smoke deploy to Railway Singapore at https://web-production-49fda79f.up.railway.app (health: provider binance, connected true). Deviations: Nest 11 (Nest 12 is ESM-only), SPA served by Express middleware instead of @nestjs/serve-static, root `start` script added for Railpack · last commit 46a034b · CI green
- 2026-11-24 · Sonnet 5.5 + Medium · applied reviews/phase-0-review.decision.md: prisma CLI in runtime deps, railway.json removed (settings now in Railway dashboard + root scripts), footer translated (EN title/course) with close button, PROMPTS review routing, reviews/ committed. Doc changes: SPEC (title rows, course row, AC-I18N-02, AC-UI-03, compliance), ARCHITECTURE §10 + ADR-01, PROMPTS c + table, TRACEABILITY AC-UI-03 · last commit 7b4e3e9 · CI green (run 45234293333); redeployed health OK
- 2026-11-24 · Sonnet 5.5 + Medium · applied 3 Minor doc fixes from reviews/phase-0-recheck.md (PASS): frontend/CONTEXT.md + ARCHITECTURE §11 footer rules (translated title/course, footer-close, localStorage key, testids), PROGRESS Phase 6 AC-I18N-02 no exceptions, PROGRESS review workflow lines; added reviews/phase-0-recheck.md. Docs changed: ARCHITECTURE.md, PROGRESS.md, frontend/CONTEXT.md.
- 2026-11-24 · MERGED into main · merge 12894dc · tag v0.0 · CI green · deployed

---

## Phase 1 — Auth & account
**Settings before starting:** Sonnet 5.5 + Medium · Plan mode ON · *Phase Start Prompt* (N=1)
**ACs:** AC-AUTH-01…10, AC-PROF-01…04, AC-I18N-03, AC-I18N-05, AC-THEME-03

- [x] `PasswordService` (argon2id); `RefreshTokenService` (hash, rotation, reuse detection, revoke-others)
- [x] `POST /auth/register|login|refresh|logout|change-password` exactly per API.md §3.1; cookie flags per API.md §1
- [x] JWT access guard + `@CurrentUser()`; throttler on login/register (`LOGIN_RATE_LIMIT_PER_MINUTE`); test reset clears throttler storage
- [x] `GET/PATCH /users/me`, `PATCH /users/me/settings` (timezone validation)
- [x] Integration tests (real test DB): register, duplicate email, login, refresh rotation, reuse detection, logout, change password revokes others, no hash in responses. Reuse detection covers both cases explicitly: (a) a rotated token presented again within 10 s → new tokens issued, no other tokens revoked; (b) presented after 10 s → all tokens of that user revoked. Never remove the 10 s grace window to make a test pass.
- [x] FE http client: envelope unwrap, `ApiError(code, details)`, single-flight refresh on `TOKEN_EXPIRED`/`UNAUTHENTICATED`, session restore on app start
- [x] FE auth store, `RequireAuth` with return-to, Login & Register pages with client validation (same rules as API.md)
- [x] Account page: profile, change password, preferences (language, theme, timezone select)
- [x] Preferences sync: guest localStorage ↔ account settings (account wins after login)
- [x] Translations for **all** error codes (`errors.*`) and field codes (`validation.*`) in vi + en
- [x] Playwright tests for this phase's ACs; TRACEABILITY; log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-1-review.decision.md; paste into the builder: Read reviews/phase-1-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
- 2026-11-24 · Sonnet 5.5 + Medium · Phase 1 complete: argon2id auth + rotating refresh tokens, users/settings API, throttler, FE http client with single-flight refresh, login/register/account pages, preference sync, vi/en error+validation translations, 18 integration + 17 Playwright-AC tests. Doc changes (owner-approved, resolving SPEC AC-PROF-04 vs DATABASE.md reuse rule): DATABASE.md §refresh_tokens and API.md §3.1 (+ ARCHITECTURE §6 for consistency) now say reuse detection revokes all tokens ONLY for a rotated token presented after the 10 s window; logout/change-password-revoked tokens → REFRESH_TOKEN_INVALID only. Deps: @nestjs/jwt pinned 11.0.2 (12 is ESM-only) · last commit 71a4ca2 · CI green (run 45250344267)
- 2026-11-24 · Sonnet 5.5 + Medium · Local-dev fix (found in manual testing): backend scripts start:dev, db:migrate, db:seed switched from dotenvx syntax `dotenv run -f` to dotenv-cli `dotenv -e ../.env --` (no other occurrences in repo); verified db:migrate, db:seed ("seed OK: demo@example.com"), dev server + /api/v1/health db up · commit 9afda24 · CI run 45388656060 green · no doc contract changes
- 2026-11-24 · Sonnet 5.5 + Medium · Applied reviews/phase-1-review.decision.md (items 1–7): timezone validation via Intl.DateTimeFormat (accepts Asia/Ho_Chi_Minh, UTC) + account select options + unit/integration tests; AC-AUTH-03 and AC-AUTH-07 tests strengthened; auth store/error texts moved to shared/. Doc change: API.md §1.3 INVALID_TIMEZONE row (authorized). Railway vars set on web: COOKIE_SECURE, TRUST_PROXY_HOPS (names only); live /health OK. Last code commit dc836fa; branch head 02f8a20; CI green (run 45382300129).
- 2026-11-24 · MERGED into main · merge 48427f0 · tag v0.1 · CI green · deployed

---

## Phase 2 — Market list + chart (REST only)
**Settings before starting:** Sonnet 5.5 + Medium · Plan mode ON · *Phase Start Prompt* (N=2)
**ACs:** AC-MKT-01, 02, 04, 05, 06 · AC-CHART-01…06 · AC-PROF-05 · AC-I18N-04 · AC-THEME-02 · AC-UI-01, AC-UI-02

- [x] `SymbolRegistry` (exchangeInfo, USDT + TRADING + spot, tickSize → pricePrecision, 6 h refresh)
- [x] `TickerStore` snapshot via REST (startup + every 5 min); `GET /market/symbols`, `GET /market/tickers`
- [x] `CandleCacheService` per ARCHITECTURE §3.2; `GET /market/klines`; unit tests for window/gap logic
- [x] `MockProvider` full data: symbols of ARCHITECTURE §8, BTCUSDT-1h fixture (1000 real candles fetched once by a script from data-api.binance.vision and committed), seeded PRNG for others; `GET /test/market/stats` (REST call counters)
- [x] Dashboard layout: 3 columns desktop, bottom tabs mobile (right panel may show login prompt/placeholder)
- [x] Market list: virtualised, search, columns & colors per SPEC, row select → `/trade/:symbol?tf=`
- [x] Chart: Lightweight Charts v5 candlesticks, attribution logo on, timeframe bar synced with URL, legend on hover, "pair not found" state
- [x] Locale + timezone aware formatting (prices with pair precision, compact volume, dates); chart time labels in user timezone
- [x] Chart theme from tokens, re-applied on theme toggle
- [x] Playwright tests for this phase's ACs; TRACEABILITY; log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-2-review.decision.md; paste into the builder: Read reviews/phase-2-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
- 2026-11-24 · Sonnet 5.5 + Medium · Phase 2 complete: SymbolRegistry + Binance REST client, TickerStore, CandleCacheService (DB window cache, 2-candle fast path) with GET /market/symbols|tickers|klines, full MockProvider (8 USDT + 2 filtered pairs, BTCUSDT-1h fixture of 1000 real candles via scripts/fetch-btc-fixture.mjs, seeded PRNG, REST counters, GET /test/market/stats), dashboard (3 columns / mobile tab bar), virtualised market list with search, Lightweight Charts v5 candlestick chart (attribution on, timeframe bar synced with ?tf=, legend, pair-not-found), locale/timezone-aware formatting, chart theme re-applied from tokens; 16 Phase-2 AC Playwright tests + backend unit/integration tests; checked live against Binance locally (symbols, tickers, klines 1000, health ok). Existing tests scoped to the header Login link (the side panel now also has one). No doc contract changes (API.md/DATABASE.md/ARCHITECTURE.md/SPEC.md untouched). Deps: lightweight-charts 5.3, @tanstack/react-virtual · last code commit 8f7b41e · CI green (run 45402260421)
- 2026-11-24 · Sonnet 5.5 + Medium · Phase 2 review fixes: 0.1 row select always navigates to ?tf=<current tf> (AC-MKT-05 test extended), 0.2 chart-root data-timezone asserted in AC-CHART-06 and AC-PROF-05, 0.3 data-chart-text asserted in AC-THEME-02, 0.4 klines throttle added to Phase 7 checklist. No doc contract changes.
- 2026-11-24 · MERGED into main · merge 9fdc879 · tag v0.2 · CI green · deployed

---

## Phase 3 — Real-time relay
**Settings before starting:** Opus 5.5 + High · Plan mode ON · *Phase Start Prompt* (N=3) · near the weekly quota limit → Sonnet 5.5 + Medium
**ACs:** AC-MKT-03 · AC-RT-01…06

- [x] `PriceBus`; BinanceProvider WS per ARCHITECTURE §4 (combined stream, subscribe queue ≤ 4 msg/s, backoff + jitter, 30 s watchdog, 23 h reconnect, resubscribe, gap recovery)
- [x] Unit tests: backoff schedule, subscribe queue, resubscribe after reconnect (fake WS server)
- [x] `SubscriptionManager` ref-count with 5 s grace; unit tests
- [x] Subscription caps (≤ 2 kline subscriptions per socket → `SUBSCRIPTION_LIMIT_REACHED`; ≤ 200 upstream kline streams → `MARKET_DATA_UNAVAILABLE`) with unit tests for both caps
- [x] `RealtimeGateway`: handshake auth per API.md §4.1, rooms, events of API.md §4.2–4.3, acks in envelope format
- [x] `tickers:update` batching (changed only, ≤ 1/s); `kline:update`; closed candles upserted to cache; `market:status`
- [x] Mock test endpoints: `tick`, `close-candle`, `disconnect`; stats show `upstreamStreams`
- [x] FE socket client: reconnect with new token, resubscribe on reconnect, klines refetch, "Reconnecting…" banner, "Market data delayed" badge
- [x] FE live updates: market list rows + flash, chart `series.update()`, header price
- [x] Playwright tests for this phase's ACs; TRACEABILITY; log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-3-review.decision.md; paste into the builder: Read reviews/phase-3-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
- 2026-11-25 · Opus 5.5 + High · Phase 3 complete: BinanceProvider WS relay (combined stream, ≤ 4 msg/s subscribe queue, backoff 1→30 s ±20 % jitter reset after 60 s, 30 s watchdog, 23 h reconnect, resubscribe, gap recovery; checked live against Binance), PriceBus → TickerStore live + closed-candle upsert, SubscriptionManager (ref-count, 5 s grace, caps 2/socket + 200 upstream), Socket.IO RealtimeGateway (handshake auth, rooms, envelope acks, ping 10 s/5 s), batched tickers:update (≤ 1/s, changed only), kline:update, market:status; stateful MockProvider + POST /test/market/tick|close-candle|disconnect, real upstreamStreams; /test/reset now also disconnects sockets and clears subscriptions; FE socket client (token reconnect, resubscribe, klines/tickers refetch after reconnect, offline/online), Reconnecting… banner, Market data delayed badge, live market rows with flash, chart series.update(); 7 Playwright ACs + unit (backoff, send queue, fake-WS reconnect, ref-count, caps, batcher, mock) + realtime/test-endpoint integration tests. Deps: @nestjs/websockets + @nestjs/platform-socket.io 11.2.11, socket.io + socket.io-client 4.8.4. Doc change: API.md §3.8 `POST /test/reset` Effect row now lists the socket reset (see review fix line below); DATABASE.md/ARCHITECTURE.md/SPEC.md untouched · last code commit b0a80bc · CI green (run 45443985412)
- 2026-11-25 · Sonnet 5.5 + Medium · Phase 3 review fixes (reviews/phase-3-review.decision.md): 0.1 API.md `POST /test/reset` Effect documents socket/subscription/tickers reset; 0.2 FE socket reconnects after `io server disconnect` (+ unit test) and realtime.service comment fixed; 0.3 upstream WS `handshakeTimeout` = watchdog (hung handshake retried; unit test); 0.4 unit tests for backoff growth 1→2→4 s and healthy reset · review + decision files added
- 2026-11-25 · MERGED into main · merge 9c4452c · tag v0.3 · CI green · deployed (Railway deployment f57aa586; live /api/v1/health: db up, provider binance, connected true; live Socket.IO checked: tickers:subscribe acked, 3 tickers:update received in ~2.7 s)

---

## Phase 4 — Indicators
**Settings before starting:** Opus 5.5 + High · Plan mode ON · *Phase Start Prompt* (N=4) · near the weekly quota limit → Sonnet 5.5 + Medium
**ACs:** AC-IND-01…07

- [x] Pure functions `sma`, `rsi`, `macd` exactly per SPEC §4.1 (+ incremental update for the last candle)
- [x] Vitest: hand-computed small cases + comparison with oracle `technicalindicators` (devDependency) within 0.01 % after 250-candle warm-up
- [x] Script generating `e2e/fixtures/indicators.golden.json` from the BTCUSDT-1h fixture using the oracle only; committed
- [x] MA lines on price pane (3 configurable, defaults 7/25/99); RSI pane with 70/30; MACD pane (line, signal, histogram colors)
- [x] Indicators menu: toggles, period inputs (2–200) with translated validation; settings in localStorage
- [x] Legend values for hovered/latest candle; live recompute on `kline:update`
- [x] Playwright tests for this phase's ACs; TRACEABILITY; log line
- [x] Owner manual check: compare BTCUSDT 1h values with TradingView (listed in "Cách kiểm tra thủ công") (owner-confirmed 2026-11-25)

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-4-review.decision.md; paste into the builder: Read reviews/phase-4-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
- 2026-11-25 · Opus 5.5 + High · Phase 4 built: pure `sma`/`ema`/`rsi`/`macd` (SPEC §4.1, Wilder RSI, SMA-seeded EMA) + incremental last-candle update; Vitest hand-computed cases, incremental == full recompute, and oracle `technicalindicators` 3.1.0 (devDep frontend + e2e) within 0.01 % after 250 warm-up (oracle RSI rounds to 2 decimals, so the oracle value is rebuilt from its unrounded AverageGain/AverageLoss); `e2e/scripts/generate-indicators-golden.mjs` (`npm run golden -w e2e`) → `e2e/fixtures/indicators.golden.json` (BTCUSDT-1h fixture, index 998); MA×3 on price pane (7/25/99, token colors), RSI pane with dashed 70/30, MACD pane (line, signal, histogram up/down), pane separators themed; Indicators menu (toggles, periods 2–200 with translated error, localStorage `crypto-alert.indicators`); legend values for hovered/latest candle, live recompute on `kline:update`; 7 Playwright ACs (AC-IND-01…07). Item 8 (owner TradingView check) left for the owner. Commit 3ee1a97 holds only the AC-IND-06/07 tests (hover legend + live recompute code shipped in 8569804). No doc contract changes (SPEC/API/DATABASE/ARCHITECTURE untouched) · last code commit 3ee1a97 · CI green (run 45467268251)
- 2026-11-25 · Sonnet 5.5 + Medium · Phase 4 review PASS (2 Minor) → decision applied: AC-IND-05 now also asserts both MACD histogram colours via new `data-hist-up-color` / `data-hist-down-color` on chart root (indicator-layers.ts `publish`); item 8 ticked (owner-confirmed); review + decision files added; Minor #2 (`feat:` commit holding only tests) accepted, no history rewrite · no doc contract changes · also fixed flaky `binance-ws.client.spec.ts` reconnect test (waits for resubscribe) · CI green
- 2026-11-25 · MERGED into main · merge 263f7b2 · tag v0.4 · CI green · deployed

---

## Phase 5 — Watchlist
**Settings before starting:** Sonnet 5.5 + Medium · Plan mode ON · *Phase Start Prompt* (N=5)
**ACs:** AC-WL-01…07

- [x] `GET /watchlist`, `PUT|DELETE /watchlist/:symbol` per API.md §3.4 (idempotent, limit 50, symbol check)
- [x] Integration tests (limit, idempotency, isolation between users)
- [x] Star buttons (market row + chart header), Watchlist panel with live prices, remove, click → chart
- [x] Guest prompt; optimistic updates with rollback on error
- [x] Playwright tests for this phase's ACs; TRACEABILITY; log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-5-review.decision.md; paste into the builder: Read reviews/phase-5-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
- 2026-11-25 · Sonnet 5.5 + Medium · Phase 5 built: `GET /watchlist`, `PUT|DELETE /watchlist/:symbol` (idempotent, limit 50, symbol check via SymbolRegistry), 7 integration tests, FE star buttons (market row `star-<SYMBOL>`, chart header `chart-star-<SYMBOL>` so ids stay unique), live Watchlist panel (price + change % from the tickers cache), optimistic add/remove with rollback + translated toast, guest login prompt, cache cleared on user change; 7 Playwright ACs (AC-WL-01…07). AC-WL-07 limit case inserts filler rows into the test DB (`e2e/helpers/watchlist.ts`, devDependency `@prisma/client` in e2e) because the mock has only 8 pairs. No doc contract changes (SPEC/API/DATABASE/ARCHITECTURE untouched) · last code commit cd95b35 · CI green (run 45479961868)
- 2026-11-25 · Sonnet 5.5 + Medium · Phase 5 review fixes (verdict PASS, 8 Minor; reviews/phase-5-review.decision.md): 0.1 `PriceCell` moved to `shared/ui`; 0.2 Vitest for optimistic rollback (PUT and DELETE failing, cache restored before any refetch); 0.3 Vitest for `WatchlistSession` cache reset on user change/logout; 0.4 AC-WL-07 duplicate step now uses XRPUSDT (not in the demo seed) and the limit step uses DOGEUSDT, all assertions kept; 0.5 `fillWatchlist` refuses non-`_test` databases; 0.6 `frontend/CONTEXT.md` testid list updated (the only doc changed). Review #4 (count-then-create race) and #8 (two items in one commit) accepted with no change.
- 2026-11-25 · MERGED into main · merge 96cfe59 · tag v0.5 · CI green · deployed

---

## Phase 6 — Alerts + notifications
**Settings before starting:** Opus 5.5 + High · Plan mode ON · *Phase Start Prompt* (N=6) · near the weekly quota limit → Sonnet 5.5 + Medium
**ACs:** AC-ALERT-01…10 · AC-NOTIF-01…05

- [x] Alerts API per API.md §3.5 (check order, limit 20, already-met check from `TickerStore`)
- [x] `AlertWorker` per ARCHITECTURE §5 (index, boot load, sync on create/delete, atomic one-shot trigger in a transaction, in-flight guard)
- [x] `NotificationChannel` interface + `NOTIFICATION_CHANNELS` token + `InAppChannel`; `NotificationService`
- [x] Notifications API per API.md §3.6; `notification:new` and `notification:read` socket events
- [x] `POST /test/worker/reload`
- [x] Integration tests (real test DB): trigger ABOVE/BELOW, one-shot under burst of ticks, delete prevents trigger, isolation, reload rebuilds index
- [x] FE Alerts tab: form (prefill symbol + current price), Active/Triggered lists, delete, translated errors
- [x] FE toasts on `notification:new`, bell badge (`9+`), notifications panel, mark read / all, cross-tab sync, unread summary toast after login
- [x] Playwright tests for this phase's ACs; TRACEABILITY; log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-6-review.decision.md; paste into the builder: Read reviews/phase-6-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
- 2026-11-25 · Opus 5.5 + High · Phase 6 built: alerts REST API (GET/POST/DELETE, check order validation → symbol → limit 20 → price → already met, `PriceField` with TOO_MANY_DECIMALS), AlertWorker (in-memory index, boot load, sync on create/delete, one-shot conditional UPDATE + notification INSERT in one transaction, in-flight guard), NotificationChannel + NOTIFICATION_CHANNELS + InAppChannel + NotificationsService, notifications API (list/read/read-all) with `notification:new` / `notification:read`, POST /test/worker/reload (and /test/reset now reloads the worker, as API.md §3.8 already said); 25 new integration tests (alerts, worker trigger incl. 20-tick burst and concurrent transactions, notifications + socket isolation); FE Alerts tab (prefilled form, client validation, Active/Triggered lists, delete), header bell (badge 9+), notifications panel, toasts, cross-tab read sync, unread summary toast after login/app start, missed-notification re-sync on socket connect; 15 Playwright ACs (AC-ALERT-01…10, AC-NOTIF-01…05) + AC-UI-01 extended with the logged-in header bell (reviews/phase-2-ui-01-bell.decision.md). Existing toast assertions in account/auth/watchlist specs now exclude notification toasts (`data-kind="notification"`; same texts and counts). Doc changes: API.md §3.5 `targetPrice` OUT_OF_RANGE also > 1e15 (DECIMAL(24,8) limit); API.md §3.6 `notification:read` goes to room `user:{id}` (matches the §4.3 table); frontend/CONTEXT.md testid list; TRACEABILITY. SPEC/DATABASE/ARCHITECTURE untouched · npm run check green (unit 107 BE + 98 FE, integration 90, Playwright 74) · smoke run OK (health db up, provider binance) · last code commit abc9673 · CI green (run 45638142138)
- 2026-11-25 · Sonnet 5.5 + Medium · Phase 6 review PASS (reviews/phase-6-review.md) + decision applied (reviews/phase-6-review.decision.md): frontend/CONTEXT.md Testing hooks now lists all Phase 6 testids (alert-row-*, alert-*-at/price, alerts-loading/error, notification-* fields, side-content-<tab>). Docs changed: frontend/CONTEXT.md, PROGRESS.md; added review + decision files.
- 2026-11-26 · MERGED into main · merge 0c3f837 · tag v0.6 (on a529f8d) · CI green (CI on the merge commit was red, run 45652317813: AC-ALERT-08 saw the first 401 before the silent token refresh; fixed forward in a529f8d `test(e2e): wait for the final response after silent token refresh`, test-only, CI green run 45656271040) · deployed (live: health ok/binance/connected, /alerts and /notifications 401 UNAUTHENTICATED, POST /test/reset 404)

---

## Phase 6a — UI redesign
**Settings before starting:** Sonnet 5.5 + Medium · Plan mode ON · owner request `reviews/ui-polish.decision.md` (Phase 6a PHASE START prompt)
**ACs:** AC-MKT-01 (edited), AC-MKT-07, AC-UI-01 (edited), AC-UI-05…08, AC-CHART-07…10

- [x] Doc edits of reviews/ui-polish.decision.md §3 (SPEC, ARCHITECTURE §11/§12, PROGRESS 6a/6b, TRACEABILITY pending rows, CONTEXT) + commit the decision and `docs/design/`
- [x] Tokens + fonts (§4), restyle of every existing screen to the mockup density
- [x] Resizable + collapsible side columns (AC-UI-01, AC-UI-05, AC-UI-06)
- [x] Market pulse bar + status bar (AC-UI-07, AC-UI-08)
- [x] Two-line market rows + All/Watchlist tabs (AC-MKT-01, AC-MKT-07)
- [x] Chart header stats + coin names (AC-CHART-09)
- [x] Chart types + volume overlay (AC-CHART-07, AC-CHART-08)
- [x] Screenshot + maximize (AC-CHART-10)
- [x] Playwright for this phase's ACs, full regression, TRACEABILITY, CONTEXT testids, log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-6a-review.decision.md; paste into the builder: Read reviews/phase-6a-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
- 2026-11-26 · Sonnet 5.5 + Medium · Phase 6a built: §3 doc edits (SPEC §1 + A10 + routes + 17 new ACs incl. F13, ARCHITECTURE §11/§12, PROGRESS 6a/6b + Phase 7 dates, TRACEABILITY 93 ACs, CONTEXT testids); new tokens + Inter/Roboto Mono (@fontsource/roboto-mono) and denser restyle; resizable/collapsible side columns (`crypto-alert.layout`, separators with keyboard + double-click, rails ≤ 24 px); market pulse bar + status bar; two-line market rows + All/Watchlist tabs; chart header stats + 18 coin names; chart types (candles/bars/line/area, `crypto-alert.chart-type`) + volume overlay (indicator setting `volume`); screenshot (`takeScreenshot` PNG) + CSS maximize. Tests: 9 new AC tests (AC-MKT-07, AC-UI-05…08, AC-CHART-07…10) + AC-CHART-09 + rewritten AC-MKT-01/AC-UI-01; theme/market tests updated to the new token values and `bg-*-soft` flash classes (same strictness). `npm run check` green (BE 107 + FE 106 unit, 90 integration, 83 Playwright); smoke run OK (migrate, seed, dev, health db up/binance connected). Doc changes: SPEC.md (decision §3.1 only), ARCHITECTURE §11/§12 (+ tokens accent-soft/-clear, up/down-volume; `--color-text-faint` dark = #7D8997 instead of the mockup's #697685 because that fails the 4.5:1 contrast rule of SPEC §6), PROGRESS, TRACEABILITY, frontend/CONTEXT.md; API.md/DATABASE.md untouched. Note: the mock tick does not change candle volume, so AC-CHART-08 proves live updates with a tick (bar color) + close-candle (new bar, volume 0) · last code commit d387857; flaky AC-NOTIF-03 (mark-all badge, 5 s e2e token) fixed in 01f8591 by waiting for the final non-401 `read-all` response (test-only, no assertion weakened) ; second flake class (mock tick pushed before the tickers/kline subscription was acknowledged) fixed in f2a185a by waiting for `data-live` in AC-CHART-07/09 and AC-UI-07/08 · CI green (run 45692278705 on f2a185a)
- 2026-11-26 · Sonnet 5.5 + Medium · Phase 6a review decision applied (reviews/phase-6a-review.decision.md): text-bg on accent buttons (Header, MarketList); pulse bar fits 6 items at 1024 px + AC-UI-07 1024×768 step; AC-CHART-09 asserts chart-change value + TRACEABILITY note; panel-expand ids in frontend/CONTEXT.md; review + decision committed.
- 2026-11-26 · MERGED into main · merge dd62571 · tag v0.6.1 · CI green · deployed (live health ok, provider binance, connected true; GET / 200 HTML; POST /api/v1/test/reset 404)

---

## Phase 6b — Pages
**Settings before starting:** Sonnet 5.5 + Medium · Plan mode ON · starts only after 6a is merged and tagged `v0.6.1`
**ACs:** AC-UI-09, AC-UI-10, AC-ALERT-11, AC-ALERT-12, AC-NOTIF-06, AC-COIN-01…04

- [x] Header navigation + last-symbol memory (AC-UI-09)
- [x] Bottom panel under the chart (AC-ALERT-11)
- [ ] `/alerts` page (AC-ALERT-12)
- [ ] `/notifications` page + "View all" in the bell panel (AC-NOTIF-06)
- [ ] Coin overview page: header, range chart, performance tiles, key stats (AC-COIN-01…04)
- [ ] Auth pages redesign (AC-UI-10)
- [ ] Playwright for this phase's ACs, full regression, TRACEABILITY, CONTEXT testids, log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-6b-review.decision.md; paste into the builder: Read reviews/phase-6b-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
- 2026-11-27 · Sonnet 5.5 + Medium · Phase 6b session 1 (items 0–2 of 7; phase NOT finished): §3 doc edits (SPEC only AC-UI-10, ARCHITECTURE §11.1, PROGRESS, TRACEABILITY 94 ACs, CONTEXT testids) + decision and docs/design PDFs committed; header navigation + last-symbol memory (AC-UI-09; placeholder /alerts and /notifications pages until items 3/4; guest header app name hidden below 640 px so the header fits 390 px); bottom panel under the chart (AC-ALERT-11; `bottom` in `crypto-alert.layout`, right-panel Alerts tab keeps its lists and gains the n/20 hint because AC-ALERT-01…06 assert them there). AC-NOTIF-03 test: added a wait for `data-live` after login before the tick (socket is recreated with the new token; no assertion weakened). Doc changes: SPEC.md (AC-UI-10), ARCHITECTURE.md §11.1, PROGRESS.md, TRACEABILITY.md, frontend/CONTEXT.md; API.md/DATABASE.md untouched · full Playwright run 85/85 after the AC-NOTIF-03 wait · last commit ac8572f · CI not yet checked

Merge of each package = docs/PROMPTS.md section e with N=6a / 6b, tag `v0.6.1` / `v0.6.2` (instead of `v0.N`), deploy as usual (`railway up` run by the owner).

---

## Phase 7 — Hardening, final deploy, demo account
**Settings before starting:** Sonnet 5.5 + Medium · Plan mode ON · *Phase Start Prompt* (N=7)
**ACs:** AC-I18N-02, AC-OPS-02 (+ full regression of all ACs)

- [ ] i18n sweep: every page/state in both languages; AC-I18N-02 test (no Vietnamese diacritics in EN, no exceptions; no raw keys)
- [ ] UX states: loading skeletons, empty states, error boundary, toasts; mobile pass at 390 px
- [ ] Security pass: `helmet`, cookie flags in prod, test endpoints impossible in prod, no secrets in repo (`secrets:check` on whole tree), dependency audit (`npm audit --omit=dev`, fix high/critical)
- [ ] Accessibility pass: focus ring, contrast of tokens, `+`/`−` signs on changes
- [ ] All ACs passing (94) in TRACEABILITY; CI green
- [ ] Production deploy from this branch (`railway up`; start command runs `prisma migrate deploy`), seed demo account on production, smoke-check each feature on the live URL (the Merge Prompt redeploys from `main` afterwards)
- [ ] README final: title, features, screenshots, live URL, demo account, how to run, architecture summary
- [ ] Screenshots for the report in `docs/screenshots/` (dashboard dark/light, chart with indicators, alerts, notifications, mobile, EN)
- [ ] Throttle GET /market/klines per client IP (@nestjs/throttler, RATE_LIMITED + Retry-After; update API.md §3.3 errors and ARCHITECTURE security row) — from reviews/phase-2-review.decision.md R4
- [ ] TRACEABILITY; log line (the Merge Prompt tags `v0.7` **and** `v1.0`)

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-7-review.decision.md; paste into the builder: Read reviews/phase-7-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
