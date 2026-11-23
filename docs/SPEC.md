# SPEC — Crypto Alert

> **Source of truth for scope and behaviour.** Every acceptance criterion (AC) below MUST have one automated Playwright test whose title starts with the AC ID (e.g. `test('AC-ALERT-03 above alert triggers toast within 5s', …)`). Status is tracked in `docs/TRACEABILITY.md`.
> Related: `ARCHITECTURE.md` (how), `API.md` (exact contracts), `DATABASE.md` (schema).

## 0. Project identity

| Item | Value |
|---|---|
| Official title (use exactly, Vietnamese, in UI footer and README) | **Xây dựng ứng dụng web theo dõi thị trường tiền mã hóa với biểu đồ kỹ thuật thời gian thực và cảnh báo giá** |
| Course | Đồ án chuyên ngành — UIT (VNU-HCM), solo |
| Market | Crypto, **USDT spot pairs only**, public Binance market data |
| Disclaimer (footer, translated) | vi: "Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư." / en: "Information is for reference only and is not investment advice." |
| Deadline | ~early December 2026 (2–3 weeks) — working deployed demo + report |

### 0.1 Conflicts with the proposal report (this spec wins)

| # | Report says | This spec | Why |
|---|---|---|---|
| C1 | Title "XÂY DỰNG WEBSITE …" | "Xây dựng ứng dụng web …" (exact string above) | Owner's instruction |
| C2 | Backend Node.js + Express ("subject to change") | NestJS | Structure; see ADR-01 in ARCHITECTURE.md |
| C3 | "WebSocket" to browsers | Raw WS to Binance, **Socket.IO** to browsers | Rooms, reconnect; ADR-02 |
| C4 | Extensions: paper trading, market overview | **Out of scope** (documented as future extensions only) | Time |
| C5 | "Quản lý tài khoản" (unspecified) | Register, login, logout, change password, update profile. **No forgot-password** (no email sending) | Scope |
| C6 | 15-week plan | 2–3 weeks, phases in PROGRESS.md | Real deadline |

## 1. Scope

**In scope (core):** F1 Account · F2 Market list · F3 Candlestick chart · F4 Real-time updates · F5 Indicators (MA, RSI, MACD) · F6 Watchlist · F7 Price alerts · F8 Notifications · F9 i18n (vi/en) · F10 Themes (dark/light) · F11 Layout & responsiveness · F12 Operations (health, seed).

**Out of scope — MUST NOT be built:** paper trading, backtesting, market overview page (top gainers/losers), real-money trading, exchange account linking, drawing tools, email/Telegram/push notifications, forgot/reset password, admin pages, column sorting in market list, infinite scroll-back of chart history, volume pane.

## 2. Roles and access

| Feature | Guest | Logged-in user |
|---|---|---|
| Market list, chart, indicators, language, theme | ✅ | ✅ |
| Watchlist, alerts, notifications, account page | ❌ → shows "Log in to use this" prompt with Login button | ✅ |

`role` column exists (`user`/`admin`) but no admin features exist.

## 3. Routes (frontend)

| Path | Page | Access |
|---|---|---|
| `/` | Redirect → `/trade/BTCUSDT` | public |
| `/trade/:symbol?tf=1h` | Main dashboard (market list · chart · watchlist/alerts) | public |
| `/login`, `/register` | Auth pages (logged-in users are redirected to `/trade/BTCUSDT`) | public |
| `/account` | Profile, change password, preferences | protected |
| anything else | 404 page with link home | public |

## 4. Domain rules (shared by frontend and backend)

| Rule | Value |
|---|---|
| Symbol | Binance spot symbol, quote asset `USDT`, status `TRADING`. Upper-case in URLs and API (`btcusdt` in URL → redirect to `BTCUSDT`). |
| Timeframes | `1m`, `5m`, `15m`, `1h`, `4h`, `1d` (default `1h`). Same strings as Binance intervals. |
| Initial history | **1000** candles per (symbol, timeframe) load (includes the current open candle). |
| Price display precision | Derived from the pair's `tickSize` (e.g. 0.01 → 2 decimals). |
| 24h change % | `(last − open24h) / open24h × 100`, 2 decimals, sign shown (`+1.23%`). |
| 24h volume | **Quote volume (USDT)**, compact locale format (vi `1,2 Tr`, en `1.2M`). |
| Email | Trimmed, lower-cased, unique, valid format, max 254 chars. |
| Password | 8–72 chars, ≥1 letter and ≥1 digit. |
| Display name | Trimmed, 2–50 chars. |
| Alert | condition `ABOVE` (triggers when last price ≥ target) or `BELOW` (last price ≤ target); target price > 0, max 8 decimals; **one-shot**. |
| Limits | Watchlist ≤ 50 items/user; ≤ 20 `ACTIVE` alerts/user. |
| Timestamps | UTC everywhere (API: epoch ms for market data, ISO 8601 for records); UI converts to user timezone. |
| Default preferences | locale `vi`, theme `dark`, timezone `Asia/Ho_Chi_Minh`. |
| Errors | Backend returns stable error **codes** only (e.g. `ALERT_NOT_FOUND`); frontend translates them. Full list in API.md. |

