# Decision — Phase 6a review (VERDICT: PASS, 4 Minor)

Date: 2026-11-26 · Decided by: project coordinator (on behalf of the owner) · Source: reviews/phase-6a-review.md

## Rulings
| # | Issue | Ruling |
|---|---|---|
| 1 | `text-white` on the Register button (Header.tsx:63) and the guest login link in the Watchlist tab (MarketList.tsx:125): not a token, 3.68:1 contrast on accent | **Fix now**: `text-bg` in both places. |
| 2 | frontend/CONTEXT.md misses `panel-expand-left|right` | **Fix now** (doc only). |
| 3 | Pulse bar clips XRP and hides DOGE at 1024 px (AC-UI-07 requires all 6 items from 1024 px up) | **Fix now**: below `xl` hide the "market pulse" label and reduce the gap so all 6 items fit at 1024 px; keep `overflow-x-auto` with hidden scrollbar as a safety net for long real prices. Add a 1024×768 step to the AC-UI-07 test: all six `pulse-item-*` are fully inside `pulse-bar` (bounding boxes). |
| 4 | AC-CHART-09 checks `chart-change` only by regex; "unknown → no name" only covered by unit test | **Fix now**: assert `chart-change` text equals the vi-formatted `priceChangePercent` of the mock ticker (same approach as `chart-change-abs`). Keep "unknown → no name" in the unit test and write in TRACEABILITY Notes: "unknown-name case covered by coin-names.test.ts (mock has no USDT pair outside the map)". |
| D | Builder deviations (text-faint #7D8997 for contrast, AC-CHART-08 tick + close-candle, `data-live` waits, token-value updates in theme/market tests, AC-NOTIF-03 wait) | All accepted as assessed in the review. |
| — | Guest header at 390 px shows "Đăng" for both buttons (pre-existing on v0.6) | Not this phase → Phase 7 "mobile pass at 390 px". |

## Fix-and-merge block (builder, one session)
SETTINGS: Sonnet 5.5 + Medium, Plan mode OFF, auto mode.

0. On branch phase-6a-ui-redesign:
   0.1 Issue 1 → commit `fix(frontend): use token text color on accent buttons`.
   0.2 Issue 3 (code + test step) → commit `fix(frontend): fit market pulse bar at 1024 px`.
   0.3 Issue 4 → commit `test(e2e): assert chart change percent value in AC-CHART-09` (TRACEABILITY note in the same commit).
   0.4 Issue 2 → commit `docs(frontend): list panel expand test ids`.
   0.5 docs/PROGRESS.md Phase 6a: one log line listing 0.1–0.4 and this decision.
   0.6 `git add reviews/phase-6a-review.md reviews/phase-6a-review.decision.md` → `docs: add phase 6a review and decision`. Never stage AGENTS.md.
   0.7 `npm run check` passes locally + the local smoke run; stop every server you started (nothing left on 3000/5173/5555). Push; wait for CI green on the latest commit. If anything fails, stop and explain in Vietnamese — do not merge. A flaky test is fixed by waiting for the right state, never by sleeps/retries/longer timeouts.
1–7. Then run docs/PROMPTS.md section e (MERGE PROMPT) with N=6a, branch phase-6a-ui-redesign, merge message `chore: merge phase 6a ui-redesign`, and tag **v0.6.1** ("Phase 6a complete") instead of v0.N. Step 4: if CI on main is red, stop and show me the failing test — do not revert. Step 6: `railway up` is blocked in auto mode — stop and ask the owner to run, in a separate terminal tab, `cd ~/Projects/crypto-alert && git status && railway up --ci -s web` (must be on main). When the owner says the build succeeded, wait for the deployment to become healthy, then check on the live URL: GET /api/v1/health (status ok, provider binance, connected true); GET / returns the SPA (200, HTML); POST /api/v1/test/reset → 404. Step 7: put the merge log line under the Phase 6a log and set Phase 6a state to "done".

Do not change docs/SPEC.md. Do not weaken any existing assertion.
