# Decision — docs-review-1

Coordinator's ruling on `reviews/docs-review-1.md`. The writer applies ONLY what is listed under "Fix instructions". Items marked SKIP are not to be touched.

## Ruling summary

| Item | Ruling | Note |
|---|---|---|
| M1 Phase 0 continuation | FIX | Workflow gets stuck otherwise |
| M2 ACs depending on later phases | FIX | Tests cannot pass at phase end |
| M3 Footer vs i18n | FIX | Two ACs contradict |
| M4 Multi-tab refresh race | FIX (simplified) | Server grace window only; no navigator.locks, no new AC step |
| M5 Missed notifications on reconnect | FIX (simplified) | Client behaviour only; no new AC step |
| M6 Trust proxy on Railway | FIX | Security / deployed app breaks |
| M7 Socket subscription limits | FIX (simplified) | Per-socket and global caps only; no per-socket event rate limit |
| M8 Builder must not edit SPEC | FIX | Protects the only measure the owner can use |
| m1 Secret hook false positives | FIX | Valid commits would be blocked |
| m2 SETTINGS duplicate + quota rule | FIX | BRIEF requirement |
| m3 Test DB not migrated | FIX | First `npm run check` fails |
| m4 AC-RT-05 5 s detection | FIX | AC otherwise impossible |
| m5 Partial index | FIX (simplest) | Remove the index |
| m6 Test endpoint condition mismatch | FIX | Two files contradict |
| m7 CI minutes | FIX (CI part only) | Owner handles GitHub billing separately |
| m8 AC-PROF-04 wording | SKIP | Passes in e2e; not worth an AC change |
| Dates in PROGRESS | FIX | Schedule already passed |
| Repo visibility | CHANGE (owner decision) | Public repo instead of private: unlimited free CI minutes |

## Fix instructions (for the doc writer)

