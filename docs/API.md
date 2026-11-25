# API — Crypto Alert

> **Contract between frontend and backend. Follow it character by character.** Any change here must be made in the same commit as the code change on both sides. Types in §2 are canonical: mirror them in `frontend/src/shared/api/types.ts` and use them in backend response DTOs.

## 1. General rules

| Rule | Value |
|---|---|
| Base path | REST: `/api/v1`. Socket.IO: path `/socket.io`, default namespace `/`. Same origin in prod; Vite proxy in dev. |
| Format | JSON, UTF-8. Request bodies are strict: unknown fields → `VALIDATION_ERROR` (`UNKNOWN_FIELD`). |
| Field names | `camelCase`, exactly as written here. |
| IDs | JSON **number** (integer). |
| Prices / volumes | JSON **number** (never string). |
| Times | Records (`createdAt`, `triggeredAt`, `readAt`, …): ISO 8601 UTC string with ms and `Z`, e.g. `"2026-11-21T07:05:00.000Z"`. Market data (`openTime`, `closeTime`, `eventTime`, `at`): epoch **ms** number. |
| Symbols | Upper-case (`BTCUSDT`); path params are upper-cased by the server before lookup. Format `^[A-Z0-9]{2,20}$`. |
| Intervals | `"1m" \| "5m" \| "15m" \| "1h" \| "4h" \| "1d"` |
| Auth header | `Authorization: Bearer <accessToken>` |
| Refresh cookie | `refresh_token`; `HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=604800`; `Secure` when `COOKIE_SECURE=true` |
| Text | The backend **never** returns human-readable messages. Only codes. Frontend translates `errors.<CODE>` and `validation.<FIELD_CODE>`. |

### 1.1 Response envelope (all REST responses and Socket.IO acks)

```ts
type ApiSuccess<T> = { success: true; data: T };
type ApiError = {
  success: false;
  error: {
    code: ErrorCode;
    details?: FieldError[]; // only for VALIDATION_ERROR
  };
};
type FieldError = {
  field: string;               // body/query field name, e.g. "email", "targetPrice"
  code: FieldErrorCode;
  params?: { min?: number; max?: number };
};
```

Examples:
```json
{ "success": true, "data": { "id": 7, "symbol": "BTCUSDT" } }
{ "success": false, "error": { "code": "ALERT_NOT_FOUND" } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "details": [ { "field": "password", "code": "PASSWORD_WEAK" } ] } }
```

### 1.2 Error codes

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body/query/param invalid; see `details` |
| `UNAUTHENTICATED` | 401 | Missing/invalid access token on a protected route |
| `TOKEN_EXPIRED` | 401 | Access token expired → client should call `/auth/refresh` |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh cookie missing, expired, revoked, or reused |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password (same code for both) |
| `WRONG_CURRENT_PASSWORD` | 400 | Change-password with wrong current password |
| `FORBIDDEN` | 403 | Reserved (role checks; unused now) |
| `NOT_FOUND` | 404 | Unknown API route |
| `SYMBOL_NOT_FOUND` | 404 | Well-formed symbol that is not a TRADING USDT spot pair |
| `ALERT_NOT_FOUND` | 404 | Alert does not exist **or belongs to another user** |
| `NOTIFICATION_NOT_FOUND` | 404 | Same rule as above |
| `EMAIL_TAKEN` | 409 | Register with existing email (case-insensitive) |
| `WATCHLIST_LIMIT_REACHED` | 409 | Adding a 51st symbol |
| `ALERT_LIMIT_REACHED` | 409 | Creating a 21st ACTIVE alert |
| `ALERT_CONDITION_ALREADY_MET` | 422 | ABOVE with target ≤ last price, or BELOW with target ≥ last price |
| `RATE_LIMITED` | 429 | Throttled (`Retry-After` header in seconds) |
| `INTERNAL_ERROR` | 500 | Unexpected; details logged server-side only |
| `MARKET_DATA_UNAVAILABLE` | 503 | Provider unreachable / no current price for the symbol; for `kline:subscribe`: global cap of 200 upstream kline streams reached |
| `SUBSCRIPTION_LIMIT_REACHED` | — (socket ack only) | `kline:subscribe` when this socket already holds 2 kline subscriptions |

