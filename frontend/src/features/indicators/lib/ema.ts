import type { Series } from './series';

/** One EMA step: α = 2/(n+1). */
export function emaNext(prev: number, value: number, n: number): number {
  const alpha = 2 / (n + 1);
  return alpha * value + (1 - alpha) * prev;
}

/**
 * EMA(n) seeded with the SMA of the first n values (Pine `ta.ema` behaviour, SPEC §4.1).
 * Leading `null`s are skipped: the seed is the SMA of the first n non-null values.
 */
export function ema(values: readonly (number | null)[], n: number): Series {
  const out: Series = new Array<number | null>(values.length).fill(null);
  let count = 0;
  let sum = 0;
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null) continue;
    if (prev === null) {
      sum += v;
      count++;
      if (count === n) prev = sum / n;
      else continue;
    } else {
      prev = emaNext(prev, v, n);
    }
    out[i] = prev;
  }
  return out;
}
