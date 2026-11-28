# CLAUDE.md — Crypto Alert

Solo university project (UIT "đồ án chuyên ngành"): a deployed TradingView-style web app for crypto markets: market pages, real-time charts with indicators, watchlist, price alerts, news, community ideas and an AI assistant. **The owner is a beginner and cannot review code** — correctness is proven by Playwright tests (one per acceptance criterion), green CI, and Vietnamese manual-check lists.
Official title (exact, Vietnamese, in UI footer + README): **Xây dựng ứng dụng web theo dõi thị trường tiền mã hóa với biểu đồ kỹ thuật thời gian thực và cảnh báo giá**

## Stack
TypeScript everywhere · npm workspaces `backend/`, `frontend/`, `e2e/` · **BE** NestJS, Prisma, PostgreSQL 16, Socket.IO, `ws` · **FE** React + Vite, Tailwind v4 (design tokens), TanStack Query, React Router, react-i18next, Lightweight Charts v5 · **Tests** Jest (BE), Vitest (FE), Playwright (e2e) · **CI** GitHub Actions · **Hosting** Railway, Singapore region.

## Docs — read before coding
| File | Purpose |
|---|---|
| `docs/SPEC.md` | Scope, rules, acceptance criteria (AC IDs) |
| `docs/ARCHITECTURE.md` | Components, data flow, folders, UI guidelines, ADRs |
| `docs/API.md` | Exact REST + Socket.IO contracts and error codes |
| `docs/DATABASE.md` | Prisma schema (authoritative), migration & seed policy |
| `docs/PROGRESS.md` | Phases, checklists, session log |
| `docs/TRACEABILITY.md` | AC → test → status |
| `docs/design/v2/*.png` | Approved mockups (design source since Phase 7a) |
| `docs/DATA-SOURCES.md` | External data sources, quotas, caching, attribution (from Phase 7b) |
| `docs/AI.md` | LLM provider, tools, prompts, RAG, evaluation (from Phase 7d) |
| `reviews/*.decision.md` | Owner/coordinator decisions; they win over older docs for their phase |
| `backend/CONTEXT.md`, `frontend/CONTEXT.md` | Per-side coding rules |

Conflict order: API.md / DATABASE.md > SPEC.md > ARCHITECTURE.md > existing code. **Never edit `docs/SPEC.md`** (AC steps, thresholds, scope, IDs): if an AC looks wrong or impossible, stop, explain in simple Vietnamese and wait for the owner. Edit API.md / DATABASE.md / ARCHITECTURE.md only to resolve a contradiction, and list every doc change in the PROGRESS.md log line.

## Commands
```bash
docker compose up -d                    # Postgres: crypto_alert + crypto_alert_test
npm install && npm run db:migrate && npm run db:seed
npm run dev                             # backend :3000, frontend :5173 (Vite proxy → backend)
npm run check                           # typecheck + lint + unit + integration + e2e (local DoD)
                                        # integration + Playwright first run `prisma migrate deploy` on the test DB
npm run test:e2e -- -g "AC-ALERT-03"    # run one AC
npm run secrets:check                   # before every commit (also a pre-commit hook)
```

## Model & effort policy (the owner switches with `/model`; you cannot)
| Session type | Select |
|---|---|
| Routine phases: 0, 1, 2, 5, 6a, 6b, 7a, 7b, 7c, 7e, 8 | **Sonnet 5.5 + Medium** |
| Hard phases: 3, 4, 6, 7d news + AI base, 7f AI assistant | **Opus 5.5 + High** |
| End-of-phase review (fresh session, read-only) | **Opus 5.5 + High** |
| Same bug failed 2–3 times | **Opus 5.5 + Extra** (the effort level above High) |
| Anything else / unsure | **Sonnet 5.5 + Medium** |
| `/usage` near weekly limit | Everything **Sonnet 5.5 + Medium**, except the review session |

If the requested work belongs to a different row than the owner said they selected, warn in Vietnamese at the start and wait for confirmation.

## Hard rules
**MUST**
1. Build only what SPEC.md assigns to the current phase. Nothing from SPEC §1 "Out of scope".
2. Every user-facing string through i18n, key added to **both** `vi.json` and `en.json`:
   `✅ <button>{t('alerts.form.submit')}</button>` · `❌ <button>Create alert</button>`
3. Backend errors = codes from API.md only:
   `✅ throw new AppError('ALERT_NOT_FOUND')` · `❌ throw new NotFoundException('Alert not found')`
