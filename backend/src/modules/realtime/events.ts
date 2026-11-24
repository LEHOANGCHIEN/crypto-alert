import type { Interval } from '../market/market.types';

/** Socket.IO event names exactly as docs/API.md §4.2–4.3. */
export const CLIENT_EVENTS = {
  TICKERS_SUBSCRIBE: 'tickers:subscribe',
  TICKERS_UNSUBSCRIBE: 'tickers:unsubscribe',
  KLINE_SUBSCRIBE: 'kline:subscribe',
  KLINE_UNSUBSCRIBE: 'kline:unsubscribe',
} as const;

export const SERVER_EVENTS = {
  TICKERS_UPDATE: 'tickers:update',
  KLINE_UPDATE: 'kline:update',
  MARKET_STATUS: 'market:status',
} as const;

/** Server-internal room names (API.md §4.1). */
export const ROOMS = {
  TICKERS: 'tickers',
  kline: (symbol: string, interval: Interval): string => `kline:${symbol}:${interval}`,
  user: (id: number): string => `user:${id}`,
};
