import { MockProvider } from './mock.provider';
import { PriceBus } from '../../price-bus';

describe('MockProvider', () => {
  const mock = () => new MockProvider(new PriceBus());

  it('lists only USDT pairs with precision from tickSize (ETHBTC / BTCUSDC filtered)', async () => {
    const syms = await mock().listSymbols();
    expect(syms.map((s) => s.symbol)).toEqual(['ADAUSDT', 'BNBUSDT', 'BTCUSDT', 'DOGEUSDT', 'ETHUSDT', 'LINKUSDT', 'SOLUSDT', 'XRPUSDT']);
    expect(syms.find((s) => s.symbol === 'DOGEUSDT')?.pricePrecision).toBe(5);
    expect(syms.find((s) => s.symbol === 'BTCUSDT')?.pricePrecision).toBe(2);
  });

  it('tickers are sorted by quote volume and contain an up, a down and a flat pair', async () => {
    const t = await mock().get24hTickers();
    const vols = t.map((x) => x.quoteVolume);
    expect(vols).toEqual([...vols].sort((a, b) => b - a));
    expect(t.some((x) => x.priceChangePercent > 0)).toBe(true);
    expect(t.some((x) => x.priceChangePercent < 0)).toBe(true);
    expect(t.some((x) => x.priceChangePercent === 0)).toBe(true);
  });

  it('BTCUSDT 1h returns 1000 ascending candles, only the last one open', async () => {
    const c = await mock().getKlines('BTCUSDT', '1h', { limit: 1000 });
    expect(c).toHaveLength(1000);
    for (let i = 1; i < c.length; i++) expect(c[i].openTime - c[i - 1].openTime).toBe(3_600_000);
    expect(c.slice(0, -1).every((x) => x.isClosed)).toBe(true);
    expect(c[999].isClosed).toBe(false);
    expect(c[999].openTime).toBe(Math.floor(Date.now() / 3_600_000) * 3_600_000);
  });

  it('other pairs are deterministic and the last close equals the ticker price', async () => {
    const m = mock();
    const a = await m.getKlines('ETHUSDT', '15m', { limit: 50 });
    const b = await m.getKlines('ETHUSDT', '15m', { limit: 50 });
    expect(a).toEqual(b);
    const tick = (await m.get24hTickers()).find((t) => t.symbol === 'ETHUSDT');
    expect(a[a.length - 1].close).toBe(tick?.lastPrice);
  });

  it('counts REST calls and reset clears them', async () => {
    const m = mock();
    await m.listSymbols();
    await m.getKlines('BTCUSDT', '1h', { limit: 2 });
    expect(m.getStats().restCalls).toEqual({ symbols: 1, tickers: 0, klines: [{ symbol: 'BTCUSDT', interval: '1h', limit: 2 }] });
    m.reset();
    expect(m.getStats().restCalls.klines).toEqual([]);
  });
});
