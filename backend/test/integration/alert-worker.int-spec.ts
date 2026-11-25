import { INestApplication } from '@nestjs/common';
import { AlertWorker } from '../../src/modules/alerts/alert-worker.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { alertFlow, listen } from '../helpers/alert-flow';
import { createTestApp } from '../helpers/app';

describe('AlertWorker: tick → trigger → notification (real test DB)', () => {
  let app: INestApplication;
  let url: string;
  let prisma: PrismaService;
  const f = alertFlow(
    () => app,
    () => url,
  );

  beforeAll(async () => {
    app = await createTestApp();
    url = await listen(app);
    prisma = app.get(PrismaService);
  });
  afterEach(() => f.closeSockets());
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await f.http().post('/api/v1/test/reset').expect(201);
  });

  const alertRow = (id: number) => prisma.alert.findUniqueOrThrow({ where: { id } });
  const notificationsOf = (alertId: number) => prisma.notification.count({ where: { alertId } });

  it('ABOVE: a tick ≥ target triggers once → TRIGGERED row + notification + notification:new to the owner', async () => {
    const t = await f.demo();
    const p = await f.price('BTCUSDT');
    const id = await f.createAlert(t, 'BTCUSDT', 'ABOVE', p + 100);
    const s = await f.socketFor(t);

    await f.tick('BTCUSDT', p + 99.5); // not met
    const event = s.nextNew();
    await f.tick('BTCUSDT', p + 100); // exactly the target: met (≥)
    const { notification, unreadCount } = await event;

    expect(unreadCount).toBe(2); // seeded unread + this one
    expect(notification).toEqual({
      id: expect.any(Number),
      type: 'ALERT_TRIGGERED',
      payload: { alertId: id, symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: p + 100, triggeredPrice: p + 100 },
      readAt: null,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
    const row = await alertRow(id);
    expect(row.status).toBe('TRIGGERED');
    expect(row.triggeredPrice?.toNumber()).toBe(p + 100);
    expect(row.triggeredAt).toBeInstanceOf(Date);
    expect(s.received.new).toHaveLength(1);

    const api = (await f.http().get('/api/v1/alerts?status=TRIGGERED').set(f.auth(t)).expect(200)).body.data as { id: number; triggeredPrice: number; triggeredAt: string }[];
    expect(api.find((a) => a.id === id)).toMatchObject({ triggeredPrice: p + 100, triggeredAt: expect.stringMatching(/Z$/) });
  });

  it('BELOW: a tick ≤ target triggers', async () => {
    const t = await f.demo();
    const p = await f.price('ETHUSDT');
    const id = await f.createAlert(t, 'ETHUSDT', 'BELOW', p - 10);
    const s = await f.socketFor(t);
    const event = s.nextNew();
    await f.tick('ETHUSDT', p - 10.5);
    const { notification } = await event;
    expect(notification.payload).toEqual({ alertId: id, symbol: 'ETHUSDT', condition: 'BELOW', targetPrice: p - 10, triggeredPrice: p - 10.5 });
    expect((await alertRow(id)).status).toBe('TRIGGERED');
  });

  it('one-shot: a burst of 20 concurrent ticks and later crossings create exactly one notification', async () => {
    const t = await f.demo();
    const p = await f.price('BTCUSDT');
    const id = await f.createAlert(t, 'BTCUSDT', 'ABOVE', p + 100);
    const sentinel = await f.createAlert(t, 'SOLUSDT', 'ABOVE', (await f.price('SOLUSDT')) + 1);
    const s = await f.socketFor(t);

    const first = s.nextNew();
    await Promise.all(Array.from({ length: 20 }, (_, i) => f.tick('BTCUSDT', p + 101 + i)));
    expect((await first).notification.payload.alertId).toBe(id);
    await f.tick('BTCUSDT', p - 500);
    await f.tick('BTCUSDT', p + 500);
    // Sentinel: once its notification arrives, any duplicate for the first alert would already have been sent.
    const done = s.nextNew();
    await f.tick('SOLUSDT', (await f.price('SOLUSDT')) + 5);
    expect((await done).notification.payload.alertId).toBe(sentinel);

    expect(s.received.new.map((e) => e.notification.payload.alertId)).toEqual([id, sentinel]);
    expect(await notificationsOf(id)).toBe(1);
  });

  it('one-shot at the DB level: two concurrent trigger transactions for the same alert → one notification', async () => {
    const t = await f.demo();
    const p = await f.price('BTCUSDT');
    const id = await f.createAlert(t, 'BTCUSDT', 'ABOVE', p + 100);
    const me = (await f.http().get('/api/v1/users/me').set(f.auth(t)).expect(200)).body.data.id as number;
    const worker = app.get(AlertWorker) as unknown as { trigger: (a: object, price: number) => Promise<void> };
    const alert = { id, userId: me, symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: p + 100 };
    await Promise.all([worker.trigger(alert, p + 150), worker.trigger(alert, p + 160), worker.trigger(alert, p + 170)]);
    expect(await notificationsOf(id)).toBe(1);
    expect((await alertRow(id)).status).toBe('TRIGGERED');
  });

  it('a deleted alert never triggers', async () => {
    const t = await f.demo();
    const p = await f.price('BTCUSDT');
    const id = await f.createAlert(t, 'BTCUSDT', 'ABOVE', p + 100);
    const sentinel = await f.createAlert(t, 'SOLUSDT', 'ABOVE', (await f.price('SOLUSDT')) + 1);
    await f.http().delete(`/api/v1/alerts/${id}`).set(f.auth(t)).expect(200);
    const s = await f.socketFor(t);

    await f.tick('BTCUSDT', p + 500);
    const done = s.nextNew();
    await f.tick('SOLUSDT', (await f.price('SOLUSDT')) + 5);
    await done;
    expect(s.received.new.map((e) => e.notification.payload.alertId)).toEqual([sentinel]);
    expect(await prisma.notification.count({ where: { payload: { path: ['alertId'], equals: id } } })).toBe(0);
  });

  it("isolation: user B's sockets never receive user A's notification", async () => {
    const a = await f.demo();
    const b = await f.register('b@example.com');
    const p = await f.price('BTCUSDT');
    await f.createAlert(a, 'BTCUSDT', 'ABOVE', p + 100);
    const bSentinel = await f.createAlert(b, 'SOLUSDT', 'ABOVE', (await f.price('SOLUSDT')) + 1);
    const sa = await f.socketFor(a);
    const sb = await f.socketFor(b);

    const aGot = sa.nextNew();
    await f.tick('BTCUSDT', p + 200);
    await aGot;
    const bGot = sb.nextNew();
    await f.tick('SOLUSDT', (await f.price('SOLUSDT')) + 5);
    const own = await bGot;
    expect(own.notification.payload.alertId).toBe(bSentinel);
    expect(own.unreadCount).toBe(1);
    expect(sb.received.new).toHaveLength(1);
    expect(sa.received.new).toHaveLength(1);
  });

  it('reload rebuilds the index from the DB: an alert inserted behind the worker’s back triggers only after /test/worker/reload', async () => {
    const t = await f.demo();
    const me = (await f.http().get('/api/v1/users/me').set(f.auth(t)).expect(200)).body.data.id as number;
    const p = await f.price('BTCUSDT');
    const hidden = await prisma.alert.create({ data: { userId: me, symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: p + 100 } });
    const sentinel = await f.createAlert(t, 'SOLUSDT', 'ABOVE', (await f.price('SOLUSDT')) + 1);
    const s = await f.socketFor(t);

    await f.tick('BTCUSDT', p + 200);
    const done = s.nextNew();
    await f.tick('SOLUSDT', (await f.price('SOLUSDT')) + 5);
    await done;
    expect(s.received.new.map((e) => e.notification.payload.alertId)).toEqual([sentinel]);
    expect((await alertRow(hidden.id)).status).toBe('ACTIVE');

    // Seed: 2 ACTIVE alerts + the hidden one (the sentinel has triggered).
    expect((await f.http().post('/api/v1/test/worker/reload').expect(201)).body.data).toEqual({ activeAlerts: 3 });
    const event = s.nextNew();
    await f.tick('BTCUSDT', p + 201);
    expect((await event).notification.payload.alertId).toBe(hidden.id);
  });

  it('an alert created right after a reload is still watched (index kept in sync)', async () => {
    const t = await f.demo();
    await f.http().post('/api/v1/test/worker/reload').expect(201);
    const p = await f.price('DOGEUSDT');
    const id = await f.createAlert(t, 'DOGEUSDT', 'BELOW', Number((p * 0.9).toFixed(6)));
    const s = await f.socketFor(t);
    const event = s.nextNew();
    await f.tick('DOGEUSDT', Number((p * 0.8).toFixed(6)));
    expect((await event).notification.payload.alertId).toBe(id);
  });
});
