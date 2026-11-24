import { emaNext } from './ema';
import { macd } from './macd';
import { rsi, rsiNext } from './rsi';
import type { Series } from './series';
import { sma, smaAt } from './sma';

export const RSI_PERIOD = 14;
export const MACD_FAST = 12;
export const MACD_SLOW = 26;
export const MACD_SIGNAL = 9;

/** All indicator series for one candle window, index-aligned with the closes. */
export type IndicatorData = {
  closes: readonly number[];
  maPeriods: readonly number[];
  ma: Series[];
  rsi: Series;
  macd: Series;
  signal: Series;
  hist: Series;
  /** Internal state at index len−2, so the last value can be recomputed alone (live open candle). */
  prev: {
    rsi: { gain: number; loss: number } | null;
    fast: number | null;
    slow: number | null;
    signal: number | null;
  };
};

const at = (s: Series, i: number): number | null => (i >= 0 && i < s.length ? s[i] : null);

/** Full computation over all candles (on load, timeframe/symbol change, new candle, period change). */
export function computeIndicators(closes: readonly number[], maPeriods: readonly number[]): IndicatorData {
  const r = rsi(closes, RSI_PERIOD);
  const m = macd(closes, MACD_FAST, MACD_SLOW, MACD_SIGNAL);
  const p = closes.length - 2;
  const g = at(r.avgGain, p);
  const l = at(r.avgLoss, p);
  return {
    closes,
    maPeriods,
    ma: maPeriods.map((n) => sma(closes, n)),
    rsi: r.values,
    macd: m.macd,
    signal: m.signal,
    hist: m.hist,
    prev: { rsi: g === null || l === null ? null : { gain: g, loss: l }, fast: at(m.fast, p), slow: at(m.slow, p), signal: at(m.signal, p) },
  };
}

const samePeriods = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** True when only the last close differs (same window, same earlier candles). */
function onlyLastChanged(prev: IndicatorData, closes: readonly number[]): boolean {
  if (prev.closes.length !== closes.length || closes.length < 2) return false;
  for (let i = 0; i < closes.length - 1; i++) if (prev.closes[i] !== closes[i]) return false;
  return true;
}

/**
 * Incremental update: if only the last close changed, recompute just the last value of every series from the
 * state at index len−2; otherwise fall back to a full computation. Result equals `computeIndicators(closes, …)`.
 */
export function updateIndicators(prev: IndicatorData | null, closes: readonly number[], maPeriods: readonly number[]): IndicatorData {
  if (!prev || !samePeriods(prev.maPeriods, maPeriods) || !onlyLastChanged(prev, closes)) return computeIndicators(closes, maPeriods);
  const { rsi: pr, fast: pf, slow: ps, signal: psig } = prev.prev;
  const last = closes.length - 1;
  // The last index is a seed index (first defined value, no state before it): recompute fully.
  const seedAtLast =
    (pr === null && prev.rsi[last] !== null) || ((pf === null || ps === null) && prev.macd[last] !== null) || (psig === null && prev.signal[last] !== null);
  if (seedAtLast) return computeIndicators(closes, maPeriods);

  const replaceLast = (s: Series, v: number | null): Series => {
    const out = s.slice();
    out[last] = v;
    return out;
  };
  const ma = maPeriods.map((n, k) => replaceLast(prev.ma[k], smaAt(closes, n, last)));
  const rsiV = pr === null ? null : rsiNext(pr, closes[last] - closes[last - 1], RSI_PERIOD).value;
  const fast = pf === null ? null : emaNext(pf, closes[last], MACD_FAST);
  const slow = ps === null ? null : emaNext(ps, closes[last], MACD_SLOW);
  const line = fast === null || slow === null ? null : fast - slow;
  const sig = line === null || psig === null ? null : emaNext(psig, line, MACD_SIGNAL);
  const hist = line === null || sig === null ? null : line - sig;
  return {
    closes,
    maPeriods,
    ma,
    rsi: replaceLast(prev.rsi, rsiV),
    macd: replaceLast(prev.macd, line),
    signal: replaceLast(prev.signal, sig),
    hist: replaceLast(prev.hist, hist),
    prev: prev.prev,
  };
}
