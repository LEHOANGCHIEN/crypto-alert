import type { Interval } from '../../../shared/api/types';

/** Range chips / performance tiles of the coin page (AC-COIN-02/03). */
export const RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y'] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = '1D';

export type KlineQuery = { interval: Interval; limit: number };

/** The klines the area chart requests for a range (AC-COIN-02). `ytdDays` = whole days since 1 Jan in the user's timezone. */
export function chartQuery(range: Range, ytdDays: number): KlineQuery {
  switch (range) {
    case '1D':
      return { interval: '5m', limit: 288 };
    case '1W':
      return { interval: '1h', limit: 168 };
    case '1M':
      return { interval: '4h', limit: 180 };
    case '3M':
      return { interval: '1d', limit: 90 };
    case '6M':
      return { interval: '1d', limit: 180 };
    case 'YTD':
      return { interval: '1d', limit: Math.min(365, Math.max(1, ytdDays)) };
    case '1Y':
      return { interval: '1d', limit: 365 };
  }
}

/** Shared queries behind the tiles and the 52-week stats; daily ranges are slices of the last 365 daily candles. */
export const DAILY_BASE: KlineQuery = { interval: '1d', limit: 365 };
export const TILE_BASES: KlineQuery[] = [
  { interval: '5m', limit: 288 },
  { interval: '1h', limit: 168 },
  { interval: '4h', limit: 180 },
  DAILY_BASE,
];

/** Which base query a tile reads and how many of its last candles belong to the range. */
export function tileSource(range: Range, ytdDays: number): { base: KlineQuery; count: number } {
  const own = chartQuery(range, ytdDays);
  return own.interval === '1d' ? { base: DAILY_BASE, count: own.limit } : { base: own, count: own.limit };
}

export const queryId = (q: KlineQuery): string => `${q.interval}:${q.limit}`;
