import type { Series } from './series';

/** Simple moving average of the `n` values ending at index `i` (null if fewer than `n` values exist). */
export function smaAt(values: readonly number[], n: number, i: number): number | null {
  if (i < n - 1 || i >= values.length) return null;
  let sum = 0;
  for (let k = i - n + 1; k <= i; k++) sum += values[k];
  return sum / n;
}

/** SMA(n) over the whole input (SPEC §4.1): index i = mean of values[i−n+1 … i]. */
export function sma(values: readonly number[], n: number): Series {
  const out: Series = new Array<number | null>(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}
