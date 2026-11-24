# Decision — Phase 4 review (VERDICT: PASS, 2 Minor)

Date: 2026-11-25 · Decided by: project coordinator (on behalf of the owner) · Source: reviews/phase-4-review.md

## Rulings
| # | Issue | Ruling |
|---|---|---|
| 1 | AC-IND-05 only asserts the colour of the last histogram bar (negative in the fixture), so the "green ≥ 0" branch is untested | **Fix now** (cheap, test-only strengthening). |
| 2 | Commit `3ee1a97` contains only tests but is typed `feat:` | **No action.** History is not rewritten. From now on a commit that contains only tests uses `test:`. |
| D1–D7 | Builder-declared deviations | All accepted as assessed in the review. |
| Item 8 | Owner TradingView comparison | The owner does it before this block is pasted; the builder ticks it. |

## Fix-and-merge block (builder, one session)
SETTINGS: Sonnet 5.5 + Medium, Plan mode OFF, auto mode.

0. On branch phase-4-indicators:
   0.1 frontend/src/features/chart/indicator-layers.ts (`IndicatorLayers.publish`): from `this.macd.hist.data()` publish two extra attributes: `data-hist-up-color` = colour of the most recent bar with `value >= 0`, `data-hist-down-color` = colour of the most recent bar with `value < 0` (empty string if none). e2e/tests/indicators.spec.ts AC-IND-05: additionally assert `data-hist-up-color` equals `cssVar('--color-up')` and `data-hist-down-color` equals `cssVar('--color-down')` (the 1000-candle fixture has both signs; if it somehow does not, stop and explain in Vietnamese). Keep every existing assertion. Commit: `test(e2e): assert both MACD histogram colours`.
   0.2 docs/PROGRESS.md Phase 4: tick item 8 (owner TradingView check) with "(owner-confirmed 2026-11-25)" and add one log line listing 0.1 and this decision.
   0.3 `git add reviews/phase-4-review.md reviews/phase-4-review.decision.md` → `docs: add phase 4 review and decision`.
   0.4 `npm run check` passes locally + the local smoke run (CLAUDE.md DoD item 2). Push; wait for CI green on the latest commit. If anything fails, stop and explain in Vietnamese — do not merge. A flaky e2e test is fixed by waiting for the right state, never by sleeps/retries/longer timeouts.
1–7. Then run docs/PROMPTS.md section e (MERGE PROMPT) with N=4, name=indicators. Step 6: `railway up` is blocked in auto mode — stop and ask the owner to run, in a separate terminal tab, `cd ~/Projects/crypto-alert && git status && railway up --ci -s web` (must be on main, clean). When the owner says the build succeeded, wait for the deployment to become healthy, check GET /api/v1/health on the live URL (status ok, provider binance, connected true) and that the live page serves the new frontend bundle (e.g. the built JS contains the indicators menu i18n key or the `crypto-alert.indicators` storage key). Step 7: put the merge log line under the Phase 4 log, not another phase.

Do not change docs/SPEC.md. Do not weaken any existing assertion.
