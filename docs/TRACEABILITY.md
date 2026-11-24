# TRACEABILITY — AC → automated test → status

> Claude Code updates this file in the same commit that adds/changes a test. Status values: `pending` (no test yet) · `passing` (green locally **and** in CI) · `failing` (test exists, red) · `flaky` (must be fixed before review).
> Test title must start with the AC ID exactly, e.g. `test('AC-AUTH-01 register success', …)`. Run one: `npm run test:e2e -- -g "AC-AUTH-01"`.
> Supporting unit/integration tests may be listed in Notes, but an AC is `passing` only when its Playwright test is.

**Summary:** 76 ACs · passing 27 · failing 0 · pending 49 · last CI run: green on phase-1-auth (2026-11-24)

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
| AC-MKT-05 | 2 | market.spec.ts | AC-MKT-05 row click opens chart | pending | |
| AC-MKT-06 | 2 | market.spec.ts | AC-MKT-06 unknown pair shows not found | pending | |
| AC-CHART-01 | 2 | chart.spec.ts | AC-CHART-01 chart renders with attribution logo | pending | |
| AC-CHART-02 | 2 | chart.spec.ts | AC-CHART-02 timeframe switch and URL sync | pending | |
| AC-CHART-03 | 2 | chart.spec.ts | AC-CHART-03 loads 1000 candles | pending | |
| AC-CHART-04 | 2 | chart.spec.ts | AC-CHART-04 second load uses candle cache | pending | |
| AC-CHART-05 | 2 | chart.spec.ts | AC-CHART-05 legend shows hovered candle | pending | |
| AC-CHART-06 | 2 | chart.spec.ts | AC-CHART-06 times shown in user timezone | pending | |
| AC-PROF-05 | 2 | account.spec.ts | AC-PROF-05 timezone setting changes displayed times | pending | |
| AC-I18N-04 | 2 | i18n.spec.ts | AC-I18N-04 number and date formats follow locale | pending | |
| AC-THEME-02 | 2 | theme.spec.ts | AC-THEME-02 toggle applies to page and chart | pending | |
| AC-UI-01 | 2 | layout.spec.ts | AC-UI-01 desktop three-column layout | passing | Header bell is built in Phase 6 (AC-NOTIF-01); checked here: logo, language, theme, login/register, footer |
| AC-UI-02 | 2 | layout.spec.ts | AC-UI-02 mobile bottom tabs | passing | |
| AC-MKT-03 | 3 | market.spec.ts | AC-MKT-03 live ticker updates row | pending | |
| AC-RT-01 | 3 | realtime.spec.ts | AC-RT-01 open candle updates live | pending | |
| AC-RT-02 | 3 | realtime.spec.ts | AC-RT-02 closed candle starts a new one | pending | |
| AC-RT-03 | 3 | realtime.spec.ts | AC-RT-03 subscriptions follow the viewed chart | pending | |
| AC-RT-04 | 3 | realtime.spec.ts | AC-RT-04 shared upstream subscription ref-count | pending | |
| AC-RT-05 | 3 | realtime.spec.ts | AC-RT-05 browser reconnect banner and resync | pending | |
| AC-RT-06 | 3 | realtime.spec.ts | AC-RT-06 upstream disconnect badge and recovery | pending | |
| AC-IND-01 | 4 | indicators.spec.ts | AC-IND-01 default MA lines | pending | |
| AC-IND-02 | 4 | indicators.spec.ts | AC-IND-02 toggle and change MA period persists | pending | |
| AC-IND-03 | 4 | indicators.spec.ts | AC-IND-03 invalid period rejected | pending | |
| AC-IND-04 | 4 | indicators.spec.ts | AC-IND-04 RSI pane | pending | |
| AC-IND-05 | 4 | indicators.spec.ts | AC-IND-05 MACD pane | pending | |
| AC-IND-06 | 4 | indicators.spec.ts | AC-IND-06 values match golden file | pending | |
| AC-IND-07 | 4 | indicators.spec.ts | AC-IND-07 indicators update live | pending | |
| AC-WL-01 | 5 | watchlist.spec.ts | AC-WL-01 star adds pair to watchlist | pending | |
| AC-WL-02 | 5 | watchlist.spec.ts | AC-WL-02 remove from watchlist | pending | |
| AC-WL-03 | 5 | watchlist.spec.ts | AC-WL-03 watchlist persists across reload and browsers | pending | |
| AC-WL-04 | 5 | watchlist.spec.ts | AC-WL-04 watchlist prices update live | pending | |
| AC-WL-05 | 5 | watchlist.spec.ts | AC-WL-05 watchlist row opens chart | pending | |
| AC-WL-06 | 5 | watchlist.spec.ts | AC-WL-06 guest sees login prompt | pending | |
| AC-WL-07 | 5 | watchlist.spec.ts | AC-WL-07 isolation, no duplicates, limit 50 | pending | |
| AC-ALERT-01 | 6 | alerts.spec.ts | AC-ALERT-01 create alert | pending | |
| AC-ALERT-02 | 6 | alerts.spec.ts | AC-ALERT-02 alert validation and already-met | pending | |
| AC-ALERT-03 | 6 | alerts.spec.ts | AC-ALERT-03 above alert triggers toast within 5s | pending | |
| AC-ALERT-04 | 6 | alerts.spec.ts | AC-ALERT-04 below alert triggers toast within 5s | pending | |
| AC-ALERT-05 | 6 | alerts.spec.ts | AC-ALERT-05 alert is one-shot | pending | |
| AC-ALERT-06 | 6 | alerts.spec.ts | AC-ALERT-06 deleted alert never triggers | pending | |
| AC-ALERT-07 | 6 | alerts.spec.ts | AC-ALERT-07 active alert limit 20 | pending | |
| AC-ALERT-08 | 6 | alerts.spec.ts | AC-ALERT-08 alerts isolated between users | pending | |
| AC-ALERT-09 | 6 | alerts.spec.ts | AC-ALERT-09 alerts survive worker reload | pending | |
| AC-ALERT-10 | 6 | alerts.spec.ts | AC-ALERT-10 alert on a symbol not being viewed | pending | |
| AC-NOTIF-01 | 6 | notifications.spec.ts | AC-NOTIF-01 bell unread badge | pending | |
| AC-NOTIF-02 | 6 | notifications.spec.ts | AC-NOTIF-02 notification list content and order | pending | |
| AC-NOTIF-03 | 6 | notifications.spec.ts | AC-NOTIF-03 mark read and mark all read | pending | |
| AC-NOTIF-04 | 6 | notifications.spec.ts | AC-NOTIF-04 offline trigger shown on next login | pending | |
| AC-NOTIF-05 | 6 | notifications.spec.ts | AC-NOTIF-05 multi-tab delivery and read sync | pending | |
| AC-I18N-02 | 7 | i18n.spec.ts | AC-I18N-02 every visible text switches to English | pending | |
| AC-OPS-02 | 7 | ops.spec.ts | AC-OPS-02 seeded demo account | pending | |
