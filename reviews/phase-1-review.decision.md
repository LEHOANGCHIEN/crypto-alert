# Phase 1 — Decision (coordinator)

Date: 2026-11-24 · Review: `reviews/phase-1-review.md` (VERDICT: FAIL, 1 Major + 6 Minor) · Branch: `phase-1-auth`

## Rulings

| # | Item | Ruling |
|---|---|---|
| R1 | Issue 1 (Major) default timezone `Asia/Ho_Chi_Minh` rejected by `isValidTimezone` (`Intl.supportedValuesOf` has only canonical names) → account preferences cannot be saved | **FIX.** Validate with `Intl.DateTimeFormat`; account select always contains the current value, `Asia/Ho_Chi_Minh` and `UTC`. The docs/API.md §1.3 `INVALID_TIMEZONE` row edit is AUTHORIZED by this decision. SPEC unchanged (SPEC is right). Add tests. |
| R2 | Issue 2 (Minor) AC-AUTH-03 test does not prove errors appear before submit | **FIX** (strengthen the test; cheap). |
| R3 | Issue 3 (Minor) AC-AUTH-07 test does not check the Register button | **FIX** (strengthen the test; cheap). |
| R4 | Issue 4 (Minor, security config) `COOKIE_SECURE` / `TRUST_PROXY_HOPS` on Railway | **FIX by configuration, no code change.** Set `COOKIE_SECURE=true` and `TRUST_PROXY_HOPS=1` on Railway service `web` now. No new env `.refine` (simpler; avoids breaking any test run that uses NODE_ENV=production). |
| R5 | Issue 5 (Minor) decision file not committed | **FIX:** commit all of `reviews/`. |
| R6 | Issue 6 (Minor) fewer commits than checklist items | **No change to history** (forbidden). Apply the rule from Phase 2 on. |
| R7 | Issue 7 (Minor) `features/account` imports `features/auth` internals | **FIX** (cheap): move the session store to `frontend/src/shared/auth/` and the error-text helpers to `frontend/src/shared/i18n/`; update all imports. |
| — | Refresh-token doc edits, `@nestjs/jwt` 11.0.2 | Accepted (see `reviews/phase-1-refresh-token.decision.md`). |
| — | `npm audit` highs in the Prisma CLI chain | Out of scope; handled in the Phase 7 security pass. |

## Fix instructions

