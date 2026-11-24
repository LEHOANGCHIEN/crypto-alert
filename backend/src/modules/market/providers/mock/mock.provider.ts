import { Logger } from '@nestjs/common';
import { parseExchangeInfo, parseTickers } from '../binance/binance-rest';
import type { MarketDataProvider, ProviderStatus } from '../market-data-provider.interface';
import type { Candle, Interval, SymbolInfo, Ticker } from '../../market.types';
import type { PriceBus } from '../../price-bus';
import { INTERVAL_MS } from '../../intervals';
import { fixtureCandles, generateCandles, loadBtcFixture, MOCK_SYMBOLS } from './mock-data';

const HEARTBEAT_MS = 10_000;
const AUTO_TICK_MS = 2_000;
const ALL_MARKET_TICKER_STREAM = '!miniTicker@arr';
const INTERVALS = Object.keys(INTERVAL_MS) as Interval[];
const USDT_SYMBOLS = new Set(MOCK_SYMBOLS.filter((s) => s.quote === 'USDT').map((s) => s.symbol));

export type MockStats = {
  upstreamStreams: string[];
  restCalls: { symbols: number; tickers: number; klines: { symbol: string; interval: Interval; limit: number }[] };
};

const key = (symbol: string, interval: Interval) => `${symbol}|${interval}`;
const streamName = (symbol: string, interval: Interval) => `${symbol.toLowerCase()}@kline_${interval}`;

/**
 * Deterministic provider for tests/offline dev (ARCHITECTURE §8). Prices are static unless pushed through the
 * test endpoints (tick, close-candle, disconnect); `MOCK_AUTO_TICK` adds a random walk for manual dev.
 */
export class MockProvider implements MarketDataProvider {
  private readonly logger = new Logger('MockProvider');
  private heartbeat: NodeJS.Timeout | null = null;
  private autoTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connected = false;
  private lastMessageAt: number | null = null;
  private calls: MockStats['restCalls'] = { symbols: 0, tickers: 0, klines: [] };
  /** Live 24h tickers (USDT pairs); created on first use from the static mock data. */
  private tickers: Map<string, Ticker> | null = null;
  /**
   * Candles changed by the test endpoints per (symbol, interval), ascending; the last one is the mock's open candle.
   * They replace/extend the generated history in getKlines.
   */
  private overrides = new Map<string, Candle[]>();
  private readonly streams = new Set<string>();

  constructor(
    private readonly bus: PriceBus,
    private readonly autoTick = false,
  ) {}

  async start(): Promise<void> {
    this.connected = true;
    this.beat();
    this.heartbeat = setInterval(() => this.beat(), HEARTBEAT_MS);
    this.heartbeat.unref();
    if (this.autoTick) {
      this.autoTimer = setInterval(() => this.randomWalk(), AUTO_TICK_MS);
      this.autoTimer.unref();
    }
    this.bus.emit('status', { status: 'connected', at: Date.now() });
    this.logger.log(`mock market data started${this.autoTick ? ' (auto tick)' : ''}`);
  }

  async stop(): Promise<void> {
    for (const t of [this.heartbeat, this.autoTimer]) if (t) clearInterval(t);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.heartbeat = this.autoTimer = this.reconnectTimer = null;
    this.connected = false;
  }

  /** Back to the initial state (POST /test/reset): prices, open candles, counters, disconnect state. */
  reset(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const wasDown = !this.connected;
    this.connected = true;
    this.tickers = null;
    this.overrides.clear();
    this.resetCounters();
    this.beat();
    if (wasDown) this.bus.emit('status', { status: 'connected', at: Date.now() });
  }

  resetCounters(): void {
    this.calls = { symbols: 0, tickers: 0, klines: [] };
  }

  getStatus(): ProviderStatus {
    return { name: 'mock', connected: this.connected, lastMessageAt: this.lastMessageAt, activeStreams: this.connected ? this.streams.size + 1 : 0 };
  }

  getStats(): MockStats {
    return {
      upstreamStreams: [ALL_MARKET_TICKER_STREAM, ...this.streams].sort(),
      restCalls: { symbols: this.calls.symbols, tickers: this.calls.tickers, klines: [...this.calls.klines] },
    };
  }

  subscribeKlines(symbol: string, interval: Interval): void {
    this.streams.add(streamName(symbol, interval));
  }

  unsubscribeKlines(symbol: string, interval: Interval): void {
    this.streams.delete(streamName(symbol, interval));
  }

  // ---- test controls (API.md §3.8) ----

  /** Set the last price; adjust 24h high/low and the open candle of every interval; emit through the PriceBus. */
  tick(symbol: string, price: number, quoteVolume?: number): Ticker {
    const now = Date.now();
    const prev = this.tickerMap().get(symbol);
    if (!prev) throw new Error(`unknown mock symbol ${symbol}`);
    const ticker: Ticker = {
      ...prev,
      lastPrice: price,
      highPrice: Math.max(prev.highPrice, price),
      lowPrice: Math.min(prev.lowPrice, price),
      priceChangePercent: prev.openPrice > 0 ? ((price - prev.openPrice) / prev.openPrice) * 100 : 0,
      quoteVolume: quoteVolume ?? prev.quoteVolume,
      eventTime: now,
    };
    this.tickerMap().set(symbol, ticker);

    const candles: { interval: Interval; candle: Candle }[] = [];
    for (const interval of INTERVALS) {
      const list = this.overrideList(symbol, interval, now);
      const open = list[list.length - 1];
      const next = { ...open, close: price, high: Math.max(open.high, price), low: Math.min(open.low, price) };
      list[list.length - 1] = next;
      candles.push({ interval, candle: next });
    }

    if (this.connected) {
      this.beat();
      this.bus.emit('ticker', ticker);
      for (const { interval, candle } of candles) this.bus.emit('kline', { symbol, interval, candle });
    }
    return ticker;
  }

