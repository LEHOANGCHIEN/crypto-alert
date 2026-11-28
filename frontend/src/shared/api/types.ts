/** Canonical types copied from docs/API.md §1.1–§2. Do not rename fields. */
export type ErrorCode =
  | 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'TOKEN_EXPIRED' | 'REFRESH_TOKEN_INVALID' | 'INVALID_CREDENTIALS'
  | 'WRONG_CURRENT_PASSWORD' | 'FORBIDDEN' | 'NOT_FOUND' | 'SYMBOL_NOT_FOUND' | 'ALERT_NOT_FOUND'
  | 'NOTIFICATION_NOT_FOUND' | 'EMAIL_TAKEN' | 'WATCHLIST_LIMIT_REACHED' | 'ALERT_LIMIT_REACHED'
  | 'ALERT_CONDITION_ALREADY_MET' | 'RATE_LIMITED' | 'INTERNAL_ERROR' | 'MARKET_DATA_UNAVAILABLE'
  | 'SUBSCRIPTION_LIMIT_REACHED';

export type FieldErrorCode =
  | 'REQUIRED' | 'INVALID_TYPE' | 'INVALID_EMAIL' | 'TOO_SHORT' | 'TOO_LONG' | 'PASSWORD_WEAK' | 'OUT_OF_RANGE'
  | 'TOO_MANY_DECIMALS' | 'INVALID_ENUM' | 'INVALID_SYMBOL_FORMAT' | 'INVALID_TIMEZONE' | 'UNKNOWN_FIELD';

export type FieldError = { field: string; code: FieldErrorCode; params?: { min?: number; max?: number } };

export type ApiSuccess<T> = { success: true; data: T };
export type ApiErrorEnvelope = { success: false; error: { code: ErrorCode; details?: FieldError[] } };

export type Locale = 'vi' | 'en';
export type Theme = 'dark' | 'light';
export type Role = 'user' | 'admin';

export type UserSettings = { locale: Locale; theme: Theme; timezone: string };

export type UserMe = {
  id: number;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
  settings: UserSettings;
};

export type AuthResult = { accessToken: string; expiresIn: number; user: UserMe };
export type RefreshResult = { accessToken: string; expiresIn: number };

export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export type SymbolInfo = {
  symbol: string;
  baseAsset: string;
  quoteAsset: 'USDT';
  tickSize: number;
  pricePrecision: number;
};

export type Ticker = {
  symbol: string;
  lastPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  eventTime: number;
};

export type Candle = {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  isClosed: boolean;
};

export type MarketStatus = 'connected' | 'reconnecting';

export type WatchlistItem = { symbol: string; createdAt: string };

export type AlertCondition = 'ABOVE' | 'BELOW';
export type AlertStatus = 'ACTIVE' | 'TRIGGERED';
export type NotificationType = 'ALERT_TRIGGERED';

export type Alert = {
  id: number;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  status: AlertStatus;
  triggeredPrice: number | null;
  createdAt: string;
  triggeredAt: string | null;
};

export type AlertTriggeredPayload = {
  alertId: number;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  triggeredPrice: number;
};

export type Notification = {
  id: number;
  type: NotificationType;
  payload: AlertTriggeredPayload;
  readAt: string | null;
  createdAt: string;
};

export type NotificationList = { items: Notification[]; unreadCount: number };

/** `GET /health` (API.md §2 Health). */
export type Health = {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  marketData: {
    provider: 'binance' | 'mock';
    connected: boolean;
    lastMessageAt: string | null;
    activeStreams: number;
  };
  version: string;
  time: string;
};
