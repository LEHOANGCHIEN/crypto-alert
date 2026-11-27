import type { Candle } from '../../../shared/api/types';
import { highLow, rangeChange, tileChange } from './performance';
import { chartQuery, queryId, RANGES, tileSource } from './ranges';

const candle = (close: number, high = close, low = close): Candle => ({ openTime: 0, closeTime: 0, open: close, high, low, close, volume: 1, quoteVolume: 1, isClosed: true });

describe('chartQuery (AC-COIN-02)', () => {
  it('maps every range to its interval x limit', () => {
    expect(RANGES.map((r) => chartQuery(r, 330))).toEqual([
      { interval: '5m', limit: 288 },
      { interval: '1h', limit: 168 },
      { interval: '4h', limit: 180 },
      { interval: '1d', limit: 90 },
      { interval: '1d', limit: 180 },
      { interval: '1d', limit: 330 },
      { interval: '1d', limit: 365 },
    ]);
  });
  it('YTD is at least 1 day and at most 365', () => {
    expect(chartQuery('YTD', 0).limit).toBe(1);
    expect(chartQuery('YTD', 1).limit).toBe(1);
    expect(chartQuery('YTD', 400).limit).toBe(365);
  });
  it('daily tiles read slices of the 1d x 365 query', () => {
    expect(tileSource('3M', 330)).toEqual({ base: { interval: '1d', limit: 365 }, count: 90 });
    expect(tileSource('YTD', 330)).toEqual({ base: { interval: '1d', limit: 365 }, count: 330 });
    expect(tileSource('1M', 330)).toEqual({ base: { interval: '4h', limit: 180 }, count: 180 });
  });
});

describe('rangeChange / tileChange (AC-COIN-03)', () => {
  it('is (last - first close) / first close in percent', () => {
    expect(rangeChange([candle(100), candle(150), candle(110)])).toBeCloseTo(10, 10);
    expect(rangeChange([candle(200), candle(100)])).toBeCloseTo(-50, 10);
    expect(rangeChange([candle(5)])).toBe(0);
  });
  it('has no value without candles or a first close', () => {
    expect(rangeChange([])).toBeNull();
    expect(rangeChange([candle(0), candle(1)])).toBeNull();
  });
  it('slices the last N daily candles for 3M / 6M / YTD / 1Y', () => {
    const daily = Array.from({ length: 365 }, (_, i) => candle(100 + i)); // closes 100 … 464
    const bases = { [queryId({ interval: '1d', limit: 365 })]: daily };
    expect(tileChange('3M', 330, bases)).toBeCloseTo(((464 - 375) / 375) * 100, 10); // first of the last 90 = 100 + 275
    expect(tileChange('YTD', 330, bases)).toBeCloseTo(((464 - 135) / 135) * 100, 10);
    expect(tileChange('1Y', 330, bases)).toBeCloseTo(((464 - 100) / 100) * 100, 10);
  });
  it('is undefined while the base query is not loaded', () => {
    expect(tileChange('1D', 330, {})).toBeUndefined();
  });
});

describe('highLow', () => {
  it('returns the 52-week extremes', () => {
    expect(highLow([candle(10, 12, 9), candle(11, 20, 10), candle(12, 13, 5)])).toEqual({ high: 20, low: 5 });
    expect(highLow([])).toBeNull();
  });
});
