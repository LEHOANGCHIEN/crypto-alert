import type { ApiErrorEnvelope, ApiSuccess, Candle, Interval, MarketStatus, Notification, Ticker } from '../api/types';

/** Socket.IO payloads exactly as docs/API.md §4.2–4.3. */
export type SocketAck = ApiSuccess<null> | ApiErrorEnvelope;
export type TickersUpdate = { tickers: Ticker[] };
export type KlineUpdate = { symbol: string; interval: Interval; candle: Candle };
export type MarketStatusEvent = { status: MarketStatus; at: number };
export type NotificationNew = { notification: Notification; unreadCount: number };
export type NotificationRead = { ids: number[]; unreadCount: number };

export type ServerEvents = {
  'tickers:update': TickersUpdate;
  'kline:update': KlineUpdate;
  'market:status': MarketStatusEvent;
  'notification:new': NotificationNew;
  'notification:read': NotificationRead;
};