```text
Revise the Crypto Alert docs. Apply ONLY the items below and change nothing else. Write back only the affected files. Keep all AC IDs and the total of 76 ACs. Keep CLAUDE.md under ~100 lines. Do NOT add new ACs or new AC steps.

1. Phase 0 continuation (PROMPTS.md §b, PROGRESS.md Phase 0, CLAUDE.md "Session hygiene"):
   - Add a row to the PHASE START settings table: "0 scaffold (any session after KICKOFF) | SETTINGS: Sonnet 5.5 + Medium, Plan mode ON".
   - In steps 2 and 4 add: "If N = 0: skip the v0.<N-1> tag check; branch phase-0-scaffold must already exist (created by KICKOFF); never run git init or create the GitHub repo again."
   - PROGRESS.md Phase 0 header: "prompt: Kickoff Prompt (first session), then Phase Start Prompt with N=0 for later sessions".

2. ACs that depend on later phases (SPEC.md):
   - AC-AUTH-06: replace "add a watchlist item → succeeds without re-login" with "on /account change the display name and save → succeeds without re-login (silent refresh)".
   - AC-AUTH-07: replace "watchlist/alerts panel shows login prompt" with "opening /account redirects to /login".
   - AC-PROF-05: delete "notification times also use UTC".

3. Footer vs i18n: in AC-I18N-02 change the exception to "except the two footer lines with data-testid footer-title and footer-course (the official title and 'Đồ án chuyên ngành — UIT', shown in Vietnamese in both languages)". Add footer-course to the data-testid list and the i18n exception in frontend/CONTEXT.md, and mention it in the ARCHITECTURE.md §11.1 footer row.

4. Multi-tab refresh race (ARCHITECTURE.md §6, API.md §3.1, DATABASE.md refresh_tokens notes) — server side only:
   - A refresh token that was rotated less than 10 seconds ago and is presented again is NOT treated as reuse: issue a new refresh token + access token for that user without revoking others. Reuse detection (revoke all) applies only after this grace window. Use existing revoked_at / replaced_by_id; no schema change.

5. Missed notifications after socket reconnect (API.md §4.3, ARCHITECTURE.md §3.4 and §4 "Client side"):
   - On every socket 'connect' (first connect and every reconnect, including after login/token refresh) a logged-in client invalidates ['notifications'] and ['alerts']; for unread notifications newer than the newest one already shown in this tab it shows the same toast as notification:new and updates the bell.

6. Rate limit behind Railway's proxy (ARCHITECTURE.md §6 and §10.1, API.md §3.1):
   - Add env var TRUST_PROXY_HOPS (default 0; set 1 on Railway). The backend sets Express 'trust proxy' to this value so req.ip is the real client IP; the throttler keys on req.ip. With 0, X-Forwarded-For is never trusted. Add it to the .env.example list.

7. Socket subscription limits (API.md §1.2 and §4.2, ARCHITECTURE.md §4, backend/CONTEXT.md "Real-time & worker", PROGRESS.md Phase 3):
   - Each socket may hold at most 2 kline subscriptions; a further kline:subscribe gets ack error SUBSCRIPTION_LIMIT_REACHED (add to the error-code table as socket-only). Global cap: at most 200 upstream kline streams; beyond that kline:subscribe gets MARKET_DATA_UNAVAILABLE.
   - Remove "(never reached)" from ARCHITECTURE.md §4. Add a Phase 3 checklist item: unit tests for these two caps.

8. Protect the acceptance criteria (CLAUDE.md conflict line and MUST NOT list, PROMPTS.md §b step 6, §c step 2):
   - Claude Code MUST NOT edit docs/SPEC.md (AC steps, thresholds, scope, IDs). If an AC looks wrong or impossible, it stops, explains in simple Vietnamese and waits for the owner. It may edit API.md / DATABASE.md / ARCHITECTURE.md only to resolve a contradiction, and must list every doc change in the PROGRESS.md log line.
   - Phase Review Prompt step 2: also run "git diff main...phase-<N>-<name> -- docs CLAUDE.md backend/CONTEXT.md frontend/CONTEXT.md"; any change to SPEC.md, or any contract change that makes an AC easier to pass, is a Major issue.

9. Secret hook (PROGRESS.md Phase 0, CLAUDE.md): the pre-commit secret check must allow .env.example, package-lock.json and **/fixtures/**. Add to CLAUDE.md MUST NOT: never use --no-verify.

10. SETTINGS lines (PROMPTS.md, PROGRESS.md):
   - Template first line becomes "SETTINGS: <paste the SETTINGS line for phase N from the table above>" (no duplicated "Plan mode ON").
   - Add the BRIEF quota rule where missing, including STUCK BUG: "near the weekly quota limit → Sonnet 5.5 + Medium for everything except Phase Review".

11. Test DB migration (CLAUDE.md commands, ARCHITECTURE.md §8, DATABASE.md §5): the integration-test script and the Playwright webServer run "prisma migrate deploy" against the test DATABASE_URL before running.

12. AC-RT-05 detection speed (ARCHITECTURE.md §4 "Client side"): the client listens to window 'offline'/'online' — shows the banner and calls socket.disconnect() on offline, socket.connect() on online. Server Socket.IO options: pingInterval 10000, pingTimeout 5000.

13. Partial index (DATABASE.md §3.1 and §5): remove notifications_unread_idx entirely; a normal Prisma @@index on (user_id, read_at) is enough.

14. Test endpoints (ARCHITECTURE.md §8): make the activation condition match API.md §3.8 (ENABLE_TEST_ENDPOINTS=true AND MARKET_DATA_PROVIDER=mock).

15. CI minutes (ARCHITECTURE.md §9): CI uses concurrency { group: ci-${{ github.ref }}, cancel-in-progress: true } and caches npm and Playwright browsers.

16. Schedule (PROGRESS.md): shift all phase target dates so Phase 0 starts 2026-11-24, keeping the same relative durations. State the resulting end date of the last phase.

17. Repo visibility (owner decision; CLAUDE.md, PROGRESS.md Phase 0, PROMPTS.md KICKOFF, ARCHITECTURE.md ADR-13): the GitHub repository is PUBLIC, not private. Replace every "private repo" mention accordingly. Keep all secret protections unchanged (.env ignored, only .env.example committed, secret check before every commit, no --no-verify); add to CLAUDE.md: "The repo is public — a committed secret is exposed immediately; if one is ever committed, stop and tell the owner so the secret can be rotated."

At the end, list in Vietnamese (3–5 lines) which files you changed and the new end date.
```

## Recheck (for the reviewer, after the writer finishes)

```text
Recheck only the 17 items in ~/Projects/crypto-alert/reviews/docs-review-1.decision.md against the current docs: for each, DONE or NOT DONE (with file + line). Also report any NEW contradiction these edits introduced. Do not re-review anything else. Save to ~/Projects/crypto-alert/reviews/docs-review-1-recheck.md
```
