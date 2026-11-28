import { describe, expect, it } from 'vitest';
import type { Ticker } from '../../shared/api/types';
import { topMovers } from './lib';

const t = (symbol: string, priceChangePercent: number) => ({ symbol, priceChangePercent }) as Ticker;
const TICKERS = [t('A', 1), t('B', -2), t('C', 5), t('D', 0), t('E', 5), t('F', -7), t('G', 3), t('H', 2)];

describe('topMovers', () => {
  it('gainers: highest change first, ties keep input order, at most 6', () => {
    expect(topMovers(TICKERS, 'gainers').map((x) => x.symbol)).toEqual(['C', 'E', 'G', 'H', 'A', 'D']);
  });

  it('losers: lowest change first', () => {
    expect(topMovers(TICKERS, 'losers').map((x) => x.symbol)).toEqual(['F', 'B', 'D', 'A', 'H', 'G']);
  });
});
