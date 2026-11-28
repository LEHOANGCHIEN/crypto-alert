# TRACEABILITY — AC → automated test → status

> Claude Code updates this file in the same commit that adds/changes a test. Status values: `pending` (no test yet) · `passing` (green locally **and** in CI) · `failing` (test exists, red) · `flaky` (must be fixed before review).
> Test title must start with the AC ID exactly, e.g. `test('AC-AUTH-01 register success', …)`. Run one: `npm run test:e2e -- -g "AC-AUTH-01"`.
> Supporting unit/integration tests may be listed in Notes, but an AC is `passing` only when its Playwright test is.

**Summary:** 99 ACs · passing 97 · failing 0 · pending 2 · last CI run: see PROGRESS log (phase-7a-foundation)

| AC | Phase | E2E file (`e2e/tests/`) | Test title | Status | Notes |
|---|---|---|---|---|---|
| AC-OPS-01 | 0 | core/ops.spec.ts | AC-OPS-01 health reports db and market data | passing | |
| AC-I18N-01 | 0 | core/i18n.spec.ts | AC-I18N-01 Vietnamese by default | passing | |
| AC-THEME-01 | 0 | core/theme.spec.ts | AC-THEME-01 dark theme by default | passing | |
| AC-UI-03 | 0 | chart/layout.spec.ts | AC-UI-03 site footer shows texts and every link opens an existing page | passing | rewritten in 7a for the new AC: full site footer, attribution, no close button, visits every footer link (internal not 404, external `_blank` + `noopener noreferrer`), chart page has `statusbar-disclaimer` and no footer |
| AC-UI-04 | 0 | chart/layout.spec.ts | AC-UI-04 unknown route shows 404 | passing | |
| AC-AUTH-01 | 1 | core/auth.spec.ts | AC-AUTH-01 register success | passing | |
| AC-AUTH-02 | 1 | core/auth.spec.ts | AC-AUTH-02 duplicate email rejected | passing | |
| AC-AUTH-03 | 1 | core/auth.spec.ts | AC-AUTH-03 register validation errors | passing | |
| AC-AUTH-04 | 1 | core/auth.spec.ts | AC-AUTH-04 login success with return-to | passing | |
| AC-AUTH-05 | 1 | core/auth.spec.ts | AC-AUTH-05 wrong credentials message | passing | |
| AC-AUTH-06 | 1 | core/auth.spec.ts | AC-AUTH-06 session survives reload and token expiry | passing | |
| AC-AUTH-07 | 1 | core/auth.spec.ts | AC-AUTH-07 logout | passing | |
| AC-AUTH-08 | 1 | core/auth.spec.ts | AC-AUTH-08 protected route redirects to login | passing | |
| AC-AUTH-09 | 1 | core/auth.spec.ts | AC-AUTH-09 no password hash in responses | passing | |
| AC-AUTH-10 | 1 | core/auth.spec.ts | AC-AUTH-10 login rate limit | passing | |
| AC-PROF-01 | 1 | core/account.spec.ts | AC-PROF-01 update display name | passing | |
| AC-PROF-02 | 1 | core/account.spec.ts | AC-PROF-02 display name validation | passing | |
| AC-PROF-03 | 1 | core/account.spec.ts | AC-PROF-03 change password | passing | |
| AC-PROF-04 | 1 | core/account.spec.ts | AC-PROF-04 change password logs out other sessions | passing | |
| AC-I18N-03 | 1 | core/i18n.spec.ts | AC-I18N-03 error messages translated | passing | |
| AC-I18N-05 | 1 | core/i18n.spec.ts | AC-I18N-05 language persists for guest and account | passing | |
| AC-THEME-03 | 1 | core/theme.spec.ts | AC-THEME-03 theme persists for guest and account | passing | |
| AC-MKT-01 | 2 | market/market.spec.ts | AC-MKT-01 list shows only USDT pairs sorted by volume | passing | edited in 6a: two-line rows, four column labels, 48 px rows (test rewritten to the new AC text) |
| AC-MKT-02 | 2 | market/market.spec.ts | AC-MKT-02 search filters pairs | passing | |
| AC-MKT-04 | 2 | market/market.spec.ts | AC-MKT-04 change colors and signs | passing | |
| AC-MKT-05 | 2 | market/market.spec.ts | AC-MKT-05 row click opens chart | passing | |
| AC-MKT-06 | 2 | market/market.spec.ts | AC-MKT-06 unknown pair shows not found | passing | |
| AC-CHART-01 | 2 | chart/chart.spec.ts | AC-CHART-01 chart renders with attribution logo | passing | |
| AC-CHART-02 | 2 | chart/chart.spec.ts | AC-CHART-02 timeframe switch and URL sync | passing | |
| AC-CHART-03 | 2 | chart/chart.spec.ts | AC-CHART-03 loads 1000 candles | passing | |
| AC-CHART-04 | 2 | chart/chart.spec.ts | AC-CHART-04 second load uses candle cache | passing | |
| AC-CHART-05 | 2 | chart/chart.spec.ts | AC-CHART-05 legend shows hovered candle | passing | |
| AC-CHART-06 | 2 | chart/chart.spec.ts | AC-CHART-06 times shown in user timezone | passing | |
| AC-PROF-05 | 2 | core/account.spec.ts | AC-PROF-05 timezone setting changes displayed times | passing | |
| AC-I18N-04 | 2 | core/i18n.spec.ts | AC-I18N-04 number and date formats follow locale | passing | |
| AC-THEME-02 | 2 | core/theme.spec.ts | AC-THEME-02 toggle applies to page and chart | passing | |
| AC-UI-01 | 2 | chart/layout.spec.ts | AC-UI-01 desktop three-column layout | passing | edited in 7a: compact chart header 44–56 px (logo → `/`, pair selector), no site footer on the chart page; edited in 6a: 240/320 columns, handles, pulse bar 32, status bar 28, header 56; guest header (logo, language, theme, login/register, footer) + logged-in header bell and user menu (reviews/phase-2-ui-01-bell.decision.md) |
| AC-UI-02 | 2 | chart/layout.spec.ts | AC-UI-02 mobile bottom tabs | passing | |
| AC-MKT-03 | 3 | market/market.spec.ts | AC-MKT-03 live ticker updates row | passing | |
| AC-RT-01 | 3 | market/realtime.spec.ts | AC-RT-01 open candle updates live | passing | Unit: backoff, send queue, upstream reconnect (fake WS), SubscriptionManager + caps, ticker batcher; integration: realtime.int-spec.ts |
| AC-RT-02 | 3 | market/realtime.spec.ts | AC-RT-02 closed candle starts a new one | passing | |
| AC-RT-03 | 3 | market/realtime.spec.ts | AC-RT-03 subscriptions follow the viewed chart | passing | |
| AC-RT-04 | 3 | market/realtime.spec.ts | AC-RT-04 shared upstream subscription ref-count | passing | Samples stats for 7 s after closing one tab (past the 5 s grace) |
| AC-RT-05 | 3 | market/realtime.spec.ts | AC-RT-05 browser reconnect banner and resync | passing | |
| AC-RT-06 | 3 | market/realtime.spec.ts | AC-RT-06 upstream disconnect badge and recovery | passing | |
| AC-IND-01 | 4 | chart/indicators.spec.ts | AC-IND-01 default MA lines | passing | unit: lib.test.ts, oracle.test.ts vs technicalindicators |
| AC-IND-02 | 4 | chart/indicators.spec.ts | AC-IND-02 toggle and change MA period persists | passing | unit: settings.test.ts |
| AC-IND-03 | 4 | chart/indicators.spec.ts | AC-IND-03 invalid period rejected | passing | unit: settings.test.ts |
| AC-IND-04 | 4 | chart/indicators.spec.ts | AC-IND-04 RSI pane | passing | |
| AC-IND-05 | 4 | chart/indicators.spec.ts | AC-IND-05 MACD pane | passing | |
| AC-IND-06 | 4 | chart/indicators.spec.ts | AC-IND-06 values match golden file | passing | golden from e2e/scripts/generate-indicators-golden.mjs (technicalindicators oracle, BTCUSDT-1h fixture, index 998) |
| AC-IND-07 | 4 | chart/indicators.spec.ts | AC-IND-07 indicators update live | passing | incremental update unit-tested in lib.test.ts |
| AC-WL-01 | 5 | watchlist/watchlist.spec.ts | AC-WL-01 star adds pair to watchlist | passing | integration: watchlist.int-spec.ts; chart header star uses testid `chart-star-<SYMBOL>` (market row keeps `star-<SYMBOL>`) |
| AC-WL-02 | 5 | watchlist/watchlist.spec.ts | AC-WL-02 remove from watchlist | passing | |
| AC-WL-03 | 5 | watchlist/watchlist.spec.ts | AC-WL-03 watchlist persists across reload and browsers | passing | |
| AC-WL-04 | 5 | watchlist/watchlist.spec.ts | AC-WL-04 watchlist prices update live | passing | |
| AC-WL-05 | 5 | watchlist/watchlist.spec.ts | AC-WL-05 watchlist row opens chart | passing | |
| AC-WL-06 | 5 | watchlist/watchlist.spec.ts | AC-WL-06 guest sees login prompt | passing | |
| AC-WL-07 | 5 | watchlist/watchlist.spec.ts | AC-WL-07 isolation, no duplicates, limit 50 | passing | limit case fills the test DB directly (e2e/helpers/watchlist.ts) because the mock has only 8 pairs |
| AC-ALERT-01 | 6 | alerts/alerts.spec.ts | AC-ALERT-01 create alert | passing | integration: alerts.int-spec.ts (fields, order, check order); unit: alert-match.spec.ts, target.test.ts |
| AC-ALERT-02 | 6 | alerts/alerts.spec.ts | AC-ALERT-02 alert validation and already-met | passing | integration: alerts.int-spec.ts (every field code, 422 for ABOVE/BELOW) |
| AC-ALERT-03 | 6 | alerts/alerts.spec.ts | AC-ALERT-03 above alert triggers toast within 5s | passing | run in English; integration: alert-worker.int-spec.ts |
| AC-ALERT-04 | 6 | alerts/alerts.spec.ts | AC-ALERT-04 below alert triggers toast within 5s | passing | |
| AC-ALERT-05 | 6 | alerts/alerts.spec.ts | AC-ALERT-05 alert is one-shot | passing | proof of absence: every toast is recorded (helpers/alerts.ts recordToasts) and a later sentinel alert; integration: 20-tick burst + concurrent trigger transactions |
| AC-ALERT-06 | 6 | alerts/alerts.spec.ts | AC-ALERT-06 deleted alert never triggers | passing | sentinel alert proves the deleted one sent nothing |
| AC-ALERT-07 | 6 | alerts/alerts.spec.ts | AC-ALERT-07 active alert limit 20 | passing | 18 alerts created through the API + 2 seeded |
| AC-ALERT-08 | 6 | alerts/alerts.spec.ts | AC-ALERT-08 alerts isolated between users | passing | integration: alerts.int-spec.ts + alert-worker.int-spec.ts (socket isolation) |
| AC-ALERT-09 | 6 | alerts/alerts.spec.ts | AC-ALERT-09 alerts survive worker reload | passing | integration: alert inserted behind the worker is picked up only after /test/worker/reload |
| AC-ALERT-10 | 6 | alerts/alerts.spec.ts | AC-ALERT-10 alert on a symbol not being viewed | passing | checks no dogeusdt kline stream upstream |
| AC-NOTIF-01 | 6 | notifications/notifications.spec.ts | AC-NOTIF-01 bell unread badge | passing | 9+ reached with 10 triggers from API-created alerts; unit: badge.test.ts |
| AC-NOTIF-02 | 6 | notifications/notifications.spec.ts | AC-NOTIF-02 notification list content and order | passing | times checked in Asia/Ho_Chi_Minh against the API createdAt; unit: cache.test.ts |
| AC-NOTIF-03 | 6 | notifications/notifications.spec.ts | AC-NOTIF-03 mark read and mark all read | passing | integration: notifications.int-spec.ts (read idempotent, read-all) |
| AC-NOTIF-04 | 6 | notifications/notifications.spec.ts | AC-NOTIF-04 offline trigger shown on next login | passing | waits (expect.poll) until the trigger is stored before logging in again |
| AC-NOTIF-05 | 6 | notifications/notifications.spec.ts | AC-NOTIF-05 multi-tab delivery and read sync | passing | two pages of one browser context; integration: notification:read reaches every socket of the user only |
| AC-I18N-02 | 7 | core/i18n.spec.ts | AC-I18N-02 every visible text switches to English | pending | |
| AC-OPS-02 | 7 | core/ops.spec.ts | AC-OPS-02 seeded demo account | pending | |
| AC-MKT-07 | 6a | market/market.spec.ts | AC-MKT-07 market list has All and Watchlist tabs | passing | |
| AC-UI-05 | 6a | chart/ui.spec.ts | AC-UI-05 side columns can be resized by drag and keyboard | passing | unit: layout.test.ts |
| AC-UI-06 | 6a | chart/ui.spec.ts | AC-UI-06 side columns can be collapsed and reopened | passing | |
| AC-UI-07 | 6a | chart/ui.spec.ts | AC-UI-07 market pulse bar shows major pairs live and links to the chart | passing | |
| AC-UI-08 | 6a | chart/ui.spec.ts | AC-UI-08 status bar shows connection state, last update and a clock | passing | last update = tickers query dataUpdatedAt (snapshot or live) |
| AC-CHART-07 | 6a | chart/chart.spec.ts | AC-CHART-07 chart type menu switches the price series | passing | |
| AC-CHART-08 | 6a | chart/chart.spec.ts | AC-CHART-08 volume bars overlay on the price pane | passing | unit: settings.test.ts (volume default/stored). Live update proven with tick (bar color) + close-candle (new bar, volume 0): the mock tick does not change candle volume |
| AC-CHART-09 | 6a | chart/chart.spec.ts | AC-CHART-09 chart header shows coin name and 24h stats | passing | unit: coin-names.test.ts (18 assets, unknown → no name); unknown-name case covered by coin-names.test.ts (mock has no USDT pair outside the map) |
| AC-CHART-10 | 6a | chart/chart.spec.ts | AC-CHART-10 screenshot download and maximize | passing | unit: format.test.ts (file stamp); maximize is CSS (fixed overlay), not the Fullscreen API |
| AC-UI-09 | 6b | site/nav.spec.ts | AC-UI-09 site header and mega-menu | passing | rewritten in 7a: 64 px site header, search button, Products mega-menu (click/hover/keyboard, Esc, `aria-current`), last-symbol memory, guest return-to, drawer below 1024 px; Markets/Community/News menus not shown yet (no pages) |
| AC-UI-10 | 6b | chart/ui.spec.ts | AC-UI-10 auth pages two-column layout | passing | one test, /login and /register: 1440×900 two equal columns under the 56 px header, brand panel (headline, 3 features, line; content ≤ 520 px centered), form 440 px centered (±2 horizontal, ±40 vertical), title 28 px, inputs 46 px, button 48 px = form width; 390×844 panel hidden, 16 px margins, no horizontal scroll. Existing AC-AUTH tests unchanged (testids `page-login`/`page-register`/`submit-*` kept) |
| AC-ALERT-11 | 6b | alerts/alerts-panel.spec.ts | AC-ALERT-11 bottom panel | passing | unit: layout.test.ts (bottom limits/parse), distance.test.ts; one test covers tabs, columns, "Current pair only" on all three tabs, notification click marks read, create → row ≤ 2 s, mock trigger → Triggered, drag/keyboard/dblclick resize, collapse, reload. The right-panel Alerts tab keeps its Active/Triggered lists (AC-ALERT-01…06 unchanged) and gains the "n/20" hint; the lists in the bottom panel use `bottom-*` testids |
| AC-ALERT-12 | 6b | alerts/alerts-page.spec.ts | AC-ALERT-12 alerts page | passing | one test: guest redirect + return-to, table columns/badges/counts, status filter + search, dialog (FAKEUSDT, already-met, empty target, valid create), delete active + triggered, symbol link, empty state for a new user |
| AC-NOTIF-06 | 6b | notifications/notifications-page.spec.ts | AC-NOTIF-06 notifications page | passing | one test: guest redirect + return-to, list request `limit=100`, newest-first order, summary/filter counts, mock trigger → new row on top ≤ 2 s, All/Unread filter, click marks read (badge −1), mark all, bell "View all" link. The bell panel and the page share one `['notifications']` query (limit 100) |
| AC-COIN-01 | 6b | coin/coin.spec.ts | AC-COIN-01 coin header | passing | one test: header (avatar, name, pair, price/change formatted from the API ticker, updated-at with GMT+7), mock tick ≤ 2 s, star (guest prompt; demo user remove/add), Open full chart, trade chart header link back, lower-case URL normalized, FAKEUSDT not-found + link |
| AC-COIN-02 | 6b | coin/coin.spec.ts | AC-COIN-02 range chart | passing | one test: request `interval`/`limit` asserted for every range (chart requests exactly the AC values, YTD = days since 1 Jan in guest tz), attribution logo, `data-direction` / first-close / last-close vs klines fetched from the API, tooltip time + price of the hovered candle; unit: coin.test.ts (chartQuery), format.test.ts (daysSinceYearStart) |
| AC-COIN-03 | 6b | coin/coin.spec.ts | AC-COIN-03 performance tiles | passing | one test: all 7 tiles equal (last − first close)/first close computed independently from the API klines (24h and 1M plus the rest), up/down class, tile click selects the range and requests its klines; unit: coin.test.ts (rangeChange, tileChange slices) |
| AC-COIN-04 | 6b | coin/coin.spec.ts | AC-COIN-04 key stats | passing | one test: 7 stat rows equal the API ticker / daily klines, guest page, desktop chart + stats side by side, 390×844 single column and no horizontal scroll; unit: coin.test.ts (highLow) |
| AC-SITE-01 | 7a | site/home.spec.ts | AC-SITE-01 home shows hero, market summary and movers | passing | unit: lib.test.ts (topMovers), Sparkline.test.ts; checks hero, 4 cards (price/change/colour from the API tickers, sparkline 24 points + own direction, one klines 1h×24 request per card), Gainers/Losers order, mock tick ≤ 2 s, hero search → dialog, vi + en, logged in, 390 px no horizontal scroll |
| AC-SITE-02 | 7a | site/search.spec.ts | AC-SITE-02 search dialog (Ctrl+K) | passing | unit: search.test.ts (ranking, pages, recent symbols); Ctrl+K and header/pair-selector triggers, focus return, arrows + Enter, recents in localStorage, vi + en empty state |
| AC-SITE-03 | 7a | site/static.spec.ts | AC-SITE-03 static pages and live status | passing | one test: 9 pages in vi + en (breadcrumb, h1, body, footer, no raw keys, no Vietnamese diacritics in EN), FAQ pairs, /contact repo link, 390 px no horizontal scroll, /status values equal the page own /health response and refresh at 30 s (Playwright clock) |
| AC-SITE-04 | 7a | site/routes.spec.ts | AC-SITE-04 /trade redirects to /chart; shells never mix | passing | redirect keeps query, upper-casing, chart shell vs site shell element checks, back/forward |
| AC-SITE-05 | 7a | site/tokens.spec.ts | AC-SITE-05 dark theme is black and text tokens keep 4.5:1 contrast in both themes | passing | computes WCAG contrast from computed CSS variables, 3 text tokens × 3 surfaces, dark + light |
