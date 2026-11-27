# Decision — Phase 6b review (VERDICT: FAIL, 1 Major + 7 Minor)

Date: 2026-11-28 · Decided by: project coordinator (on behalf of the owner) · Source: reviews/phase-6b-review.md

## Rulings
| # | Issue | Ruling |
|---|---|---|
| 1 | MAJOR: AC-NOTIF-06 waits 5 s (SPEC: 2 s); TRACEABILITY says "≤ 5 s"; not declared | **Fix now** exactly as the review says: `Date.now() + 2000` in e2e/tests/notifications-page.spec.ts:49 and "≤ 2 s" in TRACEABILITY. App already passes at 2 s (reviewer ran it 3/3). |
| 2 | TRACEABILITY summary line + AC-UI-09 note stale | **Fix now** as the review says (use the CI run id of the final green run). |
| 3 | PROGRESS Status row 6b says "not started" | **Fix now**: `built, awaiting recheck` (the merge sets `done`). |
| 4 | Coin range chips differ from the trade timeframe chips | **Fix now**: same className as TimeframeBar (review §4). |
| 5 | Big coin price colored + `text-5xl` (not a token) | **Fix now**: token `--text-coin-price: 48px`, class `font-mono text-coin-price font-semibold leading-none text-text` (review §5). |
| 6 | AC-UI-09 test does not click guest "Thông báo" | **Fix now**: add the 4 lines from review §6. |
| 7 | AC-COIN-01 test does not assert `coin-change-abs` | **Fix now**: add the `signed` helper + assertion from review §7. |
| 8 | frontend/CONTEXT.md query keys miss the coin-page key | **Fix now**: doc line from review §8. |

All fixes are small; no SPEC edit, no new AC. Tests only get stricter.

## Fix instructions (builder, one session)
SETTINGS: Sonnet 5.5 + Medium, Plan mode ON (show a 5-line plan, then auto mode).

On branch phase-6b-pages (working tree: only reviews/phase-6b-review.md and this file untracked; never stage AGENTS.md):
1. Issue 1 → commit `test(e2e): restore the 2 s threshold in AC-NOTIF-06` (test + TRACEABILITY line in the same commit). Run `npm run test:e2e -- -g "AC-NOTIF-06" --repeat-each 3`. If it fails, stop and explain in Vietnamese — do NOT raise the threshold and do not add sleeps/retries.
2. Issues 4 + 5 → commit `fix(frontend): match coin range chips and price to the design` (token in tokens.css).
3. Issues 6 + 7 → commit `test(e2e): cover guest notifications link and coin absolute change`.
4. Issues 2, 3, 8 → commit `docs: sync traceability, progress and context after 6b review`.
5. `git add reviews/phase-6b-review.md reviews/phase-6b-review.decision.md` → commit `docs: add phase 6b review and decision`.
6. `npm run check` + local smoke run (db:migrate, db:seed, npm run dev, /api/v1/health); stop every server you started (3000/5173/5555/3100 free). Push; wait for CI green on the latest commit; then update the TRACEABILITY summary run id if it changed (commit `docs: update traceability ci run`) and push again.
7. One dated log line in PROGRESS Phase 6b (model + effort, issues fixed, last commit, CI). Do NOT merge. End with a 3-line Vietnamese summary.

## Recheck (paste into a NEW chat in the Review project, Opus 5.5 + High, ask before edits)
```text
Recheck Phase 6b of crypto-alert on branch phase-6b-pages (folder ~/Projects/crypto-alert). Read-only; the only file you may create is reviews/phase-6b-recheck.md.
1. Read reviews/phase-6b-review.md and reviews/phase-6b-review.decision.md.
2. For each of the 8 issues, verify the fix in the diff since 510efe6 (git diff 510efe6..HEAD): exactly as ruled, nothing weakened, no unrelated changes. Issue 1 must use 2000 ms; TRACEABILITY says ≤ 2 s.
3. CI: latest run on the branch green and for the latest commit (gh run list --branch phase-6b-pages --limit 3). Run what npm run check you can; rely on CI for the rest.
4. Commit messages: Conventional Commits, no AI attribution.
Write reviews/phase-6b-recheck.md: VERDICT: PASS or FAIL; one line per issue (fixed / not fixed + reason); new problems only if Blocker/Major; 2–3 lines of summary in simple Vietnamese.
```

## Merge (builder, after the recheck says PASS)
SETTINGS: Sonnet 5.5 + Medium, Plan mode OFF, auto mode. Prompt: "Read reviews/phase-6b-review.decision.md and run its Merge block."
0. `git add reviews/phase-6b-recheck.md` → commit `docs: add phase 6b recheck`, push, wait for CI green.
1–7. Run docs/PROMPTS.md section e with N=6b, branch phase-6b-pages, merge message `chore: merge phase 6b pages`, tag **v0.6.2** ("Phase 6b complete") instead of v0.N. Step 4: if CI on main is red, stop and show me the failing test — do not revert. Step 6: `railway up` is blocked in auto mode — stop and ask the owner to run, in a separate terminal tab, `cd ~/Projects/crypto-alert && git status && railway up --ci -s web` (must be on main, clean). When the owner says the build succeeded, wait for the deployment to become healthy, then check on the live URL: GET /api/v1/health (ok, binance, connected true); GET /coin/BTCUSDT and /alerts return the SPA (200, HTML); POST /api/v1/test/reset → 404. Step 7: merge log line under the Phase 6b log, Phase 6b state "done".
Do not change docs/SPEC.md. Do not weaken any existing assertion.
