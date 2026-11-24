import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import { SubscriptionManager, MAX_UPSTREAM_KLINE_STREAMS } from '../../src/modules/market/subscription-manager';
import { RealtimeService } from '../../src/modules/realtime/realtime.service';
import { RealtimeRelay } from '../../src/modules/realtime/realtime.relay';
import { PriceBus } from '../../src/modules/market/price-bus';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { Candle, Ticker } from '../../src/modules/market/market.types';
import { createTestApp } from '../helpers/app';

type Ack = { success: boolean; data?: unknown; error?: { code: string; details?: { field: string; code: string }[] } };

describe('Socket.IO gateway (API.md §4)', () => {
  let app: INestApplication;
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0, '127.0.0.1');
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  afterEach(() => {
    for (const s of sockets.splice(0)) s.disconnect();
    app.get(SubscriptionManager).reset();
    app.get(RealtimeRelay).reset();
  });
  afterAll(async () => {
    await app.close();
  });

  function connect(token?: string): Socket {
    const s = io(url, { path: '/socket.io', transports: ['websocket'], auth: token ? { token } : {}, reconnection: false, forceNew: true });
    sockets.push(s);
    return s;
  }

  const connected = (s: Socket) =>
    new Promise<void>((resolve, reject) => {
      if (s.connected) return resolve();
      s.once('connect', () => resolve());
      s.once('connect_error', reject);
    });

  const token = (claims: Record<string, unknown>) => app.get(JwtService).sign({ role: 'user', ...claims });

  it('guest connects and immediately receives market:status', async () => {
    const s = connect();
    const status = await new Promise<{ status: string; at: number }>((resolve) => s.once('market:status', resolve));
    expect(status.status).toBe('connected');
    expect(typeof status.at).toBe('number');
    expect(Math.abs(Date.now() - status.at)).toBeLessThan(5000);
  });

  it('rejects an invalid token with UNAUTHENTICATED and an expired one with TOKEN_EXPIRED', async () => {
    const bad = connect('not-a-jwt');
    const err1 = await new Promise<Error & { data?: { code: string } }>((resolve) => bad.once('connect_error', resolve));
    expect(err1.data).toEqual({ code: 'UNAUTHENTICATED' });

    const expired = connect(token({ sub: 1, exp: Math.floor(Date.now() / 1000) - 10 }));
    const err2 = await new Promise<Error & { data?: { code: string } }>((resolve) => expired.once('connect_error', resolve));
    expect(err2.data).toEqual({ code: 'TOKEN_EXPIRED' });
  });

  it('a valid token joins room user:{id}; guests do not', async () => {
    const user = connect(token({ sub: 42 }));
    const guest = connect();
    await Promise.all([connected(user), connected(guest)]);
    const got: string[] = [];
    user.on('probe', () => got.push('user'));
    guest.on('probe', () => got.push('guest'));
    app.get(RealtimeService).emitToRoom('user:42', 'probe', {});
    await new Promise<void>((r) => user.once('probe', () => r()));
    expect(got).toEqual(['user']);
  });

  it('tickers:subscribe / unsubscribe ack with the success envelope; unknown fields are rejected', async () => {
    const s = connect();
    await connected(s);
    expect(await s.emitWithAck('tickers:subscribe', {})).toEqual({ success: true, data: null });
    expect(await s.emitWithAck('tickers:unsubscribe', {})).toEqual({ success: true, data: null });
    const bad = (await s.emitWithAck('tickers:subscribe', { x: 1 })) as Ack;
    expect(bad).toEqual({ success: false, error: { code: 'VALIDATION_ERROR', details: [{ field: 'x', code: 'UNKNOWN_FIELD' }] } });
  });

  it('kline:subscribe validates the payload and the symbol', async () => {
    const s = connect();
    await connected(s);
    const invalid = (await s.emitWithAck('kline:subscribe', { symbol: 'btc-usdt', interval: '2h' })) as Ack;
    expect(invalid.success).toBe(false);
    expect(invalid.error?.code).toBe('VALIDATION_ERROR');
    expect(invalid.error?.details).toEqual(
      expect.arrayContaining([
        { field: 'symbol', code: 'INVALID_SYMBOL_FORMAT' },
        { field: 'interval', code: 'INVALID_ENUM' },
      ]),
    );
    expect(await s.emitWithAck('kline:subscribe', { symbol: 'FAKEUSDT', interval: '1h' })).toEqual({
      success: false,
      error: { code: 'SYMBOL_NOT_FOUND' },
    });
    // Lower-case symbols are upper-cased like REST params.
    expect(await s.emitWithAck('kline:subscribe', { symbol: 'btcusdt', interval: '1h' })).toEqual({ success: true, data: null });
    expect(await s.emitWithAck('kline:unsubscribe', { symbol: 'BTCUSDT', interval: '1h' })).toEqual({ success: true, data: null });
  });

  it('a socket holding 2 kline subscriptions gets SUBSCRIPTION_LIMIT_REACHED for a 3rd', async () => {
    const s = connect();
    await connected(s);
    expect(await s.emitWithAck('kline:subscribe', { symbol: 'BTCUSDT', interval: '1h' })).toEqual({ success: true, data: null });
    expect(await s.emitWithAck('kline:subscribe', { symbol: 'ETHUSDT', interval: '1h' })).toEqual({ success: true, data: null });
    expect(await s.emitWithAck('kline:subscribe', { symbol: 'SOLUSDT', interval: '1h' })).toEqual({
      success: false,
      error: { code: 'SUBSCRIPTION_LIMIT_REACHED' },
    });
    // Same subscription again is idempotent.
    expect(await s.emitWithAck('kline:subscribe', { symbol: 'BTCUSDT', interval: '1h' })).toEqual({ success: true, data: null });
  });

  it('a new upstream stream beyond 200 gets MARKET_DATA_UNAVAILABLE', async () => {
    const sm = app.get(SubscriptionManager);
    for (let i = 0; i < MAX_UPSTREAM_KLINE_STREAMS; i++) sm.acquire(`fake-${i}`, `F${i}USDT`, '1m');
    const s = connect();
    await connected(s);
    expect(await s.emitWithAck('kline:subscribe', { symbol: 'BTCUSDT', interval: '1h' })).toEqual({
      success: false,
      error: { code: 'MARKET_DATA_UNAVAILABLE' },
    });
  });

  it('disconnect releases the socket subscriptions', async () => {
    const sm = app.get(SubscriptionManager);
    const s = connect();
    await connected(s);
    await s.emitWithAck('kline:subscribe', { symbol: 'BTCUSDT', interval: '1h' });
    const id = s.id as string;
    expect(sm.socketCount(id)).toBe(1);
    s.disconnect();
    const start = Date.now();
    while (sm.socketCount(id) !== 0 && Date.now() - start < 3000) await new Promise((r) => setTimeout(r, 20));
    expect(sm.socketCount(id)).toBe(0);
  });

  describe('PriceBus relay', () => {
    const ticker = (symbol: string, lastPrice: number): Ticker => ({
      symbol, lastPrice, openPrice: 100, highPrice: 200, lowPrice: 50, priceChangePercent: lastPrice - 100, volume: 1, quoteVolume: 1000, eventTime: Date.now(),
    });

    it('tickers:update reaches only the tickers room, batched per second', async () => {
      const listener = connect();
      const other = connect();
      await Promise.all([connected(listener), connected(other)]);
      await listener.emitWithAck('tickers:subscribe', {});
      const batches: { tickers: Ticker[] }[] = [];
      let otherGot = 0;
      listener.on('tickers:update', (p: { tickers: Ticker[] }) => batches.push(p));
      other.on('tickers:update', () => otherGot++);

      const bus = app.get(PriceBus);
      bus.emit('ticker', ticker('ETHUSDT', 101));
      bus.emit('ticker', ticker('SOLUSDT', 102));
      bus.emit('ticker', ticker('ETHUSDT', 103));
      const start = Date.now();
      while (batches.length === 0 && Date.now() - start < 2000) await new Promise((r) => setTimeout(r, 10));
      expect(batches[0].tickers.map((t) => [t.symbol, t.lastPrice])).toEqual([
        ['ETHUSDT', 103],
        ['SOLUSDT', 102],
      ]);
      expect(otherGot).toBe(0);
    });

    it('kline:update reaches the kline room; closed candles are upserted into the cache', async () => {
      const s = connect();
      await connected(s);
      await s.emitWithAck('kline:subscribe', { symbol: 'LINKUSDT', interval: '1m' });
      const openTime = Date.UTC(2020, 0, 1, 0, 0);
      const candle: Candle = { openTime, closeTime: openTime + 59_999, open: 1, high: 3, low: 0.5, close: 2, volume: 10, quoteVolume: 20, isClosed: true };
      const got = new Promise<unknown>((resolve) => s.once('kline:update', resolve));
      app.get(PriceBus).emit('kline', { symbol: 'LINKUSDT', interval: '1m', candle });
      expect(await got).toEqual({ symbol: 'LINKUSDT', interval: '1m', candle });

      const prisma = app.get(PrismaService);
      const start = Date.now();
      let row = null;
      while (!row && Date.now() - start < 2000) {
        row = await prisma.candle.findFirst({ where: { symbol: 'LINKUSDT', interval: '1m', openTime: new Date(openTime) } });
      }
      expect(row?.close.toNumber()).toBe(2);
      await prisma.candle.deleteMany({ where: { symbol: 'LINKUSDT', interval: '1m' } });
    });

    it('market:status is broadcast to every socket', async () => {
      const a = connect();
      const b = connect();
      await Promise.all([connected(a), connected(b)]);
      // Wait for the broadcast value (the per-connection 'connected' status may still be in flight).
      const both = Promise.all(
        [a, b].map(
          (x) =>
            new Promise<{ status: string }>((resolve) =>
              x.on('market:status', (p: { status: string }) => p.status === 'reconnecting' && resolve(p)),
            ),
        ),
      );
      app.get(PriceBus).emit('status', { status: 'reconnecting', at: Date.now() });
      expect((await both).map((x) => x.status)).toEqual(['reconnecting', 'reconnecting']);
    });
  });
});
