import type { Candle, Ticker } from '../api/types';
import { applyKline, liveChangedIndices, mergeTickers } from './live';

const t = (symbol: string, lastPrice: number): Ticker => ({
  symbol, lastPrice, openPrice: 1, highPrice: 1, lowPrice: 1, priceChangePercent: 0, volume: 1, quoteVolume: 1, eventTime: 1,
});
const c = (openTime: number, close: number, isClosed = true): Candle => ({
  openTime, closeTime: openTime + 59_999, open: 1, high: Math.max(1, close), low: 1, close, volume: 1, quoteVolume: 1, isClosed,
});

describe('mergeTickers', () => {
  it('replaces updated symbols and keeps order', () => {
    const prev = [t('A', 1), t('B', 2), t('C', 3)];
    const next = mergeTickers(prev, [t('C', 30), t('A', 10), t('Z', 99)])!;
    expect(next.map((x) => [x.symbol, x.lastPrice])).toEqual([['A', 10], ['B', 2], ['C', 30]]);
    expect(next[1]).toBe(prev[1]);
  });
  it('returns the same array when nothing matches, and undefined when there is no snapshot', () => {
    const prev = [t('A', 1)];
    expect(mergeTickers(prev, [t('Z', 1)])).toBe(prev);
    expect(mergeTickers(undefined, [t('A', 1)])).toBeUndefined();
  });
});

describe('applyKline', () => {
  const base = [c(0, 1), c(60_000, 2), c(120_000, 3, false)];
  it('replaces the open candle', () => {
    const next = applyKline(base, c(120_000, 4, false))!;
    expect(next.map((x) => x.close)).toEqual([1, 2, 4]);
    expect(next[0]).toBe(base[0]);
  });
  it('appends a newer candle', () => {
    const next = applyKline(base, c(180_000, 5, false))!;
    expect(next).toHaveLength(4);
    expect(next[3].close).toBe(5);
  });
  it('replaces an earlier candle (gap recovery) and ignores older-than-window ones', () => {
    expect(applyKline(base, c(60_000, 9))!.map((x) => x.close)).toEqual([1, 9, 3]);
    expect(applyKline(base, c(-60_000, 9))).toBe(base);
    expect(applyKline(undefined, c(0, 1))).toBeUndefined();
  });
});

describe('liveChangedIndices', () => {
  const base = [c(0, 1), c(60_000, 2), c(120_000, 3, false)];
  it('detects a live replace or append', () => {
    expect(liveChangedIndices(base, applyKline(base, c(120_000, 4, false))!)).toEqual([2]);
    expect(liveChangedIndices(base, applyKline(applyKline(base, c(120_000, 3))!, c(180_000, 3, false))!)).toEqual([2, 3]);
  });
  it('treats a reload as not live', () => {
    expect(liveChangedIndices(base, base.map((x) => ({ ...x })))).toBeNull();
    expect(liveChangedIndices(base, [c(60_000, 2), c(120_000, 3), c(180_000, 3, false)])).toBeNull();
    expect(liveChangedIndices([], base)).toBeNull();
  });
});
