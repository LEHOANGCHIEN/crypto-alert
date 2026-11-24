# Decision — Phase 2 review (VERDICT: PASS, 4 Minor)

Date: 2026-11-24 · Decided by: project coordinator (on behalf of the owner) · Source: reviews/phase-2-review.md

## Rulings
| # | Issue | Ruling |
|---|---|---|
| 1 | AC-MKT-05: row click from a URL without `?tf=` navigates to `/trade/ETHUSDT` without `?tf=1h` | **Fix now** (SPEC says `?tf=<current tf>`; cheap). Strengthen the AC-MKT-05 test. |
| 2 | AC-CHART-06: time-axis timezone not covered by e2e | **Fix now** (cheap, SPEC names the time axis). Use the reviewer's `data-timezone` approach. |
| 3 | AC-THEME-02: chart text color not covered by e2e | **Fix now** (cheap, SPEC names "text"). Use the reviewer's `data-chart-text` approach. |
| 4 | `GET /market/klines` has no rate limit | **Defer to Phase 7** (not required by SPEC; low risk at project scale). Add a Phase 7 checklist item now (see step 0.4). |

Not an issue: the leftover `node_modules/.vitest-cache.tmp-*` folder from the review sandbox — ignore.

## Fix-and-merge block (builder, one session)
SETTINGS: Sonnet 5.5 + Medium, Plan mode OFF, auto mode.

0. On branch phase-2-market-chart:
   0.1 AC-MKT-05: in frontend/src/features/market/MarketList.tsx, row select ALWAYS navigates to `/trade/<SYMBOL>?tf=<current tf>`, where current tf = the parsed `tf` query param or the default `1h` (reuse the existing interval parser). In e2e/tests/market.spec.ts, extend the existing AC-MKT-05 test (do not add a second test with that ID): open `/trade/BTCUSDT` with no `tf`, click the ETHUSDT row, assert the URL ends with `/trade/ETHUSDT?tf=1h`; keep the existing `?tf=15m` case. Commit: `fix(frontend): keep current timeframe in URL when selecting a pair`.
   0.2 AC-CHART-06: CandleChart writes the timezone used by its time/tick-mark formatters to `data-timezone` on the `chart-root` element. Extend the existing AC-CHART-06 test to assert `data-timezone="Asia/Ho_Chi_Minh"` for a guest, and the existing AC-PROF-05 test to assert `data-timezone="UTC"` after saving UTC. Commit: `test(e2e): verify chart time axis timezone`.
   0.3 AC-THEME-02: publishChartColors also sets `data-chart-text` (the chart text color). Extend the existing AC-THEME-02 test to assert `data-chart-text` equals the resolved `--color-text-muted` token in both dark and light themes. Commit: `test(e2e): verify chart text color follows theme`.
   0.4 docs/PROGRESS.md, Phase 7 checklist: add the unticked item `- [ ] Throttle GET /market/klines per client IP (@nestjs/throttler, RATE_LIMITED + Retry-After; update API.md §3.3 errors and ARCHITECTURE security row) — from reviews/phase-2-review.decision.md R4`. Update docs/TRACEABILITY.md only if a test title changed (it should not). Add one Phase 2 log line listing 0.1–0.4.
   0.5 Commit the untracked review files: `git add reviews/phase-2-review.md reviews/phase-2-review.decision.md reviews/phase-2-ui-01-bell.decision.md` → `docs: add phase 2 review and decisions`.
   0.6 `npm run check` must pass locally, plus the local smoke run from CLAUDE.md DoD item 2. Push; wait for CI green on the latest commit (`gh run watch`). If anything fails, stop and explain in Vietnamese — do not merge.
1–7. Then run docs/PROMPTS.md section e (MERGE PROMPT) with N=2, name=market-chart, exactly as written.

Do not change docs/SPEC.md. Do not weaken any existing assertion.

## For the Phase 7 reviewer
Check that the R4 throttle item exists, is implemented, and is tested.
