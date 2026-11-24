# Decision — Phase 3 review (VERDICT: PASS, 4 Minor)

Date: 2026-11-25 · Decided by: project coordinator (on behalf of the owner) · Source: reviews/phase-3-review.md

## Rulings
| # | Issue | Ruling |
|---|---|---|
| 1 | API.md `POST /test/reset` Effect column out of date; log line says "No doc contract changes" | **Fix now.** API.md edit authorized (test endpoint row only). |
| 2 | Client does not reconnect after `io server disconnect` (only reachable via /test/reset) | **Fix now** (cheap). |
| 3 | No handshake timeout: a hung connect to Binance is not retried within 30 s (ARCHITECTURE §4 watchdog) | **Fix now** — this is an ARCHITECTURE §4 requirement. |
| 4 | Missing unit tests: backoff growth across consecutive failures; backoff reset after 60 s healthy | **Fix now** (unit tests only). |

## Fix-and-merge block (builder, one session)
SETTINGS: Sonnet 5.5 + Medium, Plan mode OFF, auto mode.

0. On branch phase-3-realtime:
   0.1 docs/API.md `POST /test/reset` Effect: add "disconnect all Socket.IO clients, drop all kline subscriptions (upstream unsubscribed immediately) and the pending/last-sent `tickers:update` state". Commit: `docs(api): document socket reset in POST /test/reset`.
   0.2 frontend/src/shared/socket/socket.ts: the `disconnect` handler takes `reason`; if `reason === 'io server disconnect'` and `navigator.onLine`, call `s.connect()`. Fix the wrong comment in backend/src/modules/realtime/realtime.service.ts. Add a small unit test if cheap. Commit: `fix(frontend): reconnect socket after server-side disconnect`.
   0.3 backend binance-ws.client.ts: create the socket with `new WebSocket(url, { handshakeTimeout: <watchdog ms> })` (or arm the watchdog before `open`, whichever is simpler) so a hung handshake is retried within 30 s. Unit test: a fake server that accepts TCP but never completes the WS handshake (or an unresponsive port) → the client schedules a reconnect. Use a small injected timeout in the test, no long real waits. Commit: `fix(market): time out a hung upstream handshake`.
   0.4 binance-ws.client.spec.ts: add (a) backoff grows 1 s → 2 s → 4 s across consecutive failures (`random: () => 0.5`), (b) backoff resets to ~1 s after a connection stays healthy past `healthyResetMs` (inject a small value). Use fake timers or small injected durations. Commit: `test(market): cover backoff growth and healthy reset`.
   0.5 docs/PROGRESS.md: correct the Phase 3 log line ("No doc contract changes" → list the API.md §3.8 edit) and add one line listing 0.1–0.4.
   0.6 `git add reviews/phase-3-review.md reviews/phase-3-review.decision.md` → `docs: add phase 3 review and decision`.
   0.7 `npm run check` passes locally + the local smoke run (CLAUDE.md DoD item 2). Push; wait for CI green on the latest commit. If anything fails, stop and explain in Vietnamese — do not merge. A flaky e2e test is fixed by waiting for the right state, never by sleeps/retries/longer timeouts.
1–7. Then run docs/PROMPTS.md section e (MERGE PROMPT) with N=3, name=realtime. Step 6: `railway up` is blocked in auto mode — stop and ask the owner to run `! railway up --ci -s web`; after that, check /api/v1/health on the live URL and that a Socket.IO connection to the live URL receives `tickers:update` (or explain how you verified live updates). Step 7: put the merge log line under the Phase 3 log, not another phase.

Do not change docs/SPEC.md. Do not weaken any existing assertion.