### 1.3 Field error codes (`details[].code`)

| Code | Meaning |
|---|---|
| `REQUIRED` | Missing or empty |
| `INVALID_TYPE` | Wrong JSON type |
| `INVALID_EMAIL` | Not a valid email |
| `TOO_SHORT` / `TOO_LONG` | Length outside `params.min` / `params.max` |
| `PASSWORD_WEAK` | Missing a letter or a digit |
| `OUT_OF_RANGE` | Number outside `params.min` / `params.max` (or not > 0) |
| `TOO_MANY_DECIMALS` | More than 8 decimals |
| `INVALID_ENUM` | Not one of the allowed values |
| `INVALID_SYMBOL_FORMAT` | Does not match `^[A-Z0-9]{2,20}$` |
| `INVALID_TIMEZONE` | Not a valid IANA timezone name (rejected by `Intl.DateTimeFormat`; aliases such as `Asia/Ho_Chi_Minh` and `UTC` are valid) |
| `UNKNOWN_FIELD` | Field not allowed in this body |

## 2. Canonical types

```ts
type Locale = "vi" | "en";
type Theme = "dark" | "light";
type Role = "user" | "admin";
type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
type AlertCondition = "ABOVE" | "BELOW";
type AlertStatus = "ACTIVE" | "TRIGGERED";
type NotificationType = "ALERT_TRIGGERED";

type UserSettings = { locale: Locale; theme: Theme; timezone: string };

type UserMe = {
  id: number;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;           // ISO
  settings: UserSettings;
};                              // NEVER contains password / passwordHash

type AuthResult = { accessToken: string; expiresIn: number; user: UserMe }; // expiresIn = seconds
type RefreshResult = { accessToken: string; expiresIn: number };

type SymbolInfo = {
  symbol: string;              // "BTCUSDT"
  baseAsset: string;           // "BTC"
  quoteAsset: "USDT";
  tickSize: number;            // 0.01
  pricePrecision: number;      // 2  (decimals derived from tickSize)
};

type Ticker = {
  symbol: string;
  lastPrice: number;
  openPrice: number;           // 24h open
  highPrice: number;
  lowPrice: number;
  priceChangePercent: number;  // (last - open) / open * 100, not rounded
  volume: number;              // 24h base volume
  quoteVolume: number;         // 24h USDT volume
  eventTime: number;           // epoch ms
};

type Candle = {
  openTime: number;            // epoch ms
  closeTime: number;           // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  isClosed: boolean;
};

type WatchlistItem = { symbol: string; createdAt: string };

type Alert = {
  id: number;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  status: AlertStatus;
  triggeredPrice: number | null;
  createdAt: string;
  triggeredAt: string | null;
};

type AlertTriggeredPayload = {
  alertId: number;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  triggeredPrice: number;
};

type Notification = {
  id: number;
  type: NotificationType;
  payload: AlertTriggeredPayload;
  readAt: string | null;
  createdAt: string;
};

type NotificationList = { items: Notification[]; unreadCount: number };

type MarketStatus = "connected" | "reconnecting";

type Health = {
  status: "ok" | "degraded";   // degraded if db down or market data not connected
  db: "up" | "down";
  marketData: {
    provider: "binance" | "mock";
    connected: boolean;
    lastMessageAt: string | null; // ISO
    activeStreams: number;
  };
  version: string;
  time: string;                // ISO, server now
};
```

## 3. REST endpoints

Auth column: **public** = no token needed; **user** = valid access token required (else `UNAUTHENTICATED`/`TOKEN_EXPIRED`); **cookie** = refresh cookie required.

### 3.1 Auth — `/api/v1/auth`

