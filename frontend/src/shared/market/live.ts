import type { Candle, Ticker } from '../api/types';

/** Merge a `tickers:update` batch into the cached snapshot; row order (volume at load time) is kept. */
export function mergeTickers(prev: Ticker[] | undefined, updates: Ticker[]): Ticker[] | undefined {
  if (!prev) return prev;
  const bySymbol = new Map(updates.map((t) => [t.symbol, t]));
  let changed = false;
  const next = prev.map((t) => {
    const u = bySymbol.get(t.symbol);
    if (!u) return t;
    changed = true;
    return u;
  });
  return changed ? next : prev;
}

/**
 * Apply one `kline:update` to the cached candles: same openTime → replace (open candle moved, or a gap-recovery
 * candle), newer → append (a new candle opened). Unchanged candles keep their identity so the chart can tell what
 * changed. Older than the window → ignored.
 */
export function applyKline(prev: Candle[] | undefined, candle: Candle): Candle[] | undefined {
  if (!prev || prev.length === 0) return prev;
  const last = prev[prev.length - 1];
  if (candle.openTime > last.openTime) return [...prev, candle];
  for (let i = prev.length - 1; i >= 0 && prev[i].openTime >= candle.openTime; i--) {
    if (prev[i].openTime === candle.openTime) {
      const next = prev.slice();
      next[i] = candle;
      return next;
    }
  }
  return prev;
}

/** Indices (ascending) whose candle object differs between two arrays of the same series, or null if not a live step. */
export function liveChangedIndices(prev: Candle[], next: Candle[]): number[] | null {
  if (prev.length === 0 || next.length < prev.length || next.length > prev.length + 1) return null;
  if (prev[0].openTime !== next[0].openTime) return null;
  const changed: number[] = [];
  for (let i = 0; i < next.length; i++) if (prev[i] !== next[i]) changed.push(i);
  // A live step touches only the last couple of candles; anything else is a reload.
  return changed.every((i) => i >= prev.length - 2) ? changed : null;
}
