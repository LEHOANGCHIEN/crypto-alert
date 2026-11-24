import { BinanceRestClient, parseExchangeInfo, parseKlines, parseTickers, tickSizeToPrecision } from './binance-rest';

describe('tickSizeToPrecision', () => {
  it.each([
    ['0.01000000', 2],
    ['1.00000000', 0],
    ['0.00000100', 6],
    ['0.10000000', 1],
    ['0.00000001', 8],
  ])('%s → %d', (tick, expected) => {
    expect(tickSizeToPrecision(tick)).toBe(expected);
  });
});

describe('parseExchangeInfo', () => {
  const pf = (tickSize: string) => [{ filterType: 'PRICE_FILTER', tickSize }];
  it('keeps only TRADING USDT spot pairs, sorted, with precision from tickSize', () => {
    const out = parseExchangeInfo({
      symbols: [
        { symbol: 'ETHUSDT', status: 'TRADING', baseAsset: 'ETH', quoteAsset: 'USDT', isSpotTradingAllowed: true, filters: pf('0.01000000') },
        { symbol: 'BTCUSDT', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDT', isSpotTradingAllowed: true, filters: pf('0.01000000') },
        { symbol: 'ETHBTC', status: 'TRADING', baseAsset: 'ETH', quoteAsset: 'BTC', isSpotTradingAllowed: true, filters: pf('0.00001000') },
        { symbol: 'OLDUSDT', status: 'BREAK', baseAsset: 'OLD', quoteAsset: 'USDT', isSpotTradingAllowed: true, filters: pf('0.01') },
        { symbol: 'NOSPOTUSDT', status: 'TRADING', baseAsset: 'NOSPOT', quoteAsset: 'USDT', isSpotTradingAllowed: false, filters: pf('0.01') },
        { symbol: 'SHIBUSDT', status: 'TRADING', baseAsset: 'SHIB', quoteAsset: 'USDT', isSpotTradingAllowed: true, filters: pf('0.00000001') },
      ],
    });
    expect(out.map((s) => s.symbol)).toEqual(['BTCUSDT', 'ETHUSDT', 'SHIBUSDT']);
    expect(out[0]).toEqual({ symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', tickSize: 0.01, pricePrecision: 2 });
    expect(out[2].pricePrecision).toBe(8);
  });
});

describe('parseTickers', () => {
  it('filters to allowed symbols, computes change %, sorts by quote volume desc', () => {
    const raw = [
      { symbol: 'AAAUSDT', lastPrice: '110', openPrice: '100', highPrice: '111', lowPrice: '99', volume: '1', quoteVolume: '10', closeTime: 5 },
      { symbol: 'BBBUSDT', lastPrice: '90', openPrice: '100', highPrice: '101', lowPrice: '89', volume: '1', quoteVolume: '50', closeTime: 6 },
      { symbol: 'ETHBTC', lastPrice: '1', openPrice: '1', highPrice: '1', lowPrice: '1', volume: '1', quoteVolume: '999', closeTime: 7 },
    ];
    const out = parseTickers(raw, new Set(['AAAUSDT', 'BBBUSDT']));
    expect(out.map((t) => t.symbol)).toEqual(['BBBUSDT', 'AAAUSDT']);
    expect(out[0].priceChangePercent).toBeCloseTo(-10);
    expect(out[1].priceChangePercent).toBeCloseTo(10);
  });
});

describe('parseKlines', () => {
  it('marks the candle whose closeTime is in the future as open', () => {
    const rows = [
      [1000, '1', '2', '0.5', '1.5', '10', 1999, '15', 3, '0', '0', '0'],
      [2000, '1.5', '2', '1', '1.8', '5', 2999, '9', 2, '0', '0', '0'],
    ];
    const out = parseKlines(rows, 2500);
    expect(out[0]).toMatchObject({ openTime: 1000, closeTime: 1999, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10, quoteVolume: 15, isClosed: true });
    expect(out[1].isClosed).toBe(false);
  });
});

describe('BinanceRestClient', () => {
  const resp = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

  it.each([429, 418, 451, 500])('HTTP %d → MARKET_DATA_UNAVAILABLE', async (status) => {
    const client = new BinanceRestClient('http://x', (async () => resp(status)) as typeof fetch);
    await expect(client.listSymbols()).rejects.toMatchObject({ code: 'MARKET_DATA_UNAVAILABLE' });
  });

  it('network failure → MARKET_DATA_UNAVAILABLE', async () => {
    const client = new BinanceRestClient('http://x', (async () => {
      throw new Error('boom');
    }) as typeof fetch);
    await expect(client.getKlines('BTCUSDT', '1h', { limit: 2 })).rejects.toMatchObject({ code: 'MARKET_DATA_UNAVAILABLE' });
  });

  it('passes symbol, interval, limit and endTime as query params', async () => {
    let seen = '';
    const client = new BinanceRestClient('http://x', (async (url: string) => {
      seen = url;
      return resp(200, []);
    }) as unknown as typeof fetch);
    await client.getKlines('BTCUSDT', '15m', { limit: 2, endTime: 123 });
    expect(seen).toBe('http://x/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=2&endTime=123');
  });
});
