# TRACEABILITY — AC → automated test → status

> Claude Code updates this file in the same commit that adds/changes a test. Status values: `pending` (no test yet) · `passing` (green locally **and** in CI) · `failing` (test exists, red) · `flaky` (must be fixed before review).
> Test title must start with the AC ID exactly, e.g. `test('AC-AUTH-01 register success', …)`. Run one: `npm run test:e2e -- -g "AC-AUTH-01"`.
> Supporting unit/integration tests may be listed in Notes, but an AC is `passing` only when its Playwright test is.

**Summary:** 76 ACs · passing 74 · failing 0 · pending 2 · last CI run: green on phase-6-alerts (2026-11-25, run 45638142138)

| AC | Phase | E2E file (`e2e/tests/`) | Test title | Status | Notes |
|---|---|---|---|---|---|
| AC-OPS-01 | 0 | ops.spec.ts | AC-OPS-01 health reports db and market data | passing | |
| AC-I18N-01 | 0 | i18n.spec.ts | AC-I18N-01 Vietnamese by default | passing | |
| AC-THEME-01 | 0 | theme.spec.ts | AC-THEME-01 dark theme by default | passing | |
| AC-UI-03 | 0 | layout.spec.ts | AC-UI-03 footer shows translated texts and can be closed | passing | |
| AC-UI-04 | 0 | layout.spec.ts | AC-UI-04 unknown route shows 404 | passing | |
| AC-AUTH-01 | 1 | auth.spec.ts | AC-AUTH-01 register success | passing | |
| AC-AUTH-02 | 1 | auth.spec.ts | AC-AUTH-02 duplicate email rejected | passing | |
| AC-AUTH-03 | 1 | auth.spec.ts | AC-AUTH-03 register validation errors | passing | |
| AC-AUTH-04 | 1 | auth.spec.ts | AC-AUTH-04 login success with return-to | passing | |
| AC-AUTH-05 | 1 | auth.spec.ts | AC-AUTH-05 wrong credentials message | passing | |
| AC-AUTH-06 | 1 | auth.spec.ts | AC-AUTH-06 session survives reload and token expiry | passing | |
| AC-AUTH-07 | 1 | auth.spec.ts | AC-AUTH-07 logout | passing | |
| AC-AUTH-08 | 1 | auth.spec.ts | AC-AUTH-08 protected route redirects to login | passing | |
| AC-AUTH-09 | 1 | auth.spec.ts | AC-AUTH-09 no password hash in responses | passing | |
| AC-AUTH-10 | 1 | auth.spec.ts | AC-AUTH-10 login rate limit | passing | |
| AC-PROF-01 | 1 | account.spec.ts | AC-PROF-01 update display name | passing | |
| AC-PROF-02 | 1 | account.spec.ts | AC-PROF-02 display name validation | passing | |
| AC-PROF-03 | 1 | account.spec.ts | AC-PROF-03 change password | passing | |
| AC-PROF-04 | 1 | account.spec.ts | AC-PROF-04 change password logs out other sessions | passing | |
| AC-I18N-03 | 1 | i18n.spec.ts | AC-I18N-03 error messages translated | passing | |
| AC-I18N-05 | 1 | i18n.spec.ts | AC-I18N-05 language persists for guest and account | passing | |
| AC-THEME-03 | 1 | theme.spec.ts | AC-THEME-03 theme persists for guest and account | passing | |
| AC-MKT-01 | 2 | market.spec.ts | AC-MKT-01 list shows only USDT pairs sorted by volume | passing | |
| AC-MKT-02 | 2 | market.spec.ts | AC-MKT-02 search filters pairs | passing | |
| AC-MKT-04 | 2 | market.spec.ts | AC-MKT-04 change colors and signs | passing | |
| AC-MKT-05 | 2 | market.spec.ts | AC-MKT-05 row click opens chart | passing | |
| AC-MKT-06 | 2 | market.spec.ts | AC-MKT-06 unknown pair shows not found | passing | |
| AC-CHART-01 | 2 | chart.spec.ts | AC-CHART-01 chart renders with attribution logo | passing | |
| AC-CHART-02 | 2 | chart.spec.ts | AC-CHART-02 timeframe switch and URL sync | passing | |
| AC-CHART-03 | 2 | chart.spec.ts | AC-CHART-03 loads 1000 candles | passing | |
| AC-CHART-04 | 2 | chart.spec.ts | AC-CHART-04 second load uses candle cache | passing | |
| AC-CHART-05 | 2 | chart.spec.ts | AC-CHART-05 legend shows hovered candle | passing | |
| AC-CHART-06 | 2 | chart.spec.ts | AC-CHART-06 times shown in user timezone | passing | |
| AC-PROF-05 | 2 | account.spec.ts | AC-PROF-05 timezone setting changes displayed times | passing | |
| AC-I18N-04 | 2 | i18n.spec.ts | AC-I18N-04 number and date formats follow locale | passing | |
| AC-THEME-02 | 2 | theme.spec.ts | AC-THEME-02 toggle applies to page and chart | passing | |
| AC-UI-01 | 2 | layout.spec.ts | AC-UI-01 desktop three-column layout | passing | guest header (logo, language, theme, login/register, footer) + logged-in header bell and user menu (reviews/phase-2-ui-01-bell.decision.md) |
| AC-UI-02 | 2 | layout.spec.ts | AC-UI-02 mobile bottom tabs | passing | |
| AC-MKT-03 | 3 | market.spec.ts | AC-MKT-03 live ticker updates row | passing | |
| AC-RT-01 | 3 | realtime.spec.ts | AC-RT-01 open candle updates live | passing | Unit: backoff, send queue, upstream reconnect (fake WS), SubscriptionManager + caps, ticker batcher; integration: realtime.int-spec.ts |
| AC-RT-02 | 3 | realtime.spec.ts | AC-RT-02 closed candle starts a new one | passing | |
| AC-RT-03 | 3 | realtime.spec.ts | AC-RT-03 subscriptions follow the viewed chart | passing | |
| AC-RT-04 | 3 | realtime.spec.ts | AC-RT-04 shared upstream subscription ref-count | passing | Samples stats for 7 s after closing one tab (past the 5 s grace) |
| AC-RT-05 | 3 | realtime.spec.ts | AC-RT-05 browser reconnect banner and resync | passing | |
| AC-RT-06 | 3 | realtime.spec.ts | AC-RT-06 upstream disconnect badge and recovery | passing | |
| AC-IND-01 | 4 | indicators.spec.ts | AC-IND-01 default MA lines | passing | unit: lib.test.ts, oracle.test.ts vs technicalindicators |
| AC-IND-02 | 4 | indicators.spec.ts | AC-IND-02 toggle and change MA period persists | passing | unit: settings.test.ts |
| AC-IND-03 | 4 | indicators.spec.ts | AC-IND-03 invalid period rejected | passing | unit: settings.test.ts |
| AC-IND-04 | 4 | indicators.spec.ts | AC-IND-04 RSI pane | passing | |
| AC-IND-05 | 4 | indicators.spec.ts | AC-IND-05 MACD pane | passing | |
| AC-IND-06 | 4 | indicators.spec.ts | AC-IND-06 values match golden file | passing | golden from e2e/scripts/generate-indicators-golden.mjs (technicalindicators oracle, BTCUSDT-1h fixture, index 998) |
| AC-IND-07 | 4 | indicators.spec.ts | AC-IND-07 indicators update live | passing | incremental update unit-tested in lib.test.ts |
| AC-WL-01 | 5 | watchlist.spec.ts | AC-WL-01 star adds pair to watchlist | passing | integration: watchlist.int-spec.ts; chart header star uses testid `chart-star-<SYMBOL>` (market row keeps `star-<SYMBOL>`) |
| AC-WL-02 | 5 | watchlist.spec.ts | AC-WL-02 remove from watchlist | passing | |
| AC-WL-03 | 5 | watchlist.spec.ts | AC-WL-03 watchlist persists across reload and browsers | passing | |
| AC-WL-04 | 5 | watchlist.spec.ts | AC-WL-04 watchlist prices update live | passing | |
| AC-WL-05 | 5 | watchlist.spec.ts | AC-WL-05 watchlist row opens chart | passing | |
| AC-WL-06 | 5 | watchlist.spec.ts | AC-WL-06 guest sees login prompt | passing | |
| AC-WL-07 | 5 | watchlist.spec.ts | AC-WL-07 isolation, no duplicates, limit 50 | passing | limit case fills the test DB directly (e2e/helpers/watchlist.ts) because the mock has only 8 pairs |
| AC-ALERT-01 | 6 | alerts.spec.ts | AC-ALERT-01 create alert | passing | integration: alerts.int-spec.ts (fields, order, check order); unit: alert-match.spec.ts, target.test.ts |
| AC-ALERT-02 | 6 | alerts.spec.ts | AC-ALERT-02 alert validation and already-met | passing | integration: alerts.int-spec.ts (every field code, 422 for ABOVE/BELOW) |
| AC-ALERT-03 | 6 | alerts.spec.ts | AC-ALERT-03 above alert triggers toast within 5s | passing | run in English; integration: alert-worker.int-spec.ts |
| AC-ALERT-04 | 6 | alerts.spec.ts | AC-ALERT-04 below alert triggers toast within 5s | passing | |
| AC-ALERT-05 | 6 | alerts.spec.ts | AC-ALERT-05 alert is one-shot | passing | proof of absence: every toast is recorded (helpers/alerts.ts recordToasts) and a later sentinel alert; integration: 20-tick burst + concurrent trigger transactions |
| AC-ALERT-06 | 6 | alerts.spec.ts | AC-ALERT-06 deleted alert never triggers | passing | sentinel alert proves the deleted one sent nothing |
| AC-ALERT-07 | 6 | alerts.spec.ts | AC-ALERT-07 active alert limit 20 | passing | 18 alerts created through the API + 2 seeded |
| AC-ALERT-08 | 6 | alerts.spec.ts | AC-ALERT-08 alerts isolated between users | passing | integration: alerts.int-spec.ts + alert-worker.int-spec.ts (socket isolation) |
| AC-ALERT-09 | 6 | alerts.spec.ts | AC-ALERT-09 alerts survive worker reload | passing | integration: alert inserted behind the worker is picked up only after /test/worker/reload |
| AC-ALERT-10 | 6 | alerts.spec.ts | AC-ALERT-10 alert on a symbol not being viewed | passing | checks no dogeusdt kline stream upstream |
| AC-NOTIF-01 | 6 | notifications.spec.ts | AC-NOTIF-01 bell unread badge | passing | 9+ reached with 10 triggers from API-created alerts; unit: badge.test.ts |
| AC-NOTIF-02 | 6 | notifications.spec.ts | AC-NOTIF-02 notification list content and order | passing | times checked in Asia/Ho_Chi_Minh against the API createdAt; unit: cache.test.ts |
| AC-NOTIF-03 | 6 | notifications.spec.ts | AC-NOTIF-03 mark read and mark all read | passing | integration: notifications.int-spec.ts (read idempotent, read-all) |
| AC-NOTIF-04 | 6 | notifications.spec.ts | AC-NOTIF-04 offline trigger shown on next login | passing | waits (expect.poll) until the trigger is stored before logging in again |
| AC-NOTIF-05 | 6 | notifications.spec.ts | AC-NOTIF-05 multi-tab delivery and read sync | passing | two pages of one browser context; integration: notification:read reaches every socket of the user only |
| AC-I18N-02 | 7 | i18n.spec.ts | AC-I18N-02 every visible text switches to English | pending | |
| AC-OPS-02 | 7 | ops.spec.ts | AC-OPS-02 seeded demo account | pending | |