| Method & path | Auth | Request body | Success | Errors |
|---|---|---|---|---|
| `POST /auth/register` | public (rate-limited) | `{ email: string, password: string, displayName: string, locale?: Locale, theme?: Theme, timezone?: string }` | **201** `AuthResult` + sets `refresh_token` cookie | `VALIDATION_ERROR`, `EMAIL_TAKEN`, `RATE_LIMITED` |
| `POST /auth/login` | public (rate-limited) | `{ email: string, password: string }` | **200** `AuthResult` + sets cookie | `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `RATE_LIMITED` |
| `POST /auth/refresh` | cookie | — | **200** `RefreshResult` + **rotated** cookie | `REFRESH_TOKEN_INVALID` (cookie cleared) |
| `POST /auth/logout` | cookie (optional) | — | **200** `null`; revokes current refresh token, clears cookie. Always succeeds. | — |
| `POST /auth/change-password` | user + cookie | `{ currentPassword: string, newPassword: string }` | **200** `null`; revokes all other refresh tokens of the user; current session stays valid | `VALIDATION_ERROR`, `WRONG_CURRENT_PASSWORD`, `UNAUTHENTICATED` |

Validation: `email` valid, ≤ 254, trimmed + lower-cased; `password`/`newPassword` 8–72 chars + ≥1 letter + ≥1 digit (`TOO_SHORT`/`TOO_LONG`/`PASSWORD_WEAK`); `displayName` trimmed 2–50. Confirm-password is **client-only**. Login does not validate password strength (only `REQUIRED`). Rate limit: `LOGIN_RATE_LIMIT_PER_MINUTE` requests per client IP per minute, shared by `register` and `login`; the client IP is `req.ip`, which trusts `X-Forwarded-For` only for `TRUST_PROXY_HOPS` proxy hops (0 = never; 1 on Railway).

Refresh rotation grace window: a refresh token that was rotated less than 10 seconds ago and is presented again (e.g. two tabs refreshing at once) is **not** treated as reuse — the server issues a new refresh token + access token for that user and revokes nothing else. Reuse detection (revoke all of the user's tokens → `REFRESH_TOKEN_INVALID`) applies only to a *rotated* token presented after this 10 s window. A token revoked by logout or change-password (never rotated) → `REFRESH_TOKEN_INVALID`, cookie cleared, nothing else revoked.

### 3.2 Users — `/api/v1/users`

| Method & path | Auth | Request body | Success | Errors |
|---|---|---|---|---|
| `GET /users/me` | user | — | **200** `UserMe` | `UNAUTHENTICATED`, `TOKEN_EXPIRED` |
| `PATCH /users/me` | user | `{ displayName: string }` | **200** `UserMe` | `VALIDATION_ERROR` |
| `PATCH /users/me/settings` | user | `{ locale?: Locale, theme?: Theme, timezone?: string }` (≥ 1 field) | **200** `UserSettings` | `VALIDATION_ERROR` (`INVALID_ENUM`, `INVALID_TIMEZONE`, `REQUIRED` if empty) |

### 3.3 Market — `/api/v1/market` (public)

| Method & path | Query | Success | Errors |
|---|---|---|---|
| `GET /market/symbols` | — | **200** `SymbolInfo[]` (all TRADING USDT spot pairs, sorted by `symbol`) | `MARKET_DATA_UNAVAILABLE` |
| `GET /market/tickers` | — | **200** `Ticker[]` (USDT pairs only, sorted by `quoteVolume` desc) | `MARKET_DATA_UNAVAILABLE` |
| `GET /market/klines` | `symbol` (required), `interval` (required), `limit` (int 1–1000, default 1000) | **200** `Candle[]` ascending by `openTime`; last item is the open candle (`isClosed: false`) | `VALIDATION_ERROR`, `SYMBOL_NOT_FOUND`, `MARKET_DATA_UNAVAILABLE` |

### 3.4 Watchlist — `/api/v1/watchlist` (user)

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `GET /watchlist` | — | **200** `WatchlistItem[]` ordered by `createdAt` asc | — |
| `PUT /watchlist/:symbol` | — | **200** `WatchlistItem` (idempotent: existing item returned unchanged) | `VALIDATION_ERROR` (`INVALID_SYMBOL_FORMAT`), `SYMBOL_NOT_FOUND`, `WATCHLIST_LIMIT_REACHED` |
| `DELETE /watchlist/:symbol` | — | **200** `{ symbol: string }` (idempotent: also 200 if not in list) | `VALIDATION_ERROR` |

### 3.5 Alerts — `/api/v1/alerts` (user)

| Method & path | Body / query | Success | Errors |
|---|---|---|---|
| `GET /alerts` | `status?: AlertStatus` | **200** `Alert[]` ordered by `createdAt` desc | `VALIDATION_ERROR` |
| `POST /alerts` | `{ symbol: string, condition: AlertCondition, targetPrice: number }` | **201** `Alert` (status `ACTIVE`) | `VALIDATION_ERROR` (`targetPrice`: `REQUIRED`, `INVALID_TYPE`, `OUT_OF_RANGE` if ≤ 0 or > 1e15 (DATABASE.md `DECIMAL(24,8)` column limit; `params.max`), `TOO_MANY_DECIMALS`), `SYMBOL_NOT_FOUND`, `ALERT_LIMIT_REACHED`, `ALERT_CONDITION_ALREADY_MET`, `MARKET_DATA_UNAVAILABLE` |
| `DELETE /alerts/:id` | — | **200** `{ id: number }` (ACTIVE or TRIGGERED) | `VALIDATION_ERROR` (non-integer id), `ALERT_NOT_FOUND` |

Check order for `POST /alerts`: validation → symbol exists → active-alert limit → current price available → condition already met.

### 3.6 Notifications — `/api/v1/notifications` (user)

| Method & path | Body / query | Success | Errors |
|---|---|---|---|
| `GET /notifications` | `limit?: int 1–100` (default 50) | **200** `NotificationList` (newest first; `unreadCount` counts **all** unread, not only returned items) | `VALIDATION_ERROR` |
| `POST /notifications/:id/read` | — | **200** `Notification` (idempotent) | `NOTIFICATION_NOT_FOUND` |
| `POST /notifications/read-all` | — | **200** `{ updated: number }` | — |

Both read endpoints also emit `notification:read` to the user's other sockets (§4.3).

### 3.7 Health — `/api/v1/health` (public)

| Method & path | Success |
|---|---|
| `GET /health` | **200** `Health` (always 200 while the process runs; `status` shows degradation) |

### 3.8 Test-support — `/api/v1/test` (only when `ENABLE_TEST_ENDPOINTS=true` **and** `MARKET_DATA_PROVIDER=mock`; otherwise routes do not exist → `NOT_FOUND`)

| Method & path | Body | Success `data` | Effect |
|---|---|---|---|
| `POST /test/reset` | — | `{ ok: true }` | Truncate all tables, run seed, reset mock (prices, open candles, counters, disconnect state), disconnect all Socket.IO clients, drop all kline subscriptions (upstream unsubscribed immediately) and the pending/last-sent `tickers:update` state, reset rate-limit storage, reload alert worker |
| `POST /test/market/tick` | `{ symbol: string, price: number, quoteVolume?: number }` | `{ ticker: Ticker }` | Set last price; adjust 24h high/low; update the open candle (close/high/low) of every interval of that symbol; emit through PriceBus (→ `tickers:update`, `kline:update`, AlertWorker) |
| `POST /test/market/close-candle` | `{ symbol: string, interval: Interval }` | `{ closed: Candle, opened: Candle }` | Emit current open candle with `isClosed: true` (and cache it), then open the next one (`openTime = closed.closeTime + 1`, O=H=L=C=previous close) |
| `POST /test/market/disconnect` | `{ durationMs?: number }` (default 3000) | `{ ok: true }` | Mock goes `reconnecting` for `durationMs`, then `connected` and resumes |
| `GET /test/market/stats` | — | `{ upstreamStreams: string[], restCalls: { symbols: number, tickers: number, klines: { symbol: string, interval: Interval, limit: number }[] } }` | Inspect subscriptions (e.g. `["!miniTicker@arr","ethusdt@kline_15m"]`, sorted) and provider REST calls since last reset. Note: unsubscribe happens 5 s after a room empties. |
| `POST /test/worker/reload` | — | `{ activeAlerts: number }` | Clear AlertWorker memory and reload ACTIVE alerts from DB (simulates restart) |

## 4. Socket.IO

### 4.1 Connection

```ts
io(window.location.origin, {
  path: "/socket.io",
  auth: { token: accessToken ?? undefined },   // omit for guests
  transports: ["websocket", "polling"],
});
```

| Case | Server behaviour |
|---|---|
| No token | Connected as guest (public events only). |
| Valid token | Connected; joins room `user:{id}`. |
| Invalid / expired token | Connection rejected: `connect_error` with `err.data = { code: "UNAUTHENTICATED" \| "TOKEN_EXPIRED" }`. Client calls `/auth/refresh` then reconnects; if refresh fails → reconnect as guest. |
| On every successful connect | Server immediately emits `market:status` with the current status. |

Client must reconnect the socket after login, logout and every token refresh (new `auth.token`). After any reconnect the client re-emits its current `tickers:subscribe` and `kline:subscribe`.

Rooms (server-internal names): `tickers`, `kline:{SYMBOL}:{interval}` (e.g. `kline:BTCUSDT:1h`), `user:{id}`.

### 4.2 Client → server (all with ack callback; ack is the §1.1 envelope)

| Event | Payload | Ack `data` | Ack errors |
|---|---|---|---|
| `tickers:subscribe` | `{}` | `null` | — |
| `tickers:unsubscribe` | `{}` | `null` | — |
| `kline:subscribe` | `{ symbol: string, interval: Interval }` | `null` | `VALIDATION_ERROR`, `SYMBOL_NOT_FOUND`, `SUBSCRIPTION_LIMIT_REACHED` (socket already holds 2 kline subscriptions), `MARKET_DATA_UNAVAILABLE` (200 upstream kline streams already active) |
| `kline:unsubscribe` | `{ symbol: string, interval: Interval }` | `null` | `VALIDATION_ERROR` |

### 4.3 Server → client

| Event | Room / target | Payload |
|---|---|---|
| `tickers:update` | `tickers` | `{ tickers: Ticker[] }` — only symbols that changed, ≤ 1 batch/second |
| `kline:update` | `kline:{SYMBOL}:{interval}` | `{ symbol: string, interval: Interval, candle: Candle }` |
| `market:status` | all sockets | `{ status: MarketStatus, at: number }` |
| `notification:new` | `user:{id}` | `{ notification: Notification, unreadCount: number }` |
| `notification:read` | `user:{id}` | `{ ids: number[], unreadCount: number }` (ids that became read) |

Frontend reactions: `notification:new` → toast + update bell + invalidate `alerts` and `notifications` queries. `market:status = reconnecting` → "Market data delayed" badge. Socket `disconnect` → "Reconnecting…" banner; `connect` → hide banner, refetch klines for the open chart.

Missed notifications: on every socket `connect` (first connect and every reconnect, including after login/token refresh) a logged-in client invalidates `['notifications']` and `['alerts']`; for unread notifications newer than the newest one already shown in this tab it shows the same toast as `notification:new` and updates the bell. (On a tab's first load the newest fetched notification becomes the baseline; older unread ones are covered by the login summary toast, AC-NOTIF-04.)

## 5. Frontend translation keys tied to this contract

| Source | i18n key |
|---|---|
| `error.code` | `errors.<CODE>` (e.g. `errors.ALERT_NOT_FOUND`); unknown code → `errors.UNKNOWN` |
| `details[].code` | `validation.<CODE>` with interpolation `{{min}}`, `{{max}}`; field label from `fields.<field>` |
| Notification `ALERT_TRIGGERED` | `notifications.ALERT_TRIGGERED.ABOVE` / `.BELOW` with `{{symbol}}`, `{{targetPrice}}`, `{{triggeredPrice}}` (numbers pre-formatted by locale helpers) |
| `market:status` | `market.status.connected` / `market.status.reconnecting` |
