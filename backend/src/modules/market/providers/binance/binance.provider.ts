import { Logger } from '@nestjs/common';
import type { MarketDataProvider, ProviderStatus } from '../market-data-provider.interface';
import type { Candle, Interval, SymbolInfo, Ticker } from '../../market.types';
import { INTERVAL_MS } from '../../intervals';
import type { PriceBus } from '../../price-bus';
import { BinanceRestClient } from './binance-rest';
import { ALL_MARKET_TICKER_STREAM, BinanceWsClient, type BinanceWsOptions } from './binance-ws.client';

type RawMiniTicker = { E: number; s: string; c: string; o: string; h: string; l: string; v: string; q: string };
type RawKlineEvent = {
  s: string;
  k: { t: number; T: number; i: string; o: string; c: string; h: string; l: string; v: string; q: string; x: boolean };
};

/** Upstream stream name for a kline subscription (lower-case, ARCHITECTURE §4). */
export const klineStream = (symbol: string, interval: Interval): string => `${symbol.toLowerCase()}@kline_${interval}`;

/** `!miniTicker@arr` item → Ticker. */
export function parseMiniTicker(t: RawMiniTicker): Ticker {
  const lastPrice = Number(t.c);
  const openPrice = Number(t.o);
  return {
    symbol: t.s,
    lastPrice,
    openPrice,
    highPrice: Number(t.h),
    lowPrice: Number(t.l),
    priceChangePercent: openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0,
    volume: Number(t.v),
    quoteVolume: Number(t.q),
    eventTime: Number(t.E),
  };
}

/** `<symbol>@kline_<interval>` payload → { symbol, interval, candle }, or null for an unknown interval. */
export function parseKlineEvent(e: RawKlineEvent): { symbol: string; interval: Interval; candle: Candle } | null {
  const k = e.k;
  if (!(k.i in INTERVAL_MS)) return null;
  return {
    symbol: e.s,
    interval: k.i as Interval,
    candle: {
      openTime: Number(k.t),
      closeTime: Number(k.T),
      open: Number(k.o),
      high: Number(k.h),
      low: Number(k.l),
      close: Number(k.c),
      volume: Number(k.v),
      quoteVolume: Number(k.q),
      isClosed: Boolean(k.x),
    },
  };
}

/**
 * Real market data (ADR-05): REST client + one upstream WebSocket (ARCHITECTURE §4). Emits `ticker`, `kline`
 * and `status` on the PriceBus; only USDT symbols known from exchangeInfo are forwarded.
 */
export class BinanceProvider implements MarketDataProvider {
  private readonly logger = new Logger('BinanceProvider');
  private readonly rest: BinanceRestClient;
  private readonly ws: BinanceWsClient;
  /** stream name → (symbol, interval), for gap recovery after a reconnect */
  private readonly klineSubs = new Map<string, { symbol: string; interval: Interval }>();
  private symbolSet: Set<string> | null = null;

  constructor(
    private readonly bus: PriceBus,
    restBaseUrl: string,
    wsBaseUrl: string,
    wsOptions: BinanceWsOptions = {},
    rest?: BinanceRestClient,
  ) {
    this.rest = rest ?? new BinanceRestClient(restBaseUrl);
    this.ws = new BinanceWsClient(
      wsBaseUrl,
      {
        onMessage: (stream, data) => this.onMessage(stream, data),
        onStatus: (connected) => this.bus.emit('status', { status: connected ? 'connected' : 'reconnecting', at: Date.now() }),
        onReopen: () => void this.recoverGaps(),
      },
      wsOptions,
    );
  }

  async start(): Promise<void> {
    this.ws.start();
  }

  async stop(): Promise<void> {
    this.ws.stop();
  }

  getStatus(): ProviderStatus {
    const connected = this.ws.connected;
    return { name: 'binance', connected, lastMessageAt: this.ws.lastMessageAt, activeStreams: connected ? this.ws.activeStreams().length : 0 };
  }

  subscribeKlines(symbol: string, interval: Interval): void {
    const stream = klineStream(symbol, interval);
    this.klineSubs.set(stream, { symbol, interval });
    this.ws.subscribe(stream);
  }

  unsubscribeKlines(symbol: string, interval: Interval): void {
    const stream = klineStream(symbol, interval);
    this.klineSubs.delete(stream);
    this.ws.unsubscribe(stream);
  }

  private onMessage(stream: string, data: unknown): void {
    if (stream === ALL_MARKET_TICKER_STREAM) {
      if (!Array.isArray(data) || !this.symbolSet) return;
      for (const raw of data as RawMiniTicker[]) {
        if (this.symbolSet.has(raw.s)) this.bus.emit('ticker', parseMiniTicker(raw));
      }
      return;
    }
    if (stream.includes('@kline_')) {
      const parsed = parseKlineEvent(data as RawKlineEvent);
      if (parsed) this.bus.emit('kline', parsed);
    }
  }

  /** After an upstream reconnect: re-fetch the latest 2 candles of every active kline stream (ARCHITECTURE §4). */
  async recoverGaps(): Promise<void> {
    for (const { symbol, interval } of [...this.klineSubs.values()]) {
      try {
        const candles = await this.rest.getKlines(symbol, interval, { limit: 2 });
        for (const candle of candles) this.bus.emit('kline', { symbol, interval, candle });
      } catch (e) {
        this.logger.warn(`gap recovery failed for ${symbol} ${interval}: ${(e as Error).message}`);
      }
    }
  }

  async listSymbols(): Promise<SymbolInfo[]> {
    const symbols = await this.rest.listSymbols();
    this.symbolSet = new Set(symbols.map((s) => s.symbol));
    return symbols;
  }

  async get24hTickers(): Promise<Ticker[]> {
    if (!this.symbolSet) await this.listSymbols();
    return this.rest.get24hTickers(this.symbolSet as Set<string>);
  }

  getKlines(symbol: string, interval: Interval, opts: { limit: number; endTime?: number }): Promise<Candle[]> {
    return this.rest.getKlines(symbol, interval, opts);
  }
}
