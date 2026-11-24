import { INTERVAL_MS } from './intervals';
import type { Candle, Interval } from './market.types';

/** Expected shape of a request window (SPEC §4 / ARCHITECTURE §3.2). All times epoch ms. */
export type WindowBounds = {
  /** open time of the current (open) candle */
  currentOpen: number;
  /** open time of the oldest candle in the window */
  firstOpen: number;
  /** open time of the newest closed candle */
  lastClosedOpen: number;
  /** number of closed candles the window should contain */
  closedCount: number;
};

export function windowBounds(interval: Interval, limit: number, now: number): WindowBounds {
  const ms = INTERVAL_MS[interval];
  const currentOpen = Math.floor(now / ms) * ms;
  return { currentOpen, firstOpen: currentOpen - (limit - 1) * ms, lastClosedOpen: currentOpen - ms, closedCount: limit - 1 };
}

/** True when the DB holds every closed candle of the window with no gap (cache hit → only 2 recent candles needed). */
export function isWindowComplete(dbOpenTimes: number[], interval: Interval, b: WindowBounds): boolean {
  if (b.closedCount === 0) return true;
  if (dbOpenTimes.length !== b.closedCount) return false;
  const ms = INTERVAL_MS[interval];
  const sorted = [...dbOpenTimes].sort((x, y) => x - y);
  if (sorted[0] !== b.firstOpen || sorted[sorted.length - 1] !== b.lastClosedOpen) return false;
  for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] !== ms) return false;
  return true;
}

/** Merge DB candles with fresh provider candles (provider wins on equal openTime); newest `limit`, ascending. */
export function mergeCandles(fromDb: Candle[], fromProvider: Candle[], limit: number): Candle[] {
  const byOpen = new Map<number, Candle>();
  for (const c of fromDb) byOpen.set(c.openTime, c);
  for (const c of fromProvider) byOpen.set(c.openTime, c);
  return [...byOpen.values()].sort((a, b) => a.openTime - b.openTime).slice(-limit);
}
