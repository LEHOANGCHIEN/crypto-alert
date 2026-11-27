import type { Candle } from '../../../shared/api/types';
import { tileSource, queryId, type KlineQuery, type Range } from './ranges';

/** `(last − first close) / first close` in %, over the candles of a range (`null` without a usable first close). */
export function rangeChange(candles: Candle[]): number | null {
  if (candles.length === 0) return null;
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  if (!(first > 0)) return null;
  return ((last - first) / first) * 100;
}

/** Change of one performance tile, from the candles of its base query (`undefined` while not loaded). */
export function tileChange(range: Range, ytdDays: number, bases: Record<string, Candle[] | undefined>): number | null | undefined {
  const { base, count } = tileSource(range, ytdDays);
  const candles = bases[queryId(base)];
  if (!candles) return undefined;
  return rangeChange(candles.slice(-count));
}

/** Highest high / lowest low of the candles (52-week stats from the daily candles). */
export function highLow(candles: Candle[]): { high: number; low: number } | null {
  if (candles.length === 0) return null;
  return { high: Math.max(...candles.map((c) => c.high)), low: Math.min(...candles.map((c) => c.low)) };
}

export type { KlineQuery };
