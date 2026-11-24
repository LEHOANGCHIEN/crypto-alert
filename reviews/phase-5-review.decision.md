# Decision — Phase 5 review (VERDICT: PASS, 8 Minor)

Date: 2026-11-25 · Decided by: project coordinator (on behalf of the owner) · Source: reviews/phase-5-review.md

## Rulings
| # | Issue | Ruling |
|---|---|---|
| 1 | Optimistic rollback (`useWatchlist.ts` onError) is not proven by any test | **Fix now** — the checklist item promises rollback; add a Vitest hook test. |
| 2 | Watchlist cache clear on user change (`WatchlistSession`) untested in the same browser | **Fix now** — data-leak guard; cover with a Vitest test (no new AC, no new Playwright test). |
| 3 | AC-WL-07 duplicate step uses seeded ETHUSDT | **Fix now** (cheap; makes the AC test exercise a real new add twice). |
| 4 | Limit check is count-then-create without a transaction (concurrent PUTs can exceed 50) | **No action.** Not a security issue, normal users cannot hit it; not required by SPEC/API (ruling rule 2). |
| 5 | e2e DB helper has no `_test` guard | **Fix now** (one guard). |
| 6 | frontend/CONTEXT.md testid list not updated | **Fix now** (doc only). |
| 7 | watchlist imports `market/PriceCell` (feature-internal import, against frontend/CONTEXT.md) | **Fix now** — move to shared, no behaviour change. |
| 8 | Two checklist items in one commit `ec62e65` | **No action.** History is not rewritten; follow the rule in later phases. |
| D | Builder-declared deviations | All accepted as assessed in the review. |

## Fix-and-merge block (builder, one session)
SETTINGS: Sonnet 5.5 + Medium, Plan mode OFF, auto mode.

0. On branch phase-5-watchlist:
   0.1 Move `frontend/src/features/market/PriceCell.tsx` to `frontend/src/shared/ui/PriceCell.tsx` (keep behaviour and testids identical); update imports in MarketList.tsx and WatchlistPanel.tsx. Commit: `refactor(frontend): move PriceCell to shared ui`.
   0.2 Vitest for `useWatchlist` (real QueryClient, mocked request layer): (a) PUT rejects with ApiError('WATCHLIST_LIMIT_REACHED') → the cached list equals the previous list right after onError and BEFORE any refetch (make the list query not refetch on its own in the test, e.g. a queryFn that is only called once / staleTime Infinity, and assert the queryFn call count did not grow before the assertion); (b) same for DELETE failing → the removed item is back. Commit: `test(frontend): cover watchlist optimistic rollback`.
   0.3 Vitest for `WatchlistSession`: with a QueryClient holding `['watchlist']` data for user A, changing the auth user to B (and to null on logout) removes the `['watchlist']` query data. Commit: `test(frontend): cover watchlist cache reset on user change`.
   0.4 e2e/tests/watchlist.spec.ts AC-WL-07: do the duplicate step with a pair NOT in the demo seed (e.g. XRPUSDT): two PUTs → panel shows exactly one XRPUSDT row and `panelSymbols` = ['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT']. Then do the 51st-item step with another mock pair that is not yet in the list. Keep every existing assertion of the limit step (translated toast, star stays empty, no row). Commit: `test(e2e): use a new pair for the AC-WL-07 duplicate step`.
   0.5 e2e/helpers/watchlist.ts `fillWatchlist`: before creating PrismaClient, throw an Error unless the database name in the URL ends with `_test` (`new URL(TEST_DB).pathname.endsWith('_test')`). Commit: `test(e2e): guard watchlist helper to test databases`.
   0.6 frontend/CONTEXT.md "Testing hooks": add `chart-star-<SYMBOL>` (chart header star; market row keeps `star-<SYMBOL>`), `watchlist-row-<SYMBOL>`, `watchlist-remove-<SYMBOL>`, `watchlist-price-<SYMBOL>`, `watchlist-change-<SYMBOL>`, `watchlist-empty`, `watchlist-login-prompt`, `watchlist-login-button` (use the exact ids in the code). Commit: `docs(frontend): list watchlist test ids`.
   0.7 docs/PROGRESS.md Phase 5: add one log line listing 0.1–0.6, the frontend/CONTEXT.md change, and that #4/#8 were accepted with no change.
   0.8 `git add reviews/phase-5-review.md reviews/phase-5-review.decision.md` → `docs: add phase 5 review and decision`.
   0.9 `npm run check` passes locally + the local smoke run (CLAUDE.md DoD item 2) — and stop every server you started afterwards (the owner found a leftover `node backend/dist/main` holding port 3000 after the last session; make sure nothing you start is left running). Push; wait for CI green on the latest commit. If anything fails, stop and explain in Vietnamese — do not merge. A flaky test is fixed by waiting for the right state, never by sleeps/retries/longer timeouts.
1–7. Then run docs/PROMPTS.md section e (MERGE PROMPT) with N=5, name=watchlist. Step 6: `railway up` is blocked in auto mode — stop and ask the owner to run, in a separate terminal tab, `cd ~/Projects/crypto-alert && git status && railway up --ci -s web` (must be on main, clean). When the owner says the build succeeded, wait for the deployment to become healthy, check GET /api/v1/health on the live URL (status ok, provider binance, connected true) and that GET /api/v1/watchlist on the live URL without a token now returns 401 UNAUTHENTICATED (not 404). Step 7: put the merge log line under the Phase 5 log, not another phase.

Do not change docs/SPEC.md. Do not weaken any existing assertion.
