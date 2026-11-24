import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/app';

describe('watchlist (real test DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  const login = async (email: string, password: string): Promise<string> =>
    (await http().post('/api/v1/auth/login').send({ email, password }).expect(200)).body.data.accessToken;
  const demo = () => login('demo@example.com', 'Demo@123456');
  const register = async (email: string): Promise<{ token: string; id: number }> => {
    const res = await http().post('/api/v1/auth/register').send({ email, password: 'Passw0rdX', displayName: 'User B' }).expect(201);
    return { token: res.body.data.accessToken, id: res.body.data.user.id };
  };
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const symbolsOf = (res: request.Response): string[] => res.body.data.map((i: { symbol: string }) => i.symbol);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await http().post('/api/v1/test/reset').expect(201);
  });

  it('requires a valid access token', async () => {
    const res = await http().get('/api/v1/watchlist').expect(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    await http().put('/api/v1/watchlist/BTCUSDT').expect(401);
    await http().delete('/api/v1/watchlist/BTCUSDT').expect(401);
  });

  it('GET lists seeded items oldest first with ISO createdAt', async () => {
    const t = await demo();
    const res = await http().get('/api/v1/watchlist').set(auth(t)).expect(200);
    expect(symbolsOf(res)).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
    expect(res.body.data[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['createdAt', 'symbol']);
  });

  it('PUT adds at the end; PUT twice is idempotent (one row, same item); lower-case path is upper-cased', async () => {
    const t = await demo();
    const first = await http().put('/api/v1/watchlist/xrpusdt').set(auth(t)).expect(200);
    expect(first.body.data.symbol).toBe('XRPUSDT');
    const second = await http().put('/api/v1/watchlist/XRPUSDT').set(auth(t)).expect(200);
    expect(second.body.data).toEqual(first.body.data);
    const list = await http().get('/api/v1/watchlist').set(auth(t)).expect(200);
    expect(symbolsOf(list)).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT']);
  });

  it('PUT rejects a bad format (VALIDATION_ERROR) and an unknown or non-USDT symbol (SYMBOL_NOT_FOUND)', async () => {
    const t = await demo();
    const bad = await http().put('/api/v1/watchlist/BTC-USDT').set(auth(t)).expect(400);
    expect(bad.body.error).toEqual({ code: 'VALIDATION_ERROR', details: [{ field: 'symbol', code: 'INVALID_SYMBOL_FORMAT' }] });
    expect((await http().put('/api/v1/watchlist/FAKEUSDT').set(auth(t)).expect(404)).body.error.code).toBe('SYMBOL_NOT_FOUND');
    expect((await http().put('/api/v1/watchlist/ETHBTC').set(auth(t)).expect(404)).body.error.code).toBe('SYMBOL_NOT_FOUND');
  });

  it('DELETE removes the item and is idempotent', async () => {
    const t = await demo();
    const res = await http().delete('/api/v1/watchlist/ETHUSDT').set(auth(t)).expect(200);
    expect(res.body.data).toEqual({ symbol: 'ETHUSDT' });
    await http().delete('/api/v1/watchlist/ETHUSDT').set(auth(t)).expect(200);
    await http().delete('/api/v1/watchlist/NOTINLISTUSDT').set(auth(t)).expect(200);
    expect(symbolsOf(await http().get('/api/v1/watchlist').set(auth(t)))).toEqual(['BTCUSDT', 'SOLUSDT']);
    expect((await http().delete('/api/v1/watchlist/a').set(auth(t)).expect(400)).body.error.code).toBe('VALIDATION_ERROR');
  });

  it('limit 50: the 51st item → WATCHLIST_LIMIT_REACHED; an existing item can still be PUT at the limit', async () => {
    const t = await demo();
    const me = (await http().get('/api/v1/users/me').set(auth(t)).expect(200)).body.data.id as number;
    await prisma.watchlistItem.createMany({ data: Array.from({ length: 47 }, (_, i) => ({ userId: me, symbol: `FILL${i}USDT` })) });
    expect(await prisma.watchlistItem.count({ where: { userId: me } })).toBe(50);
    const res = await http().put('/api/v1/watchlist/XRPUSDT').set(auth(t)).expect(409);
    expect(res.body.error.code).toBe('WATCHLIST_LIMIT_REACHED');
    await http().put('/api/v1/watchlist/BTCUSDT').set(auth(t)).expect(200);
    expect(await prisma.watchlistItem.count({ where: { userId: me } })).toBe(50);
    // freeing one slot allows adding again
    await http().delete('/api/v1/watchlist/BTCUSDT').set(auth(t)).expect(200);
    await http().put('/api/v1/watchlist/XRPUSDT').set(auth(t)).expect(200);
  });

  it('users are isolated: B sees an empty list, B deleting does not touch A, same symbol is separate per user', async () => {
    const a = await demo();
    const b = await register('b@example.com');
    expect((await http().get('/api/v1/watchlist').set(auth(b.token)).expect(200)).body.data).toEqual([]);
    await http().put('/api/v1/watchlist/BTCUSDT').set(auth(b.token)).expect(200);
    await http().delete('/api/v1/watchlist/ETHUSDT').set(auth(b.token)).expect(200);
    expect(symbolsOf(await http().get('/api/v1/watchlist').set(auth(a)))).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
    expect(symbolsOf(await http().get('/api/v1/watchlist').set(auth(b.token)))).toEqual(['BTCUSDT']);
  });
});
