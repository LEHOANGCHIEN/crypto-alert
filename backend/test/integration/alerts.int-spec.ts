import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/app';

type AlertJson = { id: number; symbol: string; condition: string; targetPrice: number; status: string; triggeredPrice: number | null; createdAt: string; triggeredAt: string | null };

describe('alerts API (real test DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  const login = async (email: string, password: string): Promise<string> =>
    (await http().post('/api/v1/auth/login').send({ email, password }).expect(200)).body.data.accessToken;
  const demo = () => login('demo@example.com', 'Demo@123456');
  const register = async (email: string): Promise<string> =>
    (await http().post('/api/v1/auth/register').send({ email, password: 'Passw0rdX', displayName: 'User B' }).expect(201)).body.data.accessToken;
  const price = async (symbol: string): Promise<number> =>
    ((await http().get('/api/v1/market/tickers').expect(200)).body.data as { symbol: string; lastPrice: number }[]).find((t) => t.symbol === symbol)!.lastPrice;
  const create = (t: string, body: object) => http().post('/api/v1/alerts').set(auth(t)).send(body);

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
    expect((await http().get('/api/v1/alerts').expect(401)).body.error.code).toBe('UNAUTHENTICATED');
    await http().post('/api/v1/alerts').send({}).expect(401);
    await http().delete('/api/v1/alerts/1').expect(401);
  });

  it('GET lists the seeded alerts newest first with exactly the Alert fields; ?status filters', async () => {
    const t = await demo();
    const all = (await http().get('/api/v1/alerts').set(auth(t)).expect(200)).body.data as AlertJson[];
    expect(all).toHaveLength(3);
    expect(Object.keys(all[0]).sort()).toEqual(['condition', 'createdAt', 'id', 'status', 'symbol', 'targetPrice', 'triggeredAt', 'triggeredPrice']);
    const created = all.map((a) => Date.parse(a.createdAt));
    expect([...created].sort((a, b) => b - a)).toEqual(created);
    const triggered = all.find((a) => a.status === 'TRIGGERED')!;
    expect(triggered).toMatchObject({ symbol: 'SOLUSDT', condition: 'ABOVE', targetPrice: 100, triggeredPrice: 101.5 });
    expect(triggered.triggeredAt).toMatch(/Z$/);

    const active = (await http().get('/api/v1/alerts?status=ACTIVE').set(auth(t)).expect(200)).body.data as AlertJson[];
    expect(active.map((a) => a.symbol).sort()).toEqual(['BTCUSDT', 'ETHUSDT']);
    expect(active.every((a) => a.triggeredPrice === null && a.triggeredAt === null)).toBe(true);
    const bad = await http().get('/api/v1/alerts?status=DONE').set(auth(t)).expect(400);
    expect(bad.body.error).toEqual({ code: 'VALIDATION_ERROR', details: [{ field: 'status', code: 'INVALID_ENUM' }] });
  });

  it('POST creates an ACTIVE alert (201) with number prices; symbol is upper-cased', async () => {
    const t = await demo();
    const p = await price('BTCUSDT');
    const res = await create(t, { symbol: 'btcusdt', condition: 'ABOVE', targetPrice: p + 100.12345678 }).expect(201);
    expect(res.body.data).toMatchObject({ symbol: 'BTCUSDT', condition: 'ABOVE', status: 'ACTIVE', triggeredPrice: null, triggeredAt: null });
    expect(typeof res.body.data.targetPrice).toBe('number');
    expect(res.body.data.targetPrice).toBeCloseTo(p + 100.12345678, 6);
    expect(typeof res.body.data.id).toBe('number');
  });

  it.each([
    [{ symbol: 'BTCUSDT', condition: 'ABOVE' }, 'targetPrice', 'REQUIRED'],
    [{ symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: '100' }, 'targetPrice', 'INVALID_TYPE'],
    [{ symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: 0 }, 'targetPrice', 'OUT_OF_RANGE'],
    [{ symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: -5 }, 'targetPrice', 'OUT_OF_RANGE'],
    [{ symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: 2e15 }, 'targetPrice', 'OUT_OF_RANGE'],
    [{ symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: 1.123456789 }, 'targetPrice', 'TOO_MANY_DECIMALS'],
    [{ symbol: 'BTCUSDT', condition: 'SIDEWAYS', targetPrice: 1 }, 'condition', 'INVALID_ENUM'],
    [{ symbol: 'BTC-USDT', condition: 'ABOVE', targetPrice: 1 }, 'symbol', 'INVALID_SYMBOL_FORMAT'],
    [{ symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: 1e9, note: 'x' }, 'note', 'UNKNOWN_FIELD'],
  ])('POST %j → VALIDATION_ERROR %s %s', async (body, field, code) => {
    const t = await demo();
    const res = await create(t, body).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ field, code }));
  });

  it('POST rejects unknown and non-USDT symbols with SYMBOL_NOT_FOUND', async () => {
    const t = await demo();
    expect((await create(t, { symbol: 'FAKEUSDT', condition: 'ABOVE', targetPrice: 1 }).expect(404)).body.error.code).toBe('SYMBOL_NOT_FOUND');
    expect((await create(t, { symbol: 'ETHBTC', condition: 'ABOVE', targetPrice: 1 }).expect(404)).body.error.code).toBe('SYMBOL_NOT_FOUND');
  });

  it('ALERT_CONDITION_ALREADY_MET for ABOVE ≤ price and BELOW ≥ price (422)', async () => {
    const t = await demo();
    const p = await price('ETHUSDT');
    for (const body of [
      { symbol: 'ETHUSDT', condition: 'ABOVE', targetPrice: p },
      { symbol: 'ETHUSDT', condition: 'ABOVE', targetPrice: p - 1 },
      { symbol: 'ETHUSDT', condition: 'BELOW', targetPrice: p },
      { symbol: 'ETHUSDT', condition: 'BELOW', targetPrice: p + 1 },
    ]) {
      expect((await create(t, body).expect(422)).body.error.code).toBe('ALERT_CONDITION_ALREADY_MET');
    }
    await create(t, { symbol: 'ETHUSDT', condition: 'BELOW', targetPrice: p - 1 }).expect(201);
  });

  it('limit 20 ACTIVE: the 21st → ALERT_LIMIT_REACHED (checked before the price); TRIGGERED alerts do not count', async () => {
    const t = await demo();
    const p = await price('BTCUSDT');
    for (let i = 0; i < 18; i++) await create(t, { symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: p + 10 + i }).expect(201);
    expect((await create(t, { symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: p + 1000 }).expect(409)).body.error.code).toBe('ALERT_LIMIT_REACHED');
    // Check order: limit comes before "already met".
    expect((await create(t, { symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: 1 }).expect(409)).body.error.code).toBe('ALERT_LIMIT_REACHED');
    // Validation and symbol checks come before the limit.
    await create(t, { symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: 0 }).expect(400);
    await create(t, { symbol: 'FAKEUSDT', condition: 'ABOVE', targetPrice: 1 }).expect(404);
    const me = (await http().get('/api/v1/users/me').set(auth(t)).expect(200)).body.data.id as number;
    expect(await prisma.alert.count({ where: { userId: me, status: 'ACTIVE' } })).toBe(20);
  });

  it('DELETE removes ACTIVE and TRIGGERED alerts; missing/other user → ALERT_NOT_FOUND; bad id → VALIDATION_ERROR', async () => {
    const t = await demo();
    const [first, , triggered] = ((await http().get('/api/v1/alerts').set(auth(t)).expect(200)).body.data as AlertJson[]).sort((a, b) => a.id - b.id);
    expect((await http().delete(`/api/v1/alerts/${first.id}`).set(auth(t)).expect(200)).body.data).toEqual({ id: first.id });
    await http().delete(`/api/v1/alerts/${triggered.id}`).set(auth(t)).expect(200);
    expect((await http().delete(`/api/v1/alerts/${first.id}`).set(auth(t)).expect(404)).body.error.code).toBe('ALERT_NOT_FOUND');
    expect((await http().get('/api/v1/alerts').set(auth(t)).expect(200)).body.data).toHaveLength(1);
    // The notification of the deleted triggered alert is kept (alert_id → NULL).
    expect(await prisma.notification.count({ where: { alertId: null } })).toBe(1);
    expect((await http().delete('/api/v1/alerts/abc').set(auth(t)).expect(400)).body.error.code).toBe('VALIDATION_ERROR');
    expect((await http().delete('/api/v1/alerts/1.5').set(auth(t)).expect(400)).body.error.code).toBe('VALIDATION_ERROR');
  });

  it("isolation: user B sees none of A's alerts and cannot delete them", async () => {
    const a = await demo();
    const b = await register('b@example.com');
    const ids = ((await http().get('/api/v1/alerts').set(auth(a)).expect(200)).body.data as AlertJson[]).map((x) => x.id);
    expect((await http().get('/api/v1/alerts').set(auth(b)).expect(200)).body.data).toEqual([]);
    for (const id of ids) expect((await http().delete(`/api/v1/alerts/${id}`).set(auth(b)).expect(404)).body.error.code).toBe('ALERT_NOT_FOUND');
    expect((await http().get('/api/v1/alerts').set(auth(a)).expect(200)).body.data).toHaveLength(3);
  });
});
