import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { alertFlow, listen, type NotificationJson } from '../helpers/alert-flow';
import { createTestApp } from '../helpers/app';

describe('notifications API + notification:read (real test DB)', () => {
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

  const meId = async (t: string): Promise<number> => (await f.http().get('/api/v1/users/me').set(f.auth(t)).expect(200)).body.data.id;
  const list = async (t: string, query = '') => (await f.http().get(`/api/v1/notifications${query}`).set(f.auth(t)).expect(200)).body.data as { items: NotificationJson[]; unreadCount: number };
  /** Adds `n` unread notifications with increasing createdAt (newest last). */
  const addNotifications = async (userId: number, n: number) => {
    const base = Date.now();
    for (let i = 0; i < n; i++) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'ALERT_TRIGGERED',
          payload: { alertId: 900 + i, symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: 100 + i, triggeredPrice: 101 + i },
          createdAt: new Date(base + i * 1000),
        },
      });
    }
  };

  it('requires a valid access token', async () => {
    expect((await f.http().get('/api/v1/notifications').expect(401)).body.error.code).toBe('UNAUTHENTICATED');
    await f.http().post('/api/v1/notifications/1/read').expect(401);
    await f.http().post('/api/v1/notifications/read-all').expect(401);
  });

  it('GET returns the seeded unread notification with exactly the Notification fields', async () => {
    const t = await f.demo();
    const res = await list(t);
    expect(res.unreadCount).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(Object.keys(res.items[0]).sort()).toEqual(['createdAt', 'id', 'payload', 'readAt', 'type']);
    expect(res.items[0]).toMatchObject({ type: 'ALERT_TRIGGERED', readAt: null, payload: { symbol: 'SOLUSDT', condition: 'ABOVE', targetPrice: 100, triggeredPrice: 101.5 } });
    expect(res.items[0].createdAt).toMatch(/Z$/);
  });

  it('newest first; limit returns fewer items but unreadCount counts all unread; limit is validated', async () => {
    const t = await f.demo();
    await addNotifications(await meId(t), 4);
    const all = await list(t);
    expect(all.items).toHaveLength(5);
    const times = all.items.map((n) => Date.parse(n.createdAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(all.items[0].payload.alertId).toBe(903);

    const two = await list(t, '?limit=2');
    expect(two.items.map((n) => n.payload.alertId)).toEqual([903, 902]);
    expect(two.unreadCount).toBe(5);

    for (const bad of ['0', '101', 'abc']) {
      const res = await f.http().get(`/api/v1/notifications?limit=${bad}`).set(f.auth(t)).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].field).toBe('limit');
    }
  });

  it('POST /:id/read marks one read (200, idempotent) and emits notification:read to every socket of the user only', async () => {
    const a = await f.demo();
    const b = await f.register('b@example.com');
    await addNotifications(await meId(a), 1);
    const [newest, seeded] = (await list(a)).items;
    const tab1 = await f.socketFor(a);
    const tab2 = await f.socketFor(a);
    const other = await f.socketFor(b);

    const e1 = tab1.nextRead();
    const e2 = tab2.nextRead();
    const res = await f.http().post(`/api/v1/notifications/${seeded.id}/read`).set(f.auth(a)).expect(200);
    expect(res.body.data).toMatchObject({ id: seeded.id, readAt: expect.stringMatching(/Z$/) });
    expect(await e1).toEqual({ ids: [seeded.id], unreadCount: 1 });
    expect(await e2).toEqual({ ids: [seeded.id], unreadCount: 1 });

    // Idempotent: same readAt, no second event.
    const again = await f.http().post(`/api/v1/notifications/${seeded.id}/read`).set(f.auth(a)).expect(200);
    expect(again.body.data.readAt).toBe(res.body.data.readAt);
    const after = await list(a);
    expect(after.unreadCount).toBe(1);
    expect(after.items.find((n) => n.id === newest.id)?.readAt).toBeNull();

    // Sync point: a read-all event for the same user arrives after any (wrong) duplicate.
    const e3 = tab1.nextRead();
    await f.http().post('/api/v1/notifications/read-all').set(f.auth(a)).expect(200);
    expect(await e3).toEqual({ ids: [newest.id], unreadCount: 0 });
    expect(tab1.received.read).toHaveLength(2);
    expect(other.received.read).toHaveLength(0);
  });

  it("isolation: another user's or a missing notification → NOTIFICATION_NOT_FOUND; bad id → VALIDATION_ERROR", async () => {
    const a = await f.demo();
    const b = await f.register('b@example.com');
    const [seeded] = (await list(a)).items;
    expect((await list(b)).items).toEqual([]);
    expect((await f.http().post(`/api/v1/notifications/${seeded.id}/read`).set(f.auth(b)).expect(404)).body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    expect((await f.http().post('/api/v1/notifications/9999/read').set(f.auth(a)).expect(404)).body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    expect((await f.http().post('/api/v1/notifications/abc/read').set(f.auth(a)).expect(400)).body.error.code).toBe('VALIDATION_ERROR');
    expect((await list(a)).unreadCount).toBe(1);
    expect((await f.http().post('/api/v1/notifications/read-all').set(f.auth(b)).expect(200)).body.data).toEqual({ updated: 0 });
    expect((await list(a)).unreadCount).toBe(1);
  });

  it('POST /read-all marks every unread one ({ updated }); a second call updates nothing', async () => {
    const t = await f.demo();
    await addNotifications(await meId(t), 3);
    expect((await f.http().post('/api/v1/notifications/read-all').set(f.auth(t)).expect(200)).body.data).toEqual({ updated: 4 });
    const after = await list(t);
    expect(after.unreadCount).toBe(0);
    expect(after.items.every((n) => n.readAt !== null)).toBe(true);
    expect((await f.http().post('/api/v1/notifications/read-all').set(f.auth(t)).expect(200)).body.data).toEqual({ updated: 0 });
  });

  it('a triggered alert notification is listed and counted', async () => {
    const t = await f.demo();
    const p = await f.price('BTCUSDT');
    const id = await f.createAlert(t, 'BTCUSDT', 'ABOVE', p + 100);
    const s = await f.socketFor(t);
    const event = s.nextNew();
    await f.tick('BTCUSDT', p + 100);
    const { notification } = await event;
    const res = await list(t);
    expect(res.unreadCount).toBe(2);
    expect(res.items[0]).toEqual(notification);
    expect(res.items[0].payload.alertId).toBe(id);
  });
});