### 4.1 Indicator formulas (must match TradingView definitions)

| Indicator | Definition |
|---|---|
| MA(n) | Simple moving average of close over n candles. Up to 3 lines, defaults **7, 25, 99**, each toggleable, period integer **2–200**. |
| RSI(14) | Wilder: gains/losses of close; first average = SMA of first 14; then `avg = (prev × 13 + current) / 14` (RMA). `RSI = 100 − 100/(1 + avgGain/avgLoss)`; if avgLoss = 0 → 100. Pane shows guide lines at 70 and 30. |
| MACD(12,26,9) | `MACD = EMA12(close) − EMA26(close)`; `Signal = EMA9(MACD)`; `Hist = MACD − Signal`. EMA α = 2/(n+1), seeded with the SMA of the first n values (Pine `ta.ema` behaviour). |

Values are computed on the frontend over all loaded candles (incl. the live candle). Accuracy target: after a warm-up of ≥ 250 candles, values equal an independent reference implementation within 0.01 % (unit tests) and match TradingView to the displayed decimals (manual check).

## 5. Acceptance criteria

Notation: "mock" = test-mode MockProvider controlled by test-only endpoints (see ARCHITECTURE §8). "within N s" is measured from the mock push. Every visible text in every AC is translated (F9).

### F1 Account — `AC-AUTH`, `AC-PROF`

| ID | Steps → expected result |
|---|---|
| AC-AUTH-01 | On `/register` enter valid email, display name, password, confirm password → submit → redirected to `/trade/BTCUSDT`, header shows display name and avatar menu. |
| AC-AUTH-02 | Register with an email that already exists (any letter case) → form shows translated `EMAIL_TAKEN` message; no account created. |
| AC-AUTH-03 | Register with invalid email / weak password / mismatched confirmation → inline translated field errors appear before submit; submit button does nothing. Bypassing the client (direct API call) returns `VALIDATION_ERROR` with field codes. |
| AC-AUTH-04 | On `/login` enter correct credentials → redirected to the page originally requested (default `/trade/BTCUSDT`); header shows display name. |
| AC-AUTH-05 | Login with wrong password or unknown email → same translated `INVALID_CREDENTIALS` message in both cases; password field cleared. |
| AC-AUTH-06 | Logged in → reload page → still logged in (no login screen). With test access-token TTL of 5 s, wait 6 s, then on `/account` change the display name and save → succeeds without re-login (silent refresh). |
| AC-AUTH-07 | Click Logout → header shows Login/Register buttons; opening `/account` redirects to `/login`; reload → still logged out. |
| AC-AUTH-08 | Logged out → open `/account` → redirected to `/login`; after login → lands on `/account`. |
| AC-AUTH-09 | Responses of register, login, refresh, `GET /users/me`, profile update contain no `password`/`passwordHash` field (checked via network interception). |
| AC-AUTH-10 | 6 failed logins within 1 minute from the same client (test limit = 5) → translated `RATE_LIMITED` message; correct password also refused until the window passes. |
| AC-PROF-01 | On `/account` change display name → save → success toast; header shows the new name; reload → still the new name. Email is shown read-only. |
| AC-PROF-02 | Display name of 1 char or 51 chars → translated validation error; nothing saved. |
| AC-PROF-03 | Change password with wrong current password → translated `WRONG_CURRENT_PASSWORD`. With correct current password → success toast; logout; login with old password fails, new password succeeds. |
| AC-PROF-04 | Same user logged in in browser A and B → change password in A → A stays logged in; B is logged out at its next authenticated action (redirect to `/login`). |
| AC-PROF-05 | On `/account` change timezone to `UTC` → save → chart legend time for the same candle shifts by −7 h vs `Asia/Ho_Chi_Minh`. |

### F2 Market list — `AC-MKT`

