import { computeIndicators, ema, macd, rsi, sma, updateIndicators } from './index';
import { randomWalk } from './random-walk.testutil';

const close = (actual: (number | null)[], expected: (number | null)[]) => {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((e, i) => (e === null ? expect(actual[i]).toBeNull() : expect(actual[i]).toBeCloseTo(e, 6)));
};

describe('sma (hand-computed)', () => {
  it('averages the last n values', () => close(sma([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]));
  it('is all null when there are fewer than n values', () => close(sma([1, 2], 3), [null, null]));
});

describe('ema (hand-computed)', () => {
  it('is seeded with the SMA of the first n values, then α = 2/(n+1)', () => close(ema([2, 4, 6, 8, 4], 3), [null, null, 4, 6, 5]));
  it('skips leading nulls before seeding', () => close(ema([null, null, 2, 4, 6, 8], 2), [null, null, null, 3, 5, 7]));
});

describe('rsi (hand-computed, Wilder)', () => {
  it('first value = SMA of the first `period` changes, then RMA', () => {
    // changes +2 −1 +2 −1; period 2 → avg (1, 0.5) → (1.5, 0.25) → (0.75, 0.625)
    close(rsi([10, 12, 11, 13, 12], 2).values, [null, null, 100 - 100 / 3, 100 - 100 / 7, 100 - 100 / 2.2]);
  });
  it('is 100 when there are only gains (avgLoss = 0)', () => close(rsi([1, 2, 3, 4], 3).values, [null, null, null, 100]));
  it('is 100 for a flat series (avgLoss = 0)', () => close(rsi([5, 5, 5], 2).values, [null, null, 100]));
  it('is 0 when there are only losses', () => close(rsi([4, 3, 2, 1], 3).values, [null, null, null, 0]));
});

describe('macd (hand-computed with periods 2, 3, 2)', () => {
  const m = macd([1, 2, 3, 5, 4, 6], 2, 3, 2);
  it('line = EMA(fast) − EMA(slow)', () => close(m.macd, [null, null, 0.5, 2 / 3, 0.3055556, 0.4768519]));
  it('signal = SMA-seeded EMA of the line', () => close(m.signal, [null, null, null, 0.5833333, 0.3981481, 0.4506173]));
  it('hist = line − signal', () => close(m.hist, [null, null, null, 0.0833333, -0.0925926, 0.0262346]));
});

describe('updateIndicators (incremental last candle)', () => {
  const periods = [7, 25, 99];
  const expectSame = (a: ReturnType<typeof computeIndicators>, b: ReturnType<typeof computeIndicators>) => {
    for (const key of ['rsi', 'macd', 'signal', 'hist'] as const) close(a[key], b[key]);
    a.ma.forEach((s, k) => close(s, b.ma[k]));
  };

  it('equals a full recompute after the open candle close changes (several times)', () => {
    const closes = randomWalk(1000);
    let data = computeIndicators(closes, periods);
    for (const price of [31_000, 29_500.5, 30_123.45]) {
      const next = [...closes.slice(0, -1), price];
      data = updateIndicators(data, next, periods);
      expectSame(data, computeIndicators(next, periods));
    }
  });

  it('recomputes fully when a candle is appended or a period changes', () => {
    const closes = randomWalk(500, 7);
    const data = computeIndicators(closes, periods);
    const appended = [...closes, 30_000];
    expectSame(updateIndicators(data, appended, periods), computeIndicators(appended, periods));
    const changed = updateIndicators(data, closes, [50, 25, 99]);
    close(changed.ma[0], sma(closes, 50));
  });

  it('handles windows that end on a seed index', () => {
    for (const len of [2, 14, 15, 26, 27, 34, 35]) {
      const closes = randomWalk(len, len);
      const data = computeIndicators(closes, periods);
      const next = [...closes.slice(0, -1), closes[len - 1] + 50];
      expectSame(updateIndicators(data, next, periods), computeIndicators(next, periods));
    }
  });
});
