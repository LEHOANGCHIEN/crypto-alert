/** Exactly the codes of docs/API.md §1.2 and §1.3. */
export const ERROR_HTTP_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  TOKEN_EXPIRED: 401,
  REFRESH_TOKEN_INVALID: 401,
  INVALID_CREDENTIALS: 401,
  WRONG_CURRENT_PASSWORD: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SYMBOL_NOT_FOUND: 404,
  ALERT_NOT_FOUND: 404,
  NOTIFICATION_NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  WATCHLIST_LIMIT_REACHED: 409,
  ALERT_LIMIT_REACHED: 409,
  ALERT_CONDITION_ALREADY_MET: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  MARKET_DATA_UNAVAILABLE: 503,
  // Socket ack only (no HTTP status); 400 is used if it ever surfaces over HTTP.
  SUBSCRIPTION_LIMIT_REACHED: 400,
} as const;

export type ErrorCode = keyof typeof ERROR_HTTP_STATUS;

export const FIELD_ERROR_CODES = [
  'REQUIRED',
  'INVALID_TYPE',
  'INVALID_EMAIL',
  'TOO_SHORT',
  'TOO_LONG',
  'PASSWORD_WEAK',
  'OUT_OF_RANGE',
  'TOO_MANY_DECIMALS',
  'INVALID_ENUM',
  'INVALID_SYMBOL_FORMAT',
  'INVALID_TIMEZONE',
  'UNKNOWN_FIELD',
] as const;

export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];

export type FieldError = {
  field: string;
  code: FieldErrorCode;
  params?: { min?: number; max?: number };
};
