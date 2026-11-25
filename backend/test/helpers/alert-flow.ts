import { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';

export type NotificationJson = {
  id: number;
  type: 'ALERT_TRIGGERED';
  payload: { alertId: number; symbol: string; condition: 'ABOVE' | 'BELOW'; targetPrice: number; triggeredPrice: number };
  readAt: string | null;
  createdAt: string;
};
export type NotificationNew = { notification: NotificationJson; unreadCount: number };
export type NotificationRead = { ids: number[]; unreadCount: number };

/** REST + Socket.IO helpers for the alert → notification integration tests (real Nest app listening on a random port). */
export function alertFlow(getApp: () => INestApplication, getUrl: () => string) {
  const http = () => request(getApp().getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const sockets: Socket[] = [];

  const login = async (email: string, password: string): Promise<string> =>
    (await http().post('/api/v1/auth/login').send({ email, password }).expect(200)).body.data.accessToken;
  const demo = () => login('demo@example.com', 'Demo@123456');
  const register = async (email: string): Promise<string> =>
    (await http().post('/api/v1/auth/register').send({ email, password: 'Passw0rdX', displayName: 'User B' }).expect(201)).body.data.accessToken;
  const price = async (symbol: string): Promise<number> =>
    ((await http().get('/api/v1/market/tickers').expect(200)).body.data as { symbol: string; lastPrice: number }[]).find((t) => t.symbol === symbol)!.lastPrice;
  const createAlert = async (t: string, symbol: string, condition: 'ABOVE' | 'BELOW', targetPrice: number): Promise<number> =>
    (await http().post('/api/v1/alerts').set(auth(t)).send({ symbol, condition, targetPrice }).expect(201)).body.data.id;
  const tick = async (symbol: string, p: number): Promise<void> => {
    await http().post('/api/v1/test/market/tick').send({ symbol, price: p }).expect(201);
  };

  /** Connected socket that records every notification event it receives. */
  async function socketFor(token: string) {
    const s = io(getUrl(), { path: '/socket.io', transports: ['websocket'], auth: { token }, reconnection: false, forceNew: true });
    sockets.push(s);
    const received: { new: NotificationNew[]; read: NotificationRead[] } = { new: [], read: [] };
    s.on('notification:new', (p: NotificationNew) => received.new.push(p));
    s.on('notification:read', (p: NotificationRead) => received.read.push(p));
    // The server joins `user:{id}` in handleConnection and emits `market:status` right after, so it marks "joined".
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('socket not ready within 5 s')), 5000);
      s.once('market:status', () => {
        clearTimeout(timer);
        resolve();
      });
      s.once('connect_error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
    });
    const next = (event: 'notification:new' | 'notification:read', timeoutMs = 5000) =>
      new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no ${event} within ${timeoutMs} ms`)), timeoutMs);
        s.once(event, (p: unknown) => {
          clearTimeout(timer);
          resolve(p);
        });
      });
    return { socket: s, received, nextNew: () => next('notification:new') as Promise<NotificationNew>, nextRead: () => next('notification:read') as Promise<NotificationRead> };
  }

  const closeSockets = () => {
    for (const s of sockets.splice(0)) s.disconnect();
  };

  return { http, auth, demo, register, price, createAlert, tick, socketFor, closeSockets };
}

export async function listen(app: INestApplication): Promise<string> {
  await app.listen(0, '127.0.0.1');
  return `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
}