4. Routes, field names, event names exactly as API.md. IDs `Int`; prices `Decimal` in DB, `number` in JSON.
5. Timestamps UTC (ISO 8601 / epoch ms). Timezone + locale formatting only in `frontend/src/shared/format`.
6. Visual values only from tokens: `✅ className="bg-surface text-up"` · `❌ style={{ color: '#26A69A' }}`
7. Market data only through `MarketDataProvider`; every other external source (CoinGecko, Binance Futures, Fear & Greed, RSS, LLM/embeddings) only through its own provider interface in its backend module, each with a real and a **mock** implementation; tests and CI always use the mocks. Notifications only through `NotificationChannel`.
8. Schema change = new migration (`npx prisma migrate dev --name <what>`) + update DATABASE.md.
9. Each AC has exactly one Playwright test titled with its ID: `test('AC-WL-01 star adds pair to watchlist', …)`.
10. Config only from env vars via `ConfigService`; a new var goes into `.env.example` and ARCHITECTURE §10.1.

**MUST NOT**
- Let the browser call any external API (Binance, CoinGecko, RSS feeds, Gemini…) — only our backend · use `prisma db push` · use `BigInt` · edit an applied migration.
- Return `passwordHash` or token hashes: `✅ select: { id: true, email: true, displayName: true }`.
- Hard-code secrets, commit `.env*` (only `.env.example`), or enable test endpoints in production.
- Render user-generated content as raw HTML (no `dangerouslySetInnerHTML` on user text; sanitize on the server).
- Copy full news articles (store/show title, source summary, link, our AI summary only).
- Send personal data (email, password, tokens, private alerts of other users) to an LLM, or let an AI answer show numbers that did not come from a tool result.
- Show sample/placeholder data on a real page (mockup numbers are samples).
- Disable the Lightweight Charts attribution logo, or use green/red for anything but price direction.
- Make a failing test pass by skipping or weakening it (`test.skip`, looser assertions, longer timeouts without cause).
- Edit `docs/SPEC.md`, or bypass hooks with `--no-verify` (never use `--no-verify`).

## Git rules
- `main` is always working. Each phase is done on branch `phase-N-<short-name>` created from `main`. Merge into `main` (`--no-ff`) only after **CI green + Phase Review verdict PASS**, then tag `v0.N` (final release `v1.0`).
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`); at least one commit per completed checklist item; push after committing. You commit and push yourself.
- Before every commit: `npm run secrets:check` and `git status` — never stage `.env`, keys, tokens, real passwords. The secret check always allows `.env.example`, `package-lock.json` and `**/fixtures/**`.
- The repo is public — a committed secret is exposed immediately; if one is ever committed, stop and tell the owner so the secret can be rotated.
- Commits, tags and PR descriptions carry no AI attribution: no `Co-Authored-By` trailer, no "Generated with" line, no mention of Claude or AI in messages. The author is the owner's git identity.
- Deploys: merging into `main` triggers Railway's GitHub autodeploy after CI passes (Wait for CI). Never run `railway up` unless the owner asks (fallback).
- Commit the working tree before any risky change (refactor, migration, dependency upgrade, large deletion).
- **NEVER** `git push --force`, `git reset --hard` on pushed work, rebase/amend pushed commits, or delete branches/tags. Undo = `git revert` or a new branch.

## Definition of Done (every task and every session)
1. `npm run check` passes locally (typecheck, lint, unit, integration, **all** Playwright tests).
2. Local smoke run: `npm run db:migrate`, `npm run db:seed` and `npm run dev` start without errors on a machine with the Postgres container running, and `curl http://localhost:3000/api/v1/health` returns db up (stop the dev server afterwards).
3. Committed, pushed, and CI green on the branch (`gh run watch` or `gh run list --branch <branch>`).
4. `docs/PROGRESS.md`: checklist ticked + one dated log line; `docs/TRACEABILITY.md` statuses updated; other docs updated if a contract changed.
5. The final reply ends with **"Cách kiểm tra thủ công"**: numbered steps in simple Vietnamese for a non-programmer (which URL to open, what to click, what must appear), plus the list of AC IDs now passing.
If any item is not met, state which one and why in Vietnamese. Never claim "done" otherwise.

## Session hygiene
- Start: read `docs/PROGRESS.md`, find the current phase and first unticked item; check `git status` and the branch.
- Phase 0 after the KICKOFF session: continue on the existing `phase-0-scaffold` (PHASE START PROMPT with N=0); never run `git init` or create the GitHub repo again.
- Long session: finish the current item, commit, write the log line, stop and tell the owner to start a new session with the PHASE START PROMPT.
- Ask the owner only for what needs a human (accounts, logins, payments, secret values) — give Vietnamese step-by-step instructions.