| ID | Steps → expected result |
|---|---|
| AC-MKT-01 | Open `/trade/BTCUSDT` → left panel lists pairs with columns Pair, Last price, 24h change, 24h volume; only `…USDT` pairs appear (mock non-USDT pairs `ETHBTC`, `BTCUSDC` are absent); default order = 24h quote volume descending. |
| AC-MKT-02 | Type `eth` in search → only pairs whose symbol contains `ETH` remain (case-insensitive); type `zzz` → translated empty-state message; clear → full list back. |
| AC-MKT-03 | Mock pushes a new ticker for ETHUSDT → its row's last price, change % and volume update within 2 s without reload; the price cell briefly flashes green (up) or red (down). |
| AC-MKT-04 | Change % > 0 shown green with `+`, < 0 red with `−`, = 0 neutral color. |
| AC-MKT-05 | Click the ETHUSDT row → URL becomes `/trade/ETHUSDT?tf=<current tf>`, chart and header switch to ETHUSDT, row is highlighted as selected. |
| AC-MKT-06 | Open `/trade/FAKEUSDT` → chart area shows translated "Pair not found" with a link to BTCUSDT; app does not crash. |

### F3 Candlestick chart — `AC-CHART`

| ID | Steps → expected result |
|---|---|
| AC-CHART-01 | Open `/trade/BTCUSDT` → candlestick chart renders; chart header shows symbol, last price, 24h change; **TradingView attribution logo is visible** on the chart. |
| AC-CHART-02 | Timeframe buttons `1m 5m 15m 1h 4h 1d` visible; `1h` active by default. Click `15m` → candles reload, button highlighted, URL has `?tf=15m`; reload page → `15m` still selected. |
| AC-CHART-03 | Each load requests and renders 1000 candles (network response of klines endpoint has 1000 items; last item is the open candle). |
| AC-CHART-04 | Load BTCUSDT 1h twice (navigate away and back) → mock REST-call counter shows the second load fetched ≤ 2 recent candles from the provider (rest came from DB cache). |
| AC-CHART-05 | Hover a candle → legend shows that candle's time, O, H, L, C in locale number format; mouse out → legend shows the latest candle. |
| AC-CHART-06 | Time axis and legend times are shown in the user's timezone (see AC-PROF-05). Guest = `Asia/Ho_Chi_Minh`. |

### F4 Real-time — `AC-RT`

| ID | Steps → expected result |
|---|---|
| AC-RT-01 | On BTCUSDT 1m, mock pushes a kline update for the open candle with a new close → the last candle's close/high/low and the header price update within 2 s. |
| AC-RT-02 | Mock closes the current 1m candle and starts the next → a new candle appears to the right within 2 s; previous candle keeps its final values. |
| AC-RT-03 | Open BTCUSDT 1h, then switch to 15m, then to ETHUSDT → test stats endpoint shows exactly one upstream kline subscription (`ethusdt@kline_15m`) plus the all-market ticker stream. |
| AC-RT-04 | Two browser tabs view BTCUSDT 1h → stats show 1 upstream subscription for it; close one tab → still 1; close both → 0 within 10 s. |
| AC-RT-05 | Browser goes offline (Playwright `setOffline(true)`) → translated "Reconnecting…" banner within 5 s; go online → banner disappears, chart re-fetches missing candles, live updates resume. |
| AC-RT-06 | Mock simulates upstream (Binance) disconnect → header shows translated "Market data delayed" badge within 5 s; mock recovers → badge disappears and ticks resume without any user action. |

### F5 Indicators — `AC-IND`

| ID | Steps → expected result |
|---|---|
| AC-IND-01 | Open chart → MA(7), MA(25), MA(99) lines drawn on the price pane by default, each with its own color and a legend entry with its current value. |
| AC-IND-02 | Open Indicators menu → toggle MA(25) off → its line and legend disappear; set MA #1 period to 50 → legend shows `MA(50)` and line redraws; reload → settings kept (stored per browser). |
| AC-IND-03 | Enter period `1`, `201`, or `abc` → translated validation message; previous value kept. |
| AC-IND-04 | Enable RSI → separate pane below price pane with RSI(14) line, dashed 70/30 lines, legend value. Disable → pane removed. |
| AC-IND-05 | Enable MACD → separate pane with MACD line, signal line, histogram (green ≥ 0, red < 0), legend shows 3 values. Disable → pane removed. |
| AC-IND-06 | Mock fixture BTCUSDT 1h: legend values for the last closed candle of MA(7), MA(25), MA(99), RSI(14), MACD/Signal/Hist equal the golden values in `e2e/fixtures/indicators.golden.json` (rounded to displayed decimals). |
| AC-IND-07 | Mock pushes a new close for the open candle → MA, RSI, MACD legend values for the last candle change within 2 s. |

