import { ema } from './ema';
import type { Series } from './series';

export type MacdResult = { fast: Series; slow: Series; macd: Series; signal: Series; hist: Series };

/** MACD = EMA(fast) − EMA(slow); Signal = EMA(signal) of MACD; Hist = MACD − Signal (SPEC §4.1). */
export function macd(closes: readonly number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): MacdResult {
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  const line: Series = fast.map((f, i) => (f === null || slow[i] === null ? null : f - (slow[i] as number)));
  const signal = ema(line, signalPeriod);
  const hist: Series = line.map((m, i) => (m === null || signal[i] === null ? null : m - (signal[i] as number)));
  return { fast, slow, macd: line, signal, hist };
}
