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
| 3 | Real-time relay | `phase-3-realtime` | Opus 5.5 + High | Nov 30–Dec 1 | not started |
| 4 | Indicators | `phase-4-indicators` | Opus 5.5 + High | Dec 2 | not started |
| 5 | Watchlist | `phase-5-watchlist` | Sonnet 5.5 + Medium | Dec 3 | not started |
| 6 | Alerts + notifications | `phase-6-alerts` | Opus 5.5 + High | Dec 4–5 | not started |
| 7 | Hardening, final deploy, demo | `phase-7-release` | Sonnet 5.5 + Medium | Dec 6–7 | not started |
| — | Buffer for slips | — | — | Dec 8–10 | — |

Schedule (all 2026): Phase 0 starts Nov 24; the last phase (7) ends **Dec 7**; buffer until Dec 10.

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
- [ ] `SubscriptionManager` ref-count with 5 s grace; unit tests
- [ ] Subscription caps (≤ 2 kline subscriptions per socket → `SUBSCRIPTION_LIMIT_REACHED`; ≤ 200 upstream kline streams → `MARKET_DATA_UNAVAILABLE`) with unit tests for both caps
- [ ] `RealtimeGateway`: handshake auth per API.md §4.1, rooms, events of API.md §4.2–4.3, acks in envelope format
- [ ] `tickers:update` batching (changed only, ≤ 1/s); `kline:update`; closed candles upserted to cache; `market:status`
- [ ] Mock test endpoints: `tick`, `close-candle`, `disconnect`; stats show `upstreamStreams`
- [ ] FE socket client: reconnect with new token, resubscribe on reconnect, klines refetch, "Reconnecting…" banner, "Market data delayed" badge
- [ ] FE live updates: market list rows + flash, chart `series.update()`, header price
- [ ] Playwright tests for this phase's ACs; TRACEABILITY; log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-3-review.decision.md; paste into the builder: Read reviews/phase-3-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**

---

## Phase 4 — Indicators
**Settings before starting:** Opus 5.5 + High · Plan mode ON · *Phase Start Prompt* (N=4) · near the weekly quota limit → Sonnet 5.5 + Medium
**ACs:** AC-IND-01…07

- [ ] Pure functions `sma`, `rsi`, `macd` exactly per SPEC §4.1 (+ incremental update for the last candle)
- [ ] Vitest: hand-computed small cases + comparison with oracle `technicalindicators` (devDependency) within 0.01 % after 250-candle warm-up
- [ ] Script generating `e2e/fixtures/indicators.golden.json` from the BTCUSDT-1h fixture using the oracle only; committed
- [ ] MA lines on price pane (3 configurable, defaults 7/25/99); RSI pane with 70/30; MACD pane (line, signal, histogram colors)
- [ ] Indicators menu: toggles, period inputs (2–200) with translated validation; settings in localStorage
- [ ] Legend values for hovered/latest candle; live recompute on `kline:update`
- [ ] Playwright tests for this phase's ACs; TRACEABILITY; log line
- [ ] Owner manual check: compare BTCUSDT 1h values with TradingView (listed in "Cách kiểm tra thủ công")

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-4-review.decision.md; paste into the builder: Read reviews/phase-4-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**

---

## Phase 5 — Watchlist
**Settings before starting:** Sonnet 5.5 + Medium · Plan mode ON · *Phase Start Prompt* (N=5)
**ACs:** AC-WL-01…07

- [ ] `GET /watchlist`, `PUT|DELETE /watchlist/:symbol` per API.md §3.4 (idempotent, limit 50, symbol check)
- [ ] Integration tests (limit, idempotency, isolation between users)
- [ ] Star buttons (market row + chart header), Watchlist panel with live prices, remove, click → chart
- [ ] Guest prompt; optimistic updates with rollback on error
- [ ] Playwright tests for this phase's ACs; TRACEABILITY; log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-5-review.decision.md; paste into the builder: Read reviews/phase-5-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**

---

## Phase 6 — Alerts + notifications
**Settings before starting:** Opus 5.5 + High · Plan mode ON · *Phase Start Prompt* (N=6) · near the weekly quota limit → Sonnet 5.5 + Medium
**ACs:** AC-ALERT-01…10 · AC-NOTIF-01…05

- [ ] Alerts API per API.md §3.5 (check order, limit 20, already-met check from `TickerStore`)
- [ ] `AlertWorker` per ARCHITECTURE §5 (index, boot load, sync on create/delete, atomic one-shot trigger in a transaction, in-flight guard)
- [ ] `NotificationChannel` interface + `NOTIFICATION_CHANNELS` token + `InAppChannel`; `NotificationService`
- [ ] Notifications API per API.md §3.6; `notification:new` and `notification:read` socket events
- [ ] `POST /test/worker/reload`
- [ ] Integration tests (real test DB): trigger ABOVE/BELOW, one-shot under burst of ticks, delete prevents trigger, isolation, reload rebuilds index
- [ ] FE Alerts tab: form (prefill symbol + current price), Active/Triggered lists, delete, translated errors
- [ ] FE toasts on `notification:new`, bell badge (`9+`), notifications panel, mark read / all, cross-tab sync, unread summary toast after login
- [ ] Playwright tests for this phase's ACs; TRACEABILITY; log line

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-6-review.decision.md; paste into the builder: Read reviews/phase-6-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**

---

## Phase 7 — Hardening, final deploy, demo account
**Settings before starting:** Sonnet 5.5 + Medium · Plan mode ON · *Phase Start Prompt* (N=7)
**ACs:** AC-I18N-02, AC-OPS-02 (+ full regression of all ACs)

- [ ] i18n sweep: every page/state in both languages; AC-I18N-02 test (no Vietnamese diacritics in EN, no exceptions; no raw keys)
- [ ] UX states: loading skeletons, empty states, error boundary, toasts; mobile pass at 390 px
- [ ] Security pass: `helmet`, cookie flags in prod, test endpoints impossible in prod, no secrets in repo (`secrets:check` on whole tree), dependency audit (`npm audit --omit=dev`, fix high/critical)
- [ ] Accessibility pass: focus ring, contrast of tokens, `+`/`−` signs on changes
- [ ] All 76 ACs passing in TRACEABILITY; CI green
- [ ] Production deploy from this branch (`railway up`; start command runs `prisma migrate deploy`), seed demo account on production, smoke-check each feature on the live URL (the Merge Prompt redeploys from `main` afterwards)
- [ ] README final: title, features, screenshots, live URL, demo account, how to run, architecture summary
- [ ] Screenshots for the report in `docs/screenshots/` (dashboard dark/light, chart with indicators, alerts, notifications, mobile, EN)
- [ ] Throttle GET /market/klines per client IP (@nestjs/throttler, RATE_LIMITED + Retry-After; update API.md §3.3 errors and ARCHITECTURE security row) — from reviews/phase-2-review.decision.md R4
- [ ] TRACEABILITY; log line (the Merge Prompt tags `v0.7` **and** `v1.0`)

**Review settings:** Review: docs/PROMPTS.md section c, pasted into the Claude Code project 'Đồ án chuyên ngành - Review' (Opus 5.5 + High, ask before edits). If FAIL → the coordinator writes reviews/phase-7-review.decision.md; paste into the builder: Read reviews/phase-7-review.decision.md and apply the Fix instructions block exactly. Then run the decision's Recheck block in the Review project.
**Log:**