### F6 Watchlist — `AC-WL`

| ID | Steps → expected result |
|---|---|
| AC-WL-01 | Logged in: click the star on ETHUSDT row (or chart header star) → star becomes filled; ETHUSDT appears at the end of Watchlist panel with last price and change %. |
| AC-WL-02 | Click the filled star or the remove (×) button in the watchlist → item removed; star becomes empty. |
| AC-WL-03 | Reload → watchlist unchanged. Log in as the same user in a new browser context → same watchlist. |
| AC-WL-04 | Mock ticker for a watched symbol → watchlist row price updates within 2 s. |
| AC-WL-05 | Click a watchlist row → chart switches to that symbol. |
| AC-WL-06 | Guest clicks a star → translated prompt "Log in to use watchlist" with Login button; nothing saved. |
| AC-WL-07 | User B does not see user A's watchlist. Adding the same symbol twice keeps one row. 51st item → translated `WATCHLIST_LIMIT_REACHED`. |

### F7 Price alerts — `AC-ALERT`

| ID | Steps → expected result |
|---|---|
| AC-ALERT-01 | Alerts tab → form prefilled with current chart symbol, condition "Above", target = current price. Set target = price + 100 → Create → alert appears in **Active** list (symbol, condition, target, created time). |
| AC-ALERT-02 | Target empty, `0`, negative, or > 8 decimals → translated validation error. Above with target ≤ current price (or Below with target ≥ current price) → translated `ALERT_CONDITION_ALREADY_MET`. |
| AC-ALERT-03 | Active alert BTCUSDT Above X; mock pushes BTCUSDT price ≥ X → within 5 s: toast "BTCUSDT rose above X (now Y)" appears; alert moves to **Triggered** list with triggered price and time; bell badge +1. Reload → the notification is still listed. |
| AC-ALERT-04 | Same as 03 for Below: mock pushes price ≤ X → toast, Triggered, bell +1 within 5 s. |
| AC-ALERT-05 | After AC-ALERT-03, mock pushes more prices above and below X → no new toast, no new notification (one-shot). |
| AC-ALERT-06 | Delete an Active alert → removed from list; mock then crosses its threshold → no toast, no notification. Triggered alerts can also be deleted (history only). |
| AC-ALERT-07 | With 20 Active alerts, creating the 21st → translated `ALERT_LIMIT_REACHED`. |
| AC-ALERT-08 | User B cannot see user A's alerts; B calling delete on A's alert ID gets `ALERT_NOT_FOUND`; when A's alert triggers, B receives nothing. |
| AC-ALERT-09 | Create alert → call test endpoint "reload worker" (simulates backend restart: in-memory state rebuilt from DB) → mock crosses threshold → alert still triggers. |
| AC-ALERT-10 | Alerts work for symbols not currently open in any chart (price source = all-market ticker stream). |

### F8 Notifications — `AC-NOTIF`

| ID | Steps → expected result |
|---|---|
| AC-NOTIF-01 | Header bell shows unread count badge (hidden when 0, `9+` above 9). |
| AC-NOTIF-02 | Click bell → panel lists notifications newest first: translated text, symbol, condition, target, triggered price, time in user timezone; unread ones visually marked. |
| AC-NOTIF-03 | Click one notification → marked read, badge −1, chart opens that symbol. "Mark all as read" → badge hidden. State survives reload. |
| AC-NOTIF-04 | User logged out (no open tab) → mock triggers their alert → user logs in → toast "You have N unread notifications"; bell badge = N; panel lists it. |
| AC-NOTIF-05 | Same user has 2 tabs open → alert triggers → toast appears in both tabs; marking read in one tab updates the badge in the other within 5 s. |

### F9 Internationalisation — `AC-I18N`

| ID | Steps → expected result |
|---|---|
| AC-I18N-01 | First visit, fresh browser (any browser language) → UI in Vietnamese; `<html lang="vi">`. |
| AC-I18N-02 | Switch language to English via header switcher → **every visible text changes** on dashboard, auth pages, account page, alerts form, notifications panel, toasts, empty states, 404 page; `<html lang="en">`. Test: no visible text contains Vietnamese diacritics except the two footer lines with `data-testid` `footer-title` and `footer-course` (the official title and "Đồ án chuyên ngành — UIT", shown in Vietnamese in both languages); no raw i18n keys (e.g. `alerts.form.title`) appear in either language. |
| AC-I18N-03 | Error messages are translated: trigger `INVALID_CREDENTIALS` in vi, switch to en → same error shown in English (and vice versa). Unknown error code → generic translated "Something went wrong". |
| AC-I18N-04 | Numbers and dates follow locale: price `67.234,50` (vi) vs `67,234.50` (en); dates `21/11/2026 14:05` (vi) vs `11/21/2026, 2:05 PM` (en). |
| AC-I18N-05 | Guest choice persists after reload (browser storage). Logged-in choice is saved to the account: log in on a new browser context → UI uses the saved language. After login, the account setting overrides the guest choice. |

