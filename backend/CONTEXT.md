# backend/CONTEXT.md — NestJS rules

Read with `CLAUDE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/ARCHITECTURE.md` §2–§9.

## Layering
| Layer | May | Must not |
|---|---|---|
| Controller / Gateway | Parse + validate DTOs, call one service method, return plain data (the interceptor wraps the envelope) | Touch Prisma, contain business rules, build envelopes by hand |
| Service | Business rules, transactions, throw `AppError(code)` | Know HTTP/Socket details, return Prisma `Decimal`/`Date` to clients without the serializer |
| Prisma (via `PrismaService`) | Data access | Be imported outside services |
| Provider (`MarketDataProvider`) | Talk to Binance / mock | Be used directly by controllers (go through `market.service`, `ticker-store`, `candle-cache.service`) |

Modules communicate through exported services or `PriceBus` events — never import another module's internals.

## Naming
- Files `kebab-case`: `alert-worker.service.ts`, `create-alert.dto.ts`; classes `PascalCase`; DTO suffix `Dto`; integration tests `*.int-spec.ts`, unit tests `*.spec.ts` next to the file.
- Error codes: `UPPER_SNAKE` in `common/error-codes.ts` — exactly the list in API.md §1.2; field codes in API.md §1.3.
- Socket event names and rooms: constants in `realtime/events.ts`, values exactly as API.md §4.

## Errors & validation
```ts
// ✅
if (!alert) throw new AppError('ALERT_NOT_FOUND');          // filter maps to 404 + envelope
// ❌
throw new HttpException('Alert not found', 404);
```
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` with a custom `exceptionFactory` producing `VALIDATION_ERROR` + `details[{ field, code, params }]`.
- Unknown exceptions → `INTERNAL_ERROR`; log stack server-side; never leak messages.
- Resource owned by another user → same `*_NOT_FOUND` code as missing (no existence leaks).

## Data rules
- Never select `passwordHash` except inside `AuthService`/`PasswordService`; define reusable `userPublicSelect`.
- `Decimal` → `number` and `Date` → ISO string by the global serializer; candle times → epoch ms in the market mapper.
- Multi-row writes that must succeed together (alert trigger + notification, token rotation) use `prisma.$transaction`.
- Business limits (watchlist 50, alerts 20) checked in services. Email lower-cased before any query.
- Timestamps UTC; the backend never formats dates or numbers for display and never returns sentences.

## Real-time & worker
- One upstream connection, owned by `BinanceProvider`. All upstream (un)subscribes go through `SubscriptionManager`.
- Caps: ≤ 2 kline subscriptions per socket (else ack `SUBSCRIPTION_LIMIT_REACHED`); ≤ 200 upstream kline streams globally (else ack `MARKET_DATA_UNAVAILABLE`).
- AlertWorker consumes `PriceBus` `ticker` events; dispatches via `NotificationService` only (never emits sockets directly).
- Notification payloads are structured (`type` + `payload`), never text.

## Config & security
- All config through `ConfigService`; schema-validated at boot; new var → `.env.example` + ARCHITECTURE §10.1.
- Refuse to start if `NODE_ENV=production` and `ENABLE_TEST_ENDPOINTS=true`.
- Never log passwords, tokens, cookies, or `DATABASE_URL`.

## Testing
| Kind | Rule |
|---|---|
| Unit (`*.spec.ts`, Jest) | Pure logic: alert matching, backoff, subscription ref-count, candle window/gap logic, validation mapping. No DB, no network. |
| Integration (`test/integration/*.int-spec.ts`) | **Real Postgres test DB** (`crypto_alert_test`), real Nest app via `supertest`, `MockProvider`. Mandatory for **auth** (register, login, refresh rotation + reuse — both cases explicitly: (a) a rotated token presented again within 10 s → new tokens issued, no other tokens revoked; (b) presented after 10 s → all tokens of that user revoked; never remove the 10 s grace window to make a test pass — logout, change password) and **alert flow** (create → tick → triggered + notification, one-shot under bursts, delete, isolation, worker reload). Truncate tables before each test file; never mock Prisma here. |
| E2E | Lives in `/e2e` (Playwright). Backend only provides test endpoints of API.md §3.8. |
