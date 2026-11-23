import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/app';

describe('health, reset, envelope (real test DB)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns the success envelope with db up and market data', async () => {
    const res = await http().get('/api/v1/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.db).toBe('up');
    expect(res.body.data.marketData.provider).toBe('mock');
    expect(res.body.data.marketData.connected).toBe(true);
    expect(Date.now() - Date.parse(res.body.data.marketData.lastMessageAt)).toBeLessThan(60_000);
    expect(res.body.data.status).toBe('ok');
  });

  it('unknown API route returns NOT_FOUND envelope', async () => {
    const res = await http().get('/api/v1/nope').expect(404);
    expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('POST /api/v1/test/reset truncates and seeds the demo account (AC-OPS-02 data)', async () => {
    const res = await http().post('/api/v1/test/reset').expect(201);
    expect(res.body).toEqual({ success: true, data: { ok: true } });
    const prisma = app.get(PrismaService);
    const demo = await prisma.user.findUnique({ where: { email: 'demo@example.com' } });
    expect(demo).not.toBeNull();
    expect(await prisma.watchlistItem.count({ where: { userId: demo!.id } })).toBe(3);
    expect(await prisma.alert.count({ where: { userId: demo!.id, status: 'ACTIVE' } })).toBe(2);
    expect(await prisma.notification.count({ where: { userId: demo!.id, readAt: null } })).toBe(1);
    expect(demo!.passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  it('DB constraints from the init migration are active', async () => {
    const prisma = app.get(PrismaService);
    await expect(prisma.$executeRawUnsafe(`INSERT INTO users (email, password_hash, display_name, updated_at) VALUES ('UPPER@X.COM','h','Name', now())`)).rejects.toThrow();
  });
});
