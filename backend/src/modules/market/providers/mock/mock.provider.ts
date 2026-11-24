import { Logger } from '@nestjs/common';
import { parseExchangeInfo, parseTickers } from '../binance/binance-rest';
import type { MarketDataProvider, ProviderStatus } from '../market-data-provider.interface';
import type { Candle, Interval, SymbolInfo, Ticker } from '../../market.types';
import type { PriceBus } from '../../price-bus';
import { INTERVAL_MS } from '../../intervals';
import { fixtureCandles, generateCandles, loadBtcFixture, MOCK_SYMBOLS } from './mock-data';

const HEARTBEAT_MS = 10_000;

export type MockStats = {
  upstreamStreams: string[];
  restCalls: { symbols: number; tickers: number; klines: { symbol: string; interval: Interval; limit: number }[] };
};

/** Deterministic provider for tests/offline dev (ARCHITECTURE §8). Phase 2: REST data + counters. */
export class MockProvider implements MarketDataProvider {
  private readonly logger = new Logger('MockProvider');
  private timer: NodeJS.Timeout | null = null;
  private connected = false;
  private lastMessageAt: number | null = null;
  private calls: MockStats['restCalls'] = { symbols: 0, tickers: 0, klines: [] };

  constructor(private readonly bus: PriceBus) {}

  async start(): Promise<void> {
    this.connected = true;
    this.beat();
    this.timer = setInterval(() => this.beat(), HEARTBEAT_MS);
    this.timer.unref();
    this.bus.emit('status', { status: 'connected', at: Date.now() });
    this.logger.log('mock market data started');
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.connected = false;
  }

  /** Back to the initial state (used by POST /test/reset). */
  reset(): void {
    this.connected = true;
    this.calls = { symbols: 0, tickers: 0, klines: [] };
    this.beat();
  }

  getStatus(): ProviderStatus {
    return { name: 'mock', connected: this.connected, lastMessageAt: this.lastMessageAt, activeStreams: 0 };
  }

  getStats(): MockStats {
    return {
      upstreamStreams: ['!miniTicker@arr'],
      restCalls: { symbols: this.calls.symbols, tickers: this.calls.tickers, klines: [...this.calls.klines] },
    };
  }

  private beat(): void {
    this.lastMessageAt = Date.now();
  }

  /** Last price per symbol; BTCUSDT follows the fixture so list, header and chart agree. */
  private lastPrice(symbol: string): number {
    if (symbol === 'BTCUSDT') {
      const fx = loadBtcFixture();
      return fx[fx.length - 1].close;
    }
    return MOCK_SYMBOLS.find((s) => s.symbol === symbol)?.last ?? 1;
  }

  async listSymbols(): Promise<SymbolInfo[]> {
    this.calls.symbols++;
    // Raw exchangeInfo shape (incl. non-USDT pairs) goes through the same parser as Binance.
    return parseExchangeInfo({
      symbols: MOCK_SYMBOLS.map((s) => ({
        symbol: s.symbol,
        status: 'TRADING',
        baseAsset: s.base,
        quoteAsset: s.quote,
        isSpotTradingAllowed: true,
        filters: [{ filterType: 'PRICE_FILTER', tickSize: s.tick }],
      })),
    });
  }

  async get24hTickers(): Promise<Ticker[]> {
    this.calls.tickers++;
    const now = Date.now();
    const raw = MOCK_SYMBOLS.map((s) => {
      const last = this.lastPrice(s.symbol);
      // BTCUSDT: keep the 24h open at the same ratio as configured.
      const open = s.symbol === 'BTCUSDT' ? last / (s.last / s.open24h) : s.open24h;
      return {
        symbol: s.symbol,
        lastPrice: String(last),
        openPrice: String(open),
        highPrice: String(Math.max(last, open) * 1.01),
        lowPrice: String(Math.min(last, open) * 0.99),
        volume: String(s.quoteVolume / last),
        quoteVolume: String(s.quoteVolume),
        closeTime: now,
      };
    });
    const usdt = new Set(MOCK_SYMBOLS.filter((s) => s.quote === 'USDT').map((s) => s.symbol));
    // Mirror Binance: the raw feed contains every pair; the app must filter. Only USDT pairs are passed here
    // because get24hTickers() of the real provider is also pre-filtered to the symbol set.
    return parseTickers(raw, usdt);
  }

  async getKlines(symbol: string, interval: Interval, opts: { limit: number; endTime?: number }): Promise<Candle[]> {
    this.calls.klines.push({ symbol, interval, limit: opts.limit });
    const now = Date.now();
    const ms = INTERVAL_MS[interval];
    const currentOpen = Math.floor(now / ms) * ms;
    const endOpen = opts.endTime === undefined ? currentOpen : Math.min(currentOpen, Math.floor(opts.endTime / ms) * ms);
    if (symbol === 'BTCUSDT' && interval === '1h') return fixtureCandles(opts.limit, endOpen, now);
    return generateCandles(symbol, interval, this.lastPrice(symbol), opts.limit, endOpen, now);
  }

  subscribeKlines(): void {}
  unsubscribeKlines(): void {}
}