  /** Close the current open candle (emitted with isClosed: true, which caches it) and open the next one. */
  closeCandle(symbol: string, interval: Interval): { closed: Candle; opened: Candle } {
    const list = this.overrideList(symbol, interval, Date.now());
    const closed: Candle = { ...list[list.length - 1], isClosed: true };
    const openTime = closed.closeTime + 1;
    const p = closed.close;
    const opened: Candle = {
      openTime,
      closeTime: openTime + INTERVAL_MS[interval] - 1,
      open: p,
      high: p,
      low: p,
      close: p,
      volume: 0,
      quoteVolume: 0,
      isClosed: false,
    };
    list[list.length - 1] = closed;
    list.push(opened);
    if (this.connected) {
      this.beat();
      this.bus.emit('kline', { symbol, interval, candle: closed });
      this.bus.emit('kline', { symbol, interval, candle: opened });
    }
    return { closed, opened };
  }

  /** Simulate an upstream drop: `reconnecting` for `durationMs`, then `connected` again with gap recovery. */
  simulateDisconnect(durationMs: number): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.connected) {
      this.connected = false;
      this.bus.emit('status', { status: 'reconnecting', at: Date.now() });
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connected = true;
      this.beat();
      this.bus.emit('status', { status: 'connected', at: Date.now() });
      this.recoverGaps();
    }, durationMs);
    this.reconnectTimer.unref();
  }

  /** Like BinanceProvider after a reconnect: latest 2 candles of each subscribed stream. */
  private recoverGaps(): void {
    for (const stream of this.streams) {
      const [sym, iv] = stream.split('@kline_');
      const symbol = sym.toUpperCase();
      const interval = iv as Interval;
      for (const candle of this.klinesFor(symbol, interval, 2, undefined, Date.now())) this.bus.emit('kline', { symbol, interval, candle });
    }
  }

  private randomWalk(): void {
    for (const symbol of USDT_SYMBOLS) {
      const t = this.tickerMap().get(symbol);
      if (!t) continue;
      const step = 1 + (Math.random() - 0.5) * 0.002;
      this.tick(symbol, Number((t.lastPrice * step).toPrecision(8)));
    }
  }

  private beat(): void {
    this.lastMessageAt = Date.now();
  }

  // ---- data ----

  /** Static configured last price; BTCUSDT follows the fixture so list, header and chart agree. */
  private basePrice(symbol: string): number {
    if (symbol === 'BTCUSDT') {
      const fx = loadBtcFixture();
      return fx[fx.length - 1].close;
    }
    return MOCK_SYMBOLS.find((s) => s.symbol === symbol)?.last ?? 1;
  }

  private tickerMap(): Map<string, Ticker> {
    if (!this.tickers) {
      const now = Date.now();
      const raw = MOCK_SYMBOLS.map((s) => {
        const last = this.basePrice(s.symbol);
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
      // Mirror Binance: the raw feed contains every pair; only USDT pairs are kept (same parser as Binance).
      this.tickers = new Map(parseTickers(raw, USDT_SYMBOLS).map((t) => [t.symbol, t]));
    }
    return this.tickers;
  }

  /** The override list of (symbol, interval), created from the generated open candle on first use. */
  private overrideList(symbol: string, interval: Interval, now: number): Candle[] {
    let list = this.overrides.get(key(symbol, interval));
    if (!list) {
      list = this.generated(symbol, interval, 1, undefined, now);
      this.overrides.set(key(symbol, interval), list);
    }
    return list;
  }

  private generated(symbol: string, interval: Interval, limit: number, endOpen: number | undefined, now: number): Candle[] {
    const ms = INTERVAL_MS[interval];
    const currentOpen = Math.floor(now / ms) * ms;
    const end = endOpen === undefined ? currentOpen : Math.min(currentOpen, endOpen);
    if (symbol === 'BTCUSDT' && interval === '1h') return fixtureCandles(limit, end, now);
    return generateCandles(symbol, interval, this.basePrice(symbol), limit, end, now);
  }

  /** Generated history with the test-endpoint candles laid over it; the mock's open candle is always last. */
  private klinesFor(symbol: string, interval: Interval, limit: number, endTime: number | undefined, now: number): Candle[] {
    const ms = INTERVAL_MS[interval];
    const endOpen = endTime === undefined ? undefined : Math.floor(endTime / ms) * ms;
    const ov = this.overrides.get(key(symbol, interval));
    if (!ov) return this.generated(symbol, interval, limit, endOpen, now);
    const lastOpen = ov[ov.length - 1].openTime;
    const cap = endOpen === undefined ? lastOpen : Math.min(endOpen, lastOpen);
    const byOpen = new Map<number, Candle>();
    for (const c of this.generated(symbol, interval, limit, cap, now)) byOpen.set(c.openTime, c);
    for (const c of ov) if (c.openTime <= cap) byOpen.set(c.openTime, c);
    return [...byOpen.values()].sort((a, b) => a.openTime - b.openTime).slice(-limit);
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
    return [...this.tickerMap().values()].sort((a, b) => b.quoteVolume - a.quoteVolume);
  }

  async getKlines(symbol: string, interval: Interval, opts: { limit: number; endTime?: number }): Promise<Candle[]> {
    this.calls.klines.push({ symbol, interval, limit: opts.limit });
    return this.klinesFor(symbol, interval, opts.limit, opts.endTime, Date.now());
  }
}
