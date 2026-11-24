import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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