```text
SETTINGS: Sonnet 5.5 + Medium, Plan mode ON

You are the builder. Work on branch phase-1-auth. Read CLAUDE.md, docs/SPEC.md, docs/API.md, docs/ARCHITECTURE.md, docs/PROGRESS.md, docs/TRACEABILITY.md, backend/CONTEXT.md, frontend/CONTEXT.md, reviews/phase-1-review.md, reviews/phase-1-refresh-token.decision.md and this file. Apply the items below exactly, in order. This decision AUTHORIZES only the docs/API.md edit in item 1c; do not edit docs/SPEC.md. Never force-push, rewrite history, or amend old commits. Never weaken or skip a test. Run npm run secrets:check before every commit. Conventional Commits, one commit per item; no Co-Authored-By / "Generated with" / mention of Claude or AI in any commit, tag or PR.

1. Timezone validation (review issue 1, Major):
   a. backend/src/common/validators.ts isValidTimezone: return true when the value is a string, length 1..64, and `new Intl.DateTimeFormat('en-US', { timeZone: value })` does not throw; otherwise false. This accepts IANA aliases such as Asia/Ho_Chi_Minh and UTC. Do not use Intl.supportedValuesOf for validation anywhere in the backend.
   b. frontend/src/features/account/AccountPage.tsx: build the timezone options as a sorted, de-duplicated list of ['UTC', 'Asia/Ho_Chi_Minh', <the user's current timezone>, ...Intl.supportedValuesOf('timeZone')], so the select always shows the user's real current value. Keep all labels through i18n where they are user-facing text.
   c. docs/API.md §1.3, row INVALID_TIMEZONE: change the description to "Not a valid IANA timezone name (rejected by `Intl.DateTimeFormat`; aliases such as `Asia/Ho_Chi_Minh` and `UTC` are valid)".
   d. Tests: backend unit test for isValidTimezone ('Asia/Ho_Chi_Minh' → true, 'Asia/Saigon' → true, 'UTC' → true, 'Mars/Base' → false, '' → false, 65-char string → false). Integration tests: PATCH /api/v1/users/me/settings with { timezone: 'Asia/Ho_Chi_Minh' } → 200; with { locale: 'en', theme: 'light', timezone: 'Asia/Ho_Chi_Minh' } → 200 and the response contains those values; with { timezone: 'Mars/Base' } → 400 VALIDATION_ERROR with issue code INVALID_TIMEZONE. Do not add a new Playwright AC test and do not change any AC ID.
   Commit "fix(users): accept IANA timezone aliases such as Asia/Ho_Chi_Minh".

2. AC-AUTH-03 test (review issue 2): in e2e/tests/auth.spec.ts, BEFORE clicking submit-register, move focus out of the email field and the password field (blur or focus the next field) and assert error-email and error-password show their exact Vietnamese texts from SPEC/i18n. Keep the existing after-submit assertions and the registerCalls === 0 check. If the assertion fails, fix the app (validation on blur), not the test. Commit "test(e2e): check AC-AUTH-03 field errors appear before submit".

3. AC-AUTH-07 test (review issue 3): after logout, also assert the header shows the Register link/button (exact Vietnamese label from vi.json) as well as Login. Commit "test(e2e): check both header buttons after logout in AC-AUTH-07".

4. Feature boundaries (review issue 7): move frontend/src/features/auth/auth.store.ts to frontend/src/shared/auth/auth.store.ts and frontend/src/features/auth/messages.ts to frontend/src/shared/i18n/errorText.ts (keep exported names). Update every import (app/, main.tsx, features/auth/*, features/account/*). No behaviour change. Commit "refactor(frontend): move shared auth store and error texts to shared".

5. Railway variables (review issue 4): with the Railway CLI already linked to project fearless-growth / environment production, set on service web: COOKIE_SECURE=true and TRUST_PROXY_HOPS=1. Check the exact CLI syntax with `railway variables --help` first; do not guess flags. If the CLI cannot do it, STOP and give the owner simple Vietnamese steps (Railway → service web → tab Variables → add/edit the two variables → apply/deploy) and wait for "xong". Then confirm with `railway variables` (print only these two names and values; never print secrets) and check https://web-production-49fda79f.up.railway.app/api/v1/health → db up, provider binance, connected true. No code or docs change for this item (ARCHITECTURE §10.1 already says these values).

6. git add reviews/ (all files, including this decision and phase-1-refresh-token.decision.md and phase-1-review.md). Commit "docs: add phase 1 review and decision records".

7. Definition of Done: npm run check passes; push; CI green on phase-1-auth for the latest commit; TRACEABILITY unchanged except statuses if needed; docs/PROGRESS.md gets one dated log line: model + effort, "applied reviews/phase-1-review.decision.md", doc changes (API.md §1.3 INVALID_TIMEZONE), Railway vars set (names only), last commit hash, CI run. End with "Cách kiểm tra thủ công" in simple Vietnamese: run the app locally, log in with the demo account, open /account, change language/theme and keep timezone Hồ Chí Minh → Save → success, no error toast; the timezone select shows Asia/Ho_Chi_Minh. Tell the owner the next step is the Recheck in the Review project. Do not merge.
```

## Recheck (paste into the Review project after the builder finishes)

```text
Recheck Phase 1 of crypto-alert on branch phase-1-auth (~/Projects/crypto-alert). Read-only; the only file you may create is reviews/phase-1-recheck.md.
Read reviews/phase-1-review.md, reviews/phase-1-review.decision.md and reviews/phase-1-refresh-token.decision.md. For each item 1–7 of the decision's Fix instructions, verify it was done exactly (git log/diff since c3758c7, files, CI via gh run list --branch phase-1-auth --limit 3, npm run check where the environment allows). The docs/API.md §1.3 INVALID_TIMEZONE edit is authorized — check it matches the decision; any docs/SPEC.md change is Major. Confirm with your own Node that the new isValidTimezone accepts Asia/Ho_Chi_Minh, Asia/Saigon, UTC and rejects Mars/Base, and that no test was weakened (compare AC-AUTH-03 and AC-AUTH-07 before/after). Check the refactor left no feature importing another feature's internals. Live app https://web-production-49fda79f.up.railway.app (still Phase 0 code): /api/v1/health → db up, provider binance, connected true; POST /api/v1/test/reset → 404. You cannot see Railway variables: accept the builder's PROGRESS log line for item 5 and say so. Check new commit messages have no Co-Authored-By / "Generated with" / Claude / AI.
Write: VERDICT: PASS or FAIL (PASS only if no Blocker/Major), Issues (numbered, severity, file:line, 1–2 sentences simple Vietnamese), Tóm tắt cho chủ dự án (3–5 lines Vietnamese). Do not write a fix prompt.
```
