import type { Ticker } from '../market/market.types';

/** `tickers:update` goes out at most once per second (API.md §4.3). */
export const TICKER_BATCH_INTERVAL_MS = 1_000;

const sameTicker = (a: Ticker, b: Ticker): boolean =>
  a.lastPrice === b.lastPrice &&
  a.openPrice === b.openPrice &&
  a.highPrice === b.highPrice &&
  a.lowPrice === b.lowPrice &&
  a.volume === b.volume &&
  a.quoteVolume === b.quoteVolume;

/**
 * Collects live tickers and flushes one batch with only the symbols that changed since they were last sent.
 * The first batch after a quiet second goes out on the next tick of the event loop (so a burst of tickers from one
 * upstream message ends up in one batch); later ones wait until 1 s after the previous flush.
 */
export class TickerBatcher {
  private pending = new Map<string, Ticker>();
  private lastSent = new Map<string, Ticker>();
  private lastFlushAt = Number.NEGATIVE_INFINITY;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly flushFn: (tickers: Ticker[]) => void,
    private readonly intervalMs = TICKER_BATCH_INTERVAL_MS,
  ) {}

  add(ticker: Ticker): void {
    this.pending.set(ticker.symbol, ticker);
    if (this.timer) return;
    const wait = Math.max(0, this.lastFlushAt + this.intervalMs - Date.now());
    this.timer = setTimeout(() => this.flush(), wait);
    this.timer.unref?.();
  }

  /** Forget everything (pending and last sent values). */
  reset(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
    this.lastSent.clear();
    this.lastFlushAt = Number.NEGATIVE_INFINITY;
  }

  private flush(): void {
    this.timer = null;
    const changed: Ticker[] = [];
    for (const t of this.pending.values()) {
      const prev = this.lastSent.get(t.symbol);
      if (prev && sameTicker(prev, t)) continue;
      this.lastSent.set(t.symbol, t);
      changed.push(t);
    }
    this.pending.clear();
    if (changed.length === 0) return;
    this.lastFlushAt = Date.now();
    this.flushFn(changed);
  }
}
