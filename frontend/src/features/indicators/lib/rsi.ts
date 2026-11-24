import type { Series } from './series';

export type RsiResult = { values: Series; avgGain: Series; avgLoss: Series };

export function rsiFromAverages(avgGain: number, avgLoss: number): number {
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
}

/** One Wilder (RMA) step from the averages of the previous candle. */
export function rsiNext(prev: { gain: number; loss: number }, change: number, period: number) {
  const gain = (prev.gain * (period - 1) + Math.max(change, 0)) / period;
  const loss = (prev.loss * (period - 1) + Math.max(-change, 0)) / period;
  return { gain, loss, value: rsiFromAverages(gain, loss) };
}

/**
 * Wilder RSI (SPEC §4.1): gains/losses of close; the first averages are the SMA of the first `period` changes
 * (defined at index `period`), then avg = (prev × (period−1) + current) / period. avgLoss = 0 → 100.
 */
export function rsi(closes: readonly number[], period: number): RsiResult {
  const len = closes.length;
  const values: Series = new Array<number | null>(len).fill(null);
  const avgGain: Series = new Array<number | null>(len).fill(null);
  const avgLoss: Series = new Array<number | null>(len).fill(null);
  let gainSum = 0;
  let lossSum = 0;
  let prev: { gain: number; loss: number } | null = null;
  for (let i = 1; i < len; i++) {
    const change = closes[i] - closes[i - 1];
    if (prev === null) {
      gainSum += Math.max(change, 0);
      lossSum += Math.max(-change, 0);
      if (i < period) continue;
      prev = { gain: gainSum / period, loss: lossSum / period };
      values[i] = rsiFromAverages(prev.gain, prev.loss);
    } else {
      const next = rsiNext(prev, change, period);
      prev = { gain: next.gain, loss: next.loss };
      values[i] = next.value;
    }
    avgGain[i] = prev.gain;
    avgLoss[i] = prev.loss;
  }
  return { values, avgGain, avgLoss };
}
