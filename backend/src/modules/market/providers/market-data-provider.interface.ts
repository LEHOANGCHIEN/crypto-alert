import type { Candle, Interval, SymbolInfo, Ticker } from '../market.types';

export type ProviderStatus = {
  name: 'binance' | 'mock';
  connected: boolean;
  /** epoch ms of the last upstream message, null if none yet */
  lastMessageAt: number | null;
  activeStreams: number;
};

/** The only place that knows where market data comes from (CLAUDE.md rule 7). */
export interface MarketDataProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): ProviderStatus;
  // Implemented in Phase 2/3; Phase 0 only needs start/stop/status.
  listSymbols(): Promise<SymbolInfo[]>;
  get24hTickers(): Promise<Ticker[]>;
  getKlines(symbol: string, interval: Interval, opts: { limit: number; endTime?: number }): Promise<Candle[]>;
  subscribeKlines(symbol: string, interval: Interval): void;
  unsubscribeKlines(symbol: string, interval: Interval): void;
}

/** Nest injection token. */
export const MARKET_DATA_PROVIDER = Symbol('MARKET_DATA_PROVIDER');
