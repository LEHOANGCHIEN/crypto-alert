import { isWindowComplete, mergeCandles, windowBounds } from './candle-window';
import type { Candle } from './market.types';

const H = 3_600_000;
const NOW = 100 * H + 1234; // inside the candle opening at 100h

const c = (openTime: number, close = 1, isClosed = true): Candle => ({
  openTime, closeTime: openTime + H - 1, open: 1, high: 1, low: 1, close, volume: 1, quoteVolume: 1, isClosed,
});

describe('windowBounds', () => {
  it('aligns to the interval and excludes the open candle from the closed range', () => {
    expect(windowBounds('1h', 1000, NOW)).toEqual({ currentOpen: 100 * H, firstOpen: (100 - 999) * H, lastClosedOpen: 99 * H, closedCount: 999 });
  });
});

describe('isWindowComplete', () => {
  const b = windowBounds('1h', 5, NOW); // closed: 96h..99h
  const times = [96, 97, 98, 99].map((h) => h * H);

  it('true for a full contiguous range', () => expect(isWindowComplete(times, '1h', b)).toBe(true));
  it('false when the newest closed candle is missing', () => expect(isWindowComplete(times.slice(0, 3), '1h', b)).toBe(false));
  it('false when there is a gap', () => expect(isWindowComplete([96 * H, 97 * H, 99 * H, 95 * H], '1h', b)).toBe(false));
  it('false when stale (shifted one candle back)', () => expect(isWindowComplete([95, 96, 97, 98].map((h) => h * H), '1h', b)).toBe(false));
  it('false for an empty DB', () => expect(isWindowComplete([], '1h', b)).toBe(false));
  it('limit 1 needs no closed candles', () => expect(isWindowComplete([], '1h', windowBounds('1h', 1, NOW))).toBe(true));
});

describe('mergeCandles', () => {
  it('provider wins on equal openTime, result ascending and trimmed to limit', () => {
    const db = [c(97 * H, 1), c(98 * H, 2), c(99 * H, 3)];
    const fresh = [c(99 * H, 33), c(100 * H, 4, false)];
    const out = mergeCandles(db, fresh, 3);
    expect(out.map((x) => x.openTime / H)).toEqual([98, 99, 100]);
    expect(out[1].close).toBe(33);
    expect(out[2].isClosed).toBe(false);
  });
});
