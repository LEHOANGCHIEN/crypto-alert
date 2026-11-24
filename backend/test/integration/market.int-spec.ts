import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/app';

describe('market REST (mock provider)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('GET /market/symbols → USDT pairs only, sorted by symbol, with precision', async () => {
    const res = await http().get('/api/v1/market/symbols').expect(200);
    expect(res.body.success).toBe(true);
    const symbols = res.body.data.map((s: { symbol: string }) => s.symbol);
    expect(symbols).toEqual([...symbols].sort());
    expect(symbols).toContain('BTCUSDT');
    expect(symbols).not.toContain('ETHBTC');
    expect(symbols).not.toContain('BTCUSDC');
    expect(res.body.data.find((s: { symbol: string }) => s.symbol === 'BTCUSDT')).toEqual({
      symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', tickSize: 0.01, pricePrecision: 2,
    });
  });

  it('GET /market/tickers → USDT only, quoteVolume desc, numeric fields', async () => {
    const res = await http().get('/api/v1/market/tickers').expect(200);
    const data = res.body.data as { symbol: string; quoteVolume: number; lastPrice: number; priceChangePercent: number }[];
    expect(data.length).toBe(8);
    expect(data.every((t) => t.symbol.endsWith('USDT'))).toBe(true);
    const vols = data.map((t) => t.quoteVolume);
    expect(vols).toEqual([...vols].sort((a, b) => b - a));
    expect(typeof data[0].lastPrice).toBe('number');
    expect(data.some((t) => t.priceChangePercent > 0)).toBe(true);
    expect(data.some((t) => t.priceChangePercent < 0)).toBe(true);
    expect(data.some((t) => t.priceChangePercent === 0)).toBe(true);
  });
});

describe('market klines + candle cache (mock provider, real DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let stats: () => Promise<{ klines: { symbol: string; interval: string; limit: number }[] }>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    stats = async () => (await http().get('/api/v1/test/market/stats').expect(200)).body.data.restCalls;
  });
  beforeEach(async () => {
    await http().post('/api/v1/test/reset').expect(201);
  });
  afterAll(async () => {
    await app.close();
  });

  it('first load returns 1000 ascending candles, last open, closed ones stored, open one not stored', async () => {
    const res = await http().get('/api/v1/market/klines?symbol=BTCUSDT&interval=1h').expect(200);
    const data = res.body.data as { openTime: number; isClosed: boolean; close: number }[];
    expect(data).toHaveLength(1000);
    for (let i = 1; i < data.length; i++) expect(data[i].openTime).toBeGreaterThan(data[i - 1].openTime);
    expect(data[999].isClosed).toBe(false);
    expect(data.slice(0, 999).every((c) => c.isClosed)).toBe(true);
    expect(await prisma.candle.count({ where: { symbol: 'BTCUSDT', interval: '1h' } })).toBe(999);
    expect((await stats()).klines).toEqual([{ symbol: 'BTCUSDT', interval: '1h', limit: 1000 }]);
  });

  it('second load fetches only 2 recent candles and returns the same window', async () => {
    const first = (await http().get('/api/v1/market/klines?symbol=BTCUSDT&interval=1h').expect(200)).body.data;
    const second = (await http().get('/api/v1/market/klines?symbol=BTCUSDT&interval=1h').expect(200)).body.data;
    expect(second).toHaveLength(1000);
    expect(second.map((c: { openTime: number }) => c.openTime)).toEqual(first.map((c: { openTime: number }) => c.openTime));
    const calls = (await stats()).klines;
    expect(calls).toHaveLength(2);
    expect(calls[1].limit).toBeLessThanOrEqual(2);
  });

  it('a gap in the cache triggers a full refetch and repairs the table', async () => {
    await http().get('/api/v1/market/klines?symbol=ETHUSDT&interval=15m').expect(200);
    const rows = await prisma.candle.findMany({ where: { symbol: 'ETHUSDT', interval: '15m' }, orderBy: { openTime: 'asc' } });
    await prisma.candle.delete({ where: { symbol_interval_openTime: { symbol: 'ETHUSDT', interval: '15m', openTime: rows[500].openTime } } });
    await http().get('/api/v1/market/klines?symbol=ETHUSDT&interval=15m').expect(200);
    expect((await stats()).klines.map((k) => k.limit)).toEqual([1000, 1000]);
    expect(await prisma.candle.count({ where: { symbol: 'ETHUSDT', interval: '15m' } })).toBe(999);
  });

  it('limit param is honoured', async () => {
    const res = await http().get('/api/v1/market/klines?symbol=BTCUSDT&interval=1h&limit=50').expect(200);
    expect(res.body.data).toHaveLength(50);
  });

  it('unknown but well-formed symbol → SYMBOL_NOT_FOUND (404)', async () => {
    const res = await http().get('/api/v1/market/klines?symbol=FAKEUSDT&interval=1h').expect(404);
    expect(res.body.error.code).toBe('SYMBOL_NOT_FOUND');
  });

  it('non-USDT symbol → SYMBOL_NOT_FOUND', async () => {
    await http().get('/api/v1/market/klines?symbol=ETHBTC&interval=1h').expect(404);
  });

  it.each([
    ['symbol=&interval=1h', 'symbol', 'REQUIRED'],
    ['interval=1h', 'symbol', 'REQUIRED'],
    ['symbol=BTC-USDT&interval=1h', 'symbol', 'INVALID_SYMBOL_FORMAT'],
    ['symbol=BTCUSDT&interval=2h', 'interval', 'INVALID_ENUM'],
    ['symbol=BTCUSDT', 'interval', 'REQUIRED'],
    ['symbol=BTCUSDT&interval=1h&limit=0', 'limit', 'OUT_OF_RANGE'],
    ['symbol=BTCUSDT&interval=1h&limit=1001', 'limit', 'OUT_OF_RANGE'],
    ['symbol=BTCUSDT&interval=1h&limit=abc', 'limit', 'INVALID_TYPE'],
  ])('query %s → VALIDATION_ERROR on %s (%s)', async (qs, field, code) => {
    const res = await http().get(`/api/v1/market/klines?${qs}`).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field, code })]));
  });

  it('lower-case symbol is accepted (upper-cased)', async () => {
    await http().get('/api/v1/market/klines?symbol=btcusdt&interval=1h&limit=5').expect(200);
  });
});

