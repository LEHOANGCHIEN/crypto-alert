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

  it('tick updates the ticker and the open candle of every interval, and emits on the PriceBus', async () => {
    const bus = new PriceBus();
    const events: string[] = [];
    bus.on('ticker', (t) => events.push(`ticker ${t.symbol} ${t.lastPrice}`));
    bus.on('kline', (k) => events.push(`kline ${k.interval} ${k.candle.close} ${k.candle.isClosed}`));
    const m = new MockProvider(bus);
    await m.start();
    const before = (await m.get24hTickers()).find((t) => t.symbol === 'ETHUSDT')!;
    const t = m.tick('ETHUSDT', 4000, 123);
    expect(t).toMatchObject({ symbol: 'ETHUSDT', lastPrice: 4000, highPrice: 4000, quoteVolume: 123, openPrice: before.openPrice });
    expect(t.priceChangePercent).toBeCloseTo(((4000 - before.openPrice) / before.openPrice) * 100, 10);
    expect(events).toEqual([
      'ticker ETHUSDT 4000',
      ...['1m', '5m', '15m', '1h', '4h', '1d'].map((i) => `kline ${i} 4000 false`),
    ]);
    expect((await m.get24hTickers()).find((x) => x.symbol === 'ETHUSDT')?.lastPrice).toBe(4000);
    const k = await m.getKlines('ETHUSDT', '1h', { limit: 1000 });
    expect(k).toHaveLength(1000);
    expect(k[999]).toMatchObject({ close: 4000, high: 4000, isClosed: false });
    await m.stop();
  });

  it('closeCandle closes the open candle and opens the next one; getKlines includes both', async () => {
    const m = mock();
    m.tick('BTCUSDT', 70000);
    const { closed, opened } = m.closeCandle('BTCUSDT', '1h');
    expect(closed).toMatchObject({ isClosed: true, close: 70000 });
    expect(closed.closeTime - closed.openTime).toBe(3_600_000 - 1);
    expect(opened).toMatchObject({ openTime: closed.closeTime + 1, open: 70000, high: 70000, low: 70000, close: 70000, isClosed: false });
    const k = await m.getKlines('BTCUSDT', '1h', { limit: 1000 });
    expect(k).toHaveLength(1000);
    expect(k[998]).toEqual(closed);
    expect(k[999]).toEqual(opened);
    expect((await m.getKlines('BTCUSDT', '1h', { limit: 2 })).map((c) => c.openTime)).toEqual([closed.openTime, opened.openTime]);
  });

  it('simulated disconnect: reconnecting, no emits while down, then connected with gap recovery', async () => {
    jest.useFakeTimers();
    try {
      const bus = new PriceBus();
      const events: string[] = [];
      bus.on('status', (s) => events.push(s.status));
      bus.on('ticker', () => events.push('ticker'));
      bus.on('kline', (k) => events.push(`kline ${k.interval}`));
      const m = new MockProvider(bus);
      await m.start();
      events.length = 0;
      m.subscribeKlines('BTCUSDT', '1m');
      m.simulateDisconnect(3000);
      expect(m.getStatus().connected).toBe(false);
      m.tick('BTCUSDT', 1);
      expect(events).toEqual(['reconnecting']);
      jest.advanceTimersByTime(3000);
      expect(m.getStatus().connected).toBe(true);
      expect(events).toEqual(['reconnecting', 'connected', 'kline 1m', 'kline 1m']);
      await m.stop();
    } finally {
      jest.useRealTimers();
    }
  });

  it('stats list upstream streams sorted, starting with the all-market ticker stream', () => {
    const m = mock();
    m.subscribeKlines('ETHUSDT', '15m');
    m.subscribeKlines('BTCUSDT', '1h');
    expect(m.getStats().upstreamStreams).toEqual(['!miniTicker@arr', 'btcusdt@kline_1h', 'ethusdt@kline_15m']);
    m.unsubscribeKlines('BTCUSDT', '1h');
    expect(m.getStats().upstreamStreams).toEqual(['!miniTicker@arr', 'ethusdt@kline_15m']);
  });

  it('reset restores prices and candles', async () => {
    const m = mock();
    const original = (await m.get24hTickers()).find((t) => t.symbol === 'SOLUSDT')!.lastPrice;
    m.tick('SOLUSDT', 999);
    m.closeCandle('SOLUSDT', '1m');
    m.reset();
    expect((await m.get24hTickers()).find((t) => t.symbol === 'SOLUSDT')!.lastPrice).toBe(original);
    const k = await m.getKlines('SOLUSDT', '1m', { limit: 3 });
    expect(k[2].openTime).toBe(Math.floor(Date.now() / 60_000) * 60_000);
  });
});
