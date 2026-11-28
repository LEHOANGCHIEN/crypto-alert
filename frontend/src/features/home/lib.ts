import type { Ticker } from '../../shared/api/types';

export const SUMMARY_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'] as const;
export const MOVERS_COUNT = 6;

/** Top `count` tickers by 24h change %: gainers = descending, losers = ascending (ties keep the input order). */
export function topMovers(tickers: Ticker[], kind: 'gainers' | 'losers', count = MOVERS_COUNT): Ticker[] {
  const sign = kind === 'gainers' ? -1 : 1;
  return tickers
    .map((t, index) => ({ t, index }))
    .sort((a, b) => sign * (a.t.priceChangePercent - b.t.priceChangePercent) || a.index - b.index)
    .slice(0, count)
    .map((x) => x.t);
}
