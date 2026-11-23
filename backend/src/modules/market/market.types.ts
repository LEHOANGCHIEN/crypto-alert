// Mirrors docs/API.md §2 (canonical types).
export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
export type MarketStatus = 'connected' | 'reconnecting';

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