### F10 Themes — `AC-THEME`

| ID | Steps → expected result |
|---|---|
| AC-THEME-01 | First visit → dark theme (`<html data-theme="dark">`). |
| AC-THEME-02 | Toggle theme in header → light theme applies to page **and chart** (background, grid, text) without reload; candle up/down colors remain green/red. |
| AC-THEME-03 | Persistence rules identical to AC-I18N-05 (guest: browser storage; user: account setting). |

### F11 Layout — `AC-UI`

| ID | Steps → expected result |
|---|---|
| AC-UI-01 | Viewport 1440×900 → three columns: market list (left), chart (center), Watchlist/Alerts tabs (right); header with logo, language switcher, theme toggle, bell, user menu; footer visible. |
| AC-UI-02 | Viewport 390×844 → single column with bottom tab bar Markets / Chart / Watchlist / Alerts; each tab shows its panel; no horizontal page scroll. |
| AC-UI-03 | Footer shows exactly "Xây dựng ứng dụng web theo dõi thị trường tiền mã hóa với biểu đồ kỹ thuật thời gian thực và cảnh báo giá" in **both** languages, plus the translated disclaimer and "Đồ án chuyên ngành — UIT". |
| AC-UI-04 | Unknown route `/abc` → translated 404 page with link to home. |

### F12 Operations — `AC-OPS`

| ID | Steps → expected result |
|---|---|
| AC-OPS-01 | `GET /api/v1/health` → success envelope with `db: "up"`, `marketData.provider` (`binance`/`mock`), `marketData.connected: true`, `marketData.lastMessageAt` within last 60 s. |
| AC-OPS-02 | After seeding, log in as `demo@example.com` / `Demo@123456` → watchlist BTCUSDT, ETHUSDT, SOLUSDT; 2 Active alerts; 1 Triggered alert with 1 unread notification. |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Latency | Tick → browser ≤ 2 s; alert trigger → toast ≤ 5 s (normal conditions). |
| Load | Designed for ≤ 50 concurrent users, single backend instance. |
| Security | Passwords hashed (argon2id); refresh token httpOnly cookie, hashed in DB; never return hashes; login rate limit; all inputs validated server-side; test endpoints disabled in production. |
| Browsers | Latest Chrome/Edge/Firefox; Playwright runs Chromium. |
| Accessibility | Visible focus ring; text contrast ≥ 4.5:1 in both themes; up/down not conveyed by color alone (`+`/`−` sign). |
| Compliance | Lightweight Charts attribution logo enabled; disclaimer in footer. |

## 7. Assumptions & defaults (veto any of these early)

| # | Assumption |
|---|---|
| A1 | Guests can view market list, chart, indicators; login only needed for watchlist, alerts, notifications, account. |
| A2 | 24h volume shown = quote volume in USDT. Market list has no column sorting (default by volume). |
| A3 | Indicator settings (MA periods, which indicators shown) are stored per browser (localStorage), not in the DB. Language/theme/timezone are stored per user in DB. |
| A4 | Creating an alert whose condition is already met is rejected (`ALERT_CONDITION_ALREADY_MET`) instead of triggering instantly. Alerts cannot be edited (delete + create). |
| A5 | Email cannot be changed. Changing password revokes all *other* sessions. |
| A6 | Access token 15 min, refresh token 7 days with rotation. |
| A7 | Demo account `demo@example.com` / `Demo@123456`. |
| A8 | Hosting: Railway Hobby (~5 USD/month), **Singapore** region, one service serving API + Socket.IO + built frontend, plus Railway PostgreSQL. Free fallback: Render Singapore (free tier sleeps after 15 min idle, which pauses the alert worker — acceptable only for a demo). |
| A9 | Playwright suite lives in a root `e2e/` workspace (alongside `/backend`, `/frontend`, `/docs`). |
| A10 | Chart history is a fixed 1000-candle window; no lazy loading of older candles; no volume pane. |