describe('test-support market controls (API.md §3.8)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await http().post('/api/v1/test/reset').expect(201);
  });
  afterAll(async () => {
    await app.close();
  });

  it('tick sets the last price, visible in GET /market/tickers and in the open candle', async () => {
    const res = await http().post('/api/v1/test/market/tick').send({ symbol: 'ETHUSDT', price: 3600, quoteVolume: 500_000_000 }).expect(201);
    expect(res.body.data.ticker).toMatchObject({ symbol: 'ETHUSDT', lastPrice: 3600, quoteVolume: 500_000_000, openPrice: 3400 });
    expect(res.body.data.ticker.priceChangePercent).toBeCloseTo((200 / 3400) * 100, 8);
    const tickers = (await http().get('/api/v1/market/tickers').expect(200)).body.data as { symbol: string; lastPrice: number }[];
    expect(tickers.find((t) => t.symbol === 'ETHUSDT')?.lastPrice).toBe(3600);
    const k = (await http().get('/api/v1/market/klines?symbol=ETHUSDT&interval=1m').expect(200)).body.data as { close: number; isClosed: boolean }[];
    expect(k[k.length - 1]).toMatchObject({ close: 3600, isClosed: false });
  });

  it('tick validates its body and the symbol', async () => {
    const bad = await http().post('/api/v1/test/market/tick').send({ symbol: 'ETHUSDT', price: -1 }).expect(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    const unknown = await http().post('/api/v1/test/market/tick').send({ symbol: 'FAKEUSDT', price: 1 }).expect(404);
    expect(unknown.body.error.code).toBe('SYMBOL_NOT_FOUND');
  });

  it('close-candle returns the closed and the opened candle; the closed one is cached', async () => {
    const res = await http().post('/api/v1/test/market/close-candle').send({ symbol: 'BTCUSDT', interval: '1h' }).expect(201);
    const { closed, opened } = res.body.data as { closed: { openTime: number; closeTime: number; close: number; isClosed: boolean }; opened: { openTime: number; open: number; isClosed: boolean } };
    expect(closed.isClosed).toBe(true);
    expect(opened).toMatchObject({ openTime: closed.closeTime + 1, open: closed.close, isClosed: false });
    const prisma = app.get(PrismaService);
    let row = null;
    for (let i = 0; i < 100 && !row; i++) row = await prisma.candle.findFirst({ where: { symbol: 'BTCUSDT', interval: '1h', openTime: new Date(closed.openTime) } });
    expect(row?.close.toNumber()).toBe(closed.close);
  });

  it('disconnect makes health report connected:false, then recovers; reset reconnects immediately', async () => {
    await http().post('/api/v1/test/market/disconnect').send({ durationMs: 300 }).expect(201);
    expect((await http().get('/api/v1/health').expect(200)).body.data.marketData.connected).toBe(false);
    const start = Date.now();
    let connected = false;
    while (!connected && Date.now() - start < 3000) {
      await new Promise((r) => setTimeout(r, 50));
      connected = (await http().get('/api/v1/health')).body.data.marketData.connected;
    }
    expect(connected).toBe(true);

    await http().post('/api/v1/test/market/disconnect').send({}).expect(201);
    await http().post('/api/v1/test/reset').expect(201);
    expect((await http().get('/api/v1/health').expect(200)).body.data.marketData.connected).toBe(true);
  });

  it('stats list the all-market ticker stream after reset', async () => {
    const res = await http().get('/api/v1/test/market/stats').expect(200);
    expect(res.body.data.upstreamStreams).toEqual(['!miniTicker@arr']);
    expect(res.body.data.restCalls).toEqual({ symbols: 0, tickers: 0, klines: [] });
  });
});
