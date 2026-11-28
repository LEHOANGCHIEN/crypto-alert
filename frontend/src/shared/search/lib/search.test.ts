import { describe, expect, it } from 'vitest';
import { matchPages, normalize, pairRank, searchPairs } from './search';
import { addRecent, parseRecent } from './recent';

const PAIRS = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC' },
  { symbol: 'ETHUSDT', baseAsset: 'ETH' },
  { symbol: 'LINKUSDT', baseAsset: 'LINK' },
  { symbol: 'XETHUSDT', baseAsset: 'XETH' },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE' },
];

describe('search', () => {
  it('normalizes case and diacritics', () => {
    expect(normalize('  Biểu ĐỒ ')).toBe('bieu do');
  });

  it('ranks exact base asset first, then prefixes, then contains', () => {
    expect(searchPairs(PAIRS, 'eth').map((p) => p.symbol)).toEqual(['ETHUSDT', 'XETHUSDT']);
    expect(pairRank(PAIRS[0]!, 'bitcoin')).toBe(3); // known name prefix
    expect(pairRank(PAIRS[0]!, 'zzz')).toBeNull();
    expect(pairRank(PAIRS[0]!, '')).toBeNull();
  });

  it('matches on a known coin name', () => {
    expect(searchPairs(PAIRS, 'dogecoin').map((p) => p.symbol)).toEqual(['DOGEUSDT']);
  });

  it('keeps the given order for equal ranks and applies the limit', () => {
    expect(searchPairs(PAIRS, 'usdt', 2).map((p) => p.symbol)).toEqual(['BTCUSDT', 'ETHUSDT']);
  });

  it('matches pages on their translated label without diacritics', () => {
    const pages = [{ label: 'Siêu biểu đồ' }, { label: 'Cảnh báo giá' }];
    expect(matchPages(pages, 'bieu do')).toEqual([pages[0]]);
    expect(matchPages(pages, 'canh')).toEqual([pages[1]]);
    expect(matchPages(pages, '')).toEqual([]);
  });
});

describe('recent symbols', () => {
  it('keeps the newest first, deduplicated, at most 5', () => {
    let list: string[] = [];
    for (const s of ['A1', 'B2', 'C3', 'D4', 'E5', 'F6', 'C3']) list = addRecent(list, s);
    expect(list).toEqual(['C3', 'F6', 'E5', 'D4', 'B2']);
  });

  it('parses defensively', () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent('not json')).toEqual([]);
    expect(parseRecent('{"a":1}')).toEqual([]);
    expect(parseRecent('["BTCUSDT","bad symbol",3,"BTCUSDT","ETHUSDT"]')).toEqual(['BTCUSDT', 'ETHUSDT']);
  });
});
