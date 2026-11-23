import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { hashToken } from '../../src/modules/auth/refresh-token.service';
import { createTestApp } from '../helpers/app';

describe('auth + users (real test DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const valid = { email: 'New.User@Example.com', password: 'Passw0rdX', displayName: '  New User ' };

  const cookieOf = (res: request.Response): string => {
    const raw = (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) => c.startsWith('refresh_token='));
    return raw ?? '';
  };
  const tokenOf = (res: request.Response): string => cookieOf(res).split(';')[0].split('=')[1];
  const withCookie = (t: string) => `refresh_token=${t}`;

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

  it('register: 201, normalises email/name, sets httpOnly cookie, no hash in body', async () => {
    const res = await http().post('/api/v1/auth/register').send(valid).expect(201);
    expect(res.body.data.user).toMatchObject({ email: 'new.user@example.com', displayName: 'New User', role: 'user', settings: { locale: 'vi', theme: 'dark', timezone: 'Asia/Ho_Chi_Minh' } });
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.expiresIn).toBe(5);
    const cookie = cookieOf(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('register: applies optional settings', async () => {
    const res = await http().post('/api/v1/auth/register').send({ ...valid, locale: 'en', theme: 'light', timezone: 'UTC' }).expect(201);
    expect(res.body.data.user.settings).toEqual({ locale: 'en', theme: 'light', timezone: 'UTC' });
  });

  it('register: duplicate email in any letter case → EMAIL_TAKEN 409', async () => {
    await http().post('/api/v1/auth/register').send(valid).expect(201);
    const res = await http().post('/api/v1/auth/register').send({ ...valid, email: 'NEW.user@EXAMPLE.com' }).expect(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(await prisma.user.count({ where: { email: 'new.user@example.com' } })).toBe(1);
  });

  it('register: validation errors carry field codes', async () => {
    const res = await http().post('/api/v1/auth/register').send({ email: 'nope', password: 'abcdefgh', displayName: 'A', extra: 1 }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'email', code: 'INVALID_EMAIL' },
        { field: 'password', code: 'PASSWORD_WEAK' },
        { field: 'displayName', code: 'TOO_SHORT', params: { min: 2 } },
        { field: 'extra', code: 'UNKNOWN_FIELD' },
      ]),
    );
    const empty = await http().post('/api/v1/auth/register').send({}).expect(400);
    expect(empty.body.error.details).toEqual(expect.arrayContaining([{ field: 'email', code: 'REQUIRED' }, { field: 'password', code: 'REQUIRED' }]));
    const short = await http().post('/api/v1/auth/register').send({ ...valid, password: 'a1' }).expect(400);
    expect(short.body.error.details).toEqual([{ field: 'password', code: 'TOO_SHORT', params: { min: 8 } }]);
    const badTz = await http().post('/api/v1/auth/register').send({ ...valid, timezone: 'Mars/Base' }).expect(400);
    expect(badTz.body.error.details).toEqual([{ field: 'timezone', code: 'INVALID_TIMEZONE' }]);
  });

  it('login: success, wrong password and unknown email give the same INVALID_CREDENTIALS', async () => {
    await http().post('/api/v1/auth/register').send(valid).expect(201);
    const ok = await http().post('/api/v1/auth/login').send({ email: 'NEW.user@example.com', password: valid.password }).expect(200);
    expect(ok.body.data.user.email).toBe('new.user@example.com');
    expect(cookieOf(ok)).toContain('refresh_token=');
    const bad = await http().post('/api/v1/auth/login').send({ email: 'new.user@example.com', password: 'Wrong1234' }).expect(401);
    const unknown = await http().post('/api/v1/auth/login').send({ email: 'ghost@example.com', password: 'Wrong1234' }).expect(401);
    expect(bad.body).toEqual(unknown.body);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('refresh: rotates the token, old one is replaced, new access token works', async () => {
    const reg = await http().post('/api/v1/auth/register').send(valid).expect(201);
    const t1 = tokenOf(reg);
    const r = await http().post('/api/v1/auth/refresh').set('Cookie', withCookie(t1)).expect(200);
    const t2 = tokenOf(r);
    expect(t2).not.toBe(t1);
    expect(Object.keys(r.body.data).sort()).toEqual(['accessToken', 'expiresIn']);
    await http().get('/api/v1/users/me').set('Authorization', `Bearer ${r.body.data.accessToken}`).expect(200);
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(t1) } });
    expect(row?.revokedAt).not.toBeNull();
    expect(row?.replacedById).not.toBeNull();
    expect((await http().post('/api/v1/auth/refresh').expect(401)).body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  it('reuse detection (a): rotated token presented again within 10 s → new tokens, nothing else revoked', async () => {
    const reg = await http().post('/api/v1/auth/register').send(valid).expect(201);
    const t1 = tokenOf(reg);
    const r1 = await http().post('/api/v1/auth/refresh').set('Cookie', withCookie(t1)).expect(200);
    const t2 = tokenOf(r1);
    const again = await http().post('/api/v1/auth/refresh').set('Cookie', withCookie(t1)).expect(200);
    const t3 = tokenOf(again);
    expect(t3).not.toBe(t2);
    // t2 is still valid (nothing was revoked)
    await http().post('/api/v1/auth/refresh').set('Cookie', withCookie(t2)).expect(200);
  });

  it('reuse detection (b): rotated token presented after 10 s → all tokens of the user revoked', async () => {
    const reg = await http().post('/api/v1/auth/register').send(valid).expect(201);
    const t1 = tokenOf(reg);
    const r1 = await http().post('/api/v1/auth/refresh').set('Cookie', withCookie(t1)).expect(200);
    const t2 = tokenOf(r1);
    await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(t1) }, data: { revokedAt: new Date(Date.now() - 11_000) } });
    const res = await http().post('/api/v1/auth/refresh').set('Cookie', withCookie(t1)).expect(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_INVALID');
    expect(cookieOf(res)).toMatch(/refresh_token=;/);
    await http().post('/api/v1/auth/refresh').set('Cookie', withCookie(t2)).expect(401);
    expect(await prisma.refreshToken.count({ where: { revokedAt: null } })).toBe(0);
  });

  it('logout: revokes the token, clears cookie, always succeeds', async () => {
    const reg = await http().post('/api/v1/auth/register').send(valid).expect(201);
    const t1 = tokenOf(reg);
    const res = await http().post('/api/v1/auth/logout').set('Cookie', withCookie(t1)).expect(200);
    expect(res.body).toEqual({ success: true, data: null });
    await http().post('/api/v1/auth/refresh').set('Cookie', withCookie(t1)).expect(401);
    await http().post('/api/v1/auth/logout').expect(200);
  });

  it('change password: wrong current → WRONG_CURRENT_PASSWORD; ok revokes other sessions only', async () => {
    const a = await http().post('/api/v1/auth/register').send(valid).expect(201);
    const tA = tokenOf(a);
    const b = await http().post('/api/v1/auth/login').send({ email: valid.email, password: valid.password }).expect(200);
    const tB = tokenOf(b);
    const auth = { Authorization: `Bearer ${a.body.data.accessToken}` };
    const wrong = await http().post('/api/v1/auth/change-password').set(auth).set('Cookie', withCookie(tA)).send({ currentPassword: 'Nope12345', newPassword: 'NewPassw0rd' }).expect(400);
    expect(wrong.body.error.code).toBe('WRONG_CURRENT_PASSWORD');
    const weak = await http().post('/api/v1/auth/change-password').set(auth).set('Cookie', withCookie(tA)).send({ currentPassword: valid.password, newPassword: 'weakweak' }).expect(400);
    expect(weak.body.error.details).toEqual([{ field: 'newPassword', code: 'PASSWORD_WEAK' }]);
    await http().post('/api/v1/auth/change-password').send({ currentPassword: valid.password, newPassword: 'NewPassw0rd' }).expect(401);
    const ok = await http().post('/api/v1/auth/change-password').set(auth).set('Cookie', withCookie(tA)).send({ currentPassword: valid.password, newPassword: 'NewPassw0rd' }).expect(200);
    expect(ok.body.data).toBeNull();
    await http().post('/api/v1/auth/refresh').set('Cookie', withCookie(tA)).expect(200);
    await http().post('/api/v1/auth/refresh').set('Cookie', withCookie(tB)).expect(401);
    await http().post('/api/v1/auth/login').send({ email: valid.email, password: valid.password }).expect(401);
    await http().post('/api/v1/auth/login').send({ email: valid.email, password: 'NewPassw0rd' }).expect(200);
  });

  it('users: me / profile / settings, guards, validation; never a hash', async () => {
    await http().get('/api/v1/users/me').expect(401).expect((r) => expect(r.body.error.code).toBe('UNAUTHENTICATED'));
    await http().get('/api/v1/users/me').set('Authorization', 'Bearer garbage').expect(401);
    const reg = await http().post('/api/v1/auth/register').send(valid).expect(201);
    const auth = { Authorization: `Bearer ${reg.body.data.accessToken}` };
    const me = await http().get('/api/v1/users/me').set(auth).expect(200);
    expect(me.body.data.email).toBe('new.user@example.com');
    const p = await http().patch('/api/v1/users/me').set(auth).send({ displayName: 'Renamed' }).expect(200);
    expect(p.body.data.displayName).toBe('Renamed');
    const bad = await http().patch('/api/v1/users/me').set(auth).send({ displayName: 'x'.repeat(51) }).expect(400);
    expect(bad.body.error.details).toEqual([{ field: 'displayName', code: 'TOO_LONG', params: { max: 50 } }]);
    const s = await http().patch('/api/v1/users/me/settings').set(auth).send({ locale: 'en', timezone: 'UTC' }).expect(200);
    expect(s.body.data).toEqual({ locale: 'en', theme: 'dark', timezone: 'UTC' });
    const e = await http().patch('/api/v1/users/me/settings').set(auth).send({}).expect(400);
    expect(e.body.error.code).toBe('VALIDATION_ERROR');
    const en = await http().patch('/api/v1/users/me/settings').set(auth).send({ theme: 'blue' }).expect(400);
    expect(en.body.error.details).toEqual([{ field: 'theme', code: 'INVALID_ENUM' }]);
    for (const body of [reg.body, me.body, p.body, s.body]) expect(JSON.stringify(body)).not.toMatch(/passwordHash|password_hash|"password"/);
  });

  it('expired access token → TOKEN_EXPIRED', async () => {
    const reg = await http().post('/api/v1/auth/register').send(valid).expect(201);
    await new Promise((r) => setTimeout(r, 6000));
    const res = await http().get('/api/v1/users/me').set('Authorization', `Bearer ${reg.body.data.accessToken}`).expect(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rate limit: shared by register + login, RATE_LIMITED with Retry-After, cleared by test reset', async () => {
    for (let i = 0; i < 5; i++) await http().post('/api/v1/auth/login').send({ email: 'a@b.co', password: 'x' }).expect(401);
    const res = await http().post('/api/v1/auth/register').send(valid).expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    await http().post('/api/v1/test/reset').expect(201);
    await http().post('/api/v1/auth/login').send({ email: 'a@b.co', password: 'x' }).expect(401);
  });
});
