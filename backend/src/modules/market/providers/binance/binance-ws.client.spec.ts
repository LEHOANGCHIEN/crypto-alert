import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import { PriceBus } from '../../price-bus';
import type { Candle, Interval } from '../../market.types';
import type { BinanceRestClient } from './binance-rest';
import { BinanceProvider } from './binance.provider';
import { BinanceWsClient } from './binance-ws.client';

/** Fake Binance combined-stream server on localhost (no real network). */
class FakeUpstream {
  readonly server: WebSocketServer;
  readonly urls: string[] = [];
  readonly received: { method: string; params: string[]; id: number }[][] = [];
  sockets: WebSocket[] = [];

  constructor() {
    this.server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
    this.server.on('connection', (ws, req) => {
      this.urls.push(req.url ?? '');
      const log: { method: string; params: string[]; id: number }[] = [];
      this.received.push(log);
      this.sockets.push(ws);
      ws.on('message', (raw) => log.push(JSON.parse(raw.toString()) as { method: string; params: string[]; id: number }));
    });
  }

  listening(): Promise<void> {
    return this.server.address() ? Promise.resolve() : new Promise((r) => this.server.once('listening', () => r()));
  }

  get url(): string {
    return `ws://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  get current(): WebSocket {
    return this.sockets[this.sockets.length - 1];
  }

  /** Streams subscribed on connection `i` (all SUBSCRIBE params, in order). */
  subscribed(i: number): string[] {
    return (this.received[i] ?? []).filter((m) => m.method === 'SUBSCRIBE').flatMap((m) => m.params);
  }

  close(): Promise<void> {
    for (const s of this.sockets) s.terminate();
    return new Promise((r) => this.server.close(() => r()));
  }
}

async function waitFor(cond: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

const noJitterMin = () => 0; // first retry after 800 ms

describe('BinanceWsClient (fake upstream server)', () => {
  let up: FakeUpstream;
  let client: BinanceWsClient | null = null;

  beforeEach(async () => {
    up = new FakeUpstream();
    await up.listening();
  });
  afterEach(async () => {
    client?.stop();
    client = null;
    await up.close();
  });

  it('connects to the combined stream with the all-market ticker stream and forwards messages', async () => {
    const messages: [string, unknown][] = [];
    const status: boolean[] = [];
    client = new BinanceWsClient(up.url, { onMessage: (s, d) => messages.push([s, d]), onStatus: (c) => status.push(c), onReopen: () => undefined });
    client.start();
    await waitFor(() => client!.connected);
    expect(up.urls[0]).toBe('/stream?streams=!miniTicker@arr');
    expect(status).toEqual([true]);

    up.current.send(JSON.stringify({ result: null, id: 1 }));
    up.current.send(JSON.stringify({ stream: '!miniTicker@arr', data: [{ s: 'BTCUSDT' }] }));
    await waitFor(() => messages.length === 1);
    expect(messages[0]).toEqual(['!miniTicker@arr', [{ s: 'BTCUSDT' }]]);
    expect(client.lastMessageAt).not.toBeNull();

    client.subscribe('btcusdt@kline_1h');
    client.subscribe('btcusdt@kline_1h'); // idempotent
    await waitFor(() => up.received[0].length === 1);
    expect(up.received[0][0]).toMatchObject({ method: 'SUBSCRIBE', params: ['btcusdt@kline_1h'] });
    client.unsubscribe('btcusdt@kline_1h');
    await waitFor(() => up.received[0].length === 2);
    expect(up.received[0][1]).toMatchObject({ method: 'UNSUBSCRIBE', params: ['btcusdt@kline_1h'] });
    expect(client.activeStreams()).toEqual(['!miniTicker@arr']);
  });

  it('reconnects with backoff after the upstream drops and resubscribes every active stream', async () => {
    const status: boolean[] = [];
    let reopened = 0;
    client = new BinanceWsClient(
      up.url,
      { onMessage: () => undefined, onStatus: (c) => status.push(c), onReopen: () => reopened++ },
      { random: noJitterMin },
    );
    client.subscribe('ethusdt@kline_15m'); // before connect: sent on open
    client.start();
    await waitFor(() => up.subscribed(0).length === 1);
    client.subscribe('btcusdt@kline_1h');
    await waitFor(() => up.subscribed(0).length === 2);

    const droppedAt = Date.now();
    up.current.terminate();
    await waitFor(() => up.sockets.length === 2 && client!.connected);
    expect(Date.now() - droppedAt).toBeGreaterThanOrEqual(750); // first backoff step (1 s − 20 %)
    await waitFor(() => up.subscribed(1).length === 2);
    expect(up.subscribed(1).sort()).toEqual(['btcusdt@kline_1h', 'ethusdt@kline_15m']);
    expect(up.urls[1]).toBe('/stream?streams=!miniTicker@arr');
    expect(status).toEqual([true, false, true]);
    expect(reopened).toBe(1);
    expect(client.activeStreams()).toEqual(['!miniTicker@arr', 'btcusdt@kline_1h', 'ethusdt@kline_15m']);
  });

  it('watchdog forces a reconnect when no message arrives in time', async () => {
    client = new BinanceWsClient(up.url, { onMessage: () => undefined, onStatus: () => undefined, onReopen: () => undefined }, { watchdogMs: 200 });
    client.start();
    await waitFor(() => up.sockets.length >= 2 && client!.connected, 3000);
    expect(up.sockets.length).toBeGreaterThanOrEqual(2);
  });

  it('a message resets the watchdog', async () => {
    client = new BinanceWsClient(up.url, { onMessage: () => undefined, onStatus: () => undefined, onReopen: () => undefined }, { watchdogMs: 300 });
    client.start();
    await waitFor(() => client!.connected);
    const first = up.current;
    const pinger = setInterval(() => first.send(JSON.stringify({ stream: '!miniTicker@arr', data: [] })), 50);
    await new Promise((r) => setTimeout(r, 700));
    clearInterval(pinger);
    expect(up.sockets).toHaveLength(1);
  });

  it('reconnects proactively when the connection lifetime is reached', async () => {
    client = new BinanceWsClient(up.url, { onMessage: () => undefined, onStatus: () => undefined, onReopen: () => undefined }, { lifetimeMs: 200 });
    client.start();
    await waitFor(() => up.sockets.length >= 2 && client!.connected, 3000);
  });
});

describe('BinanceProvider over the fake upstream', () => {
  let up: FakeUpstream;
  let provider: BinanceProvider | null = null;

  beforeEach(async () => {
    up = new FakeUpstream();
    await up.listening();
  });
  afterEach(async () => {
    await provider?.stop();
    provider = null;
    await up.close();
  });

  const candle = (openTime: number, close: number, isClosed: boolean): Candle => ({
    openTime, closeTime: openTime + 59_999, open: 1, high: 2, low: 0.5, close, volume: 1, quoteVolume: 1, isClosed,
  });

  it('forwards USDT tickers and klines to the PriceBus and recovers gaps after a reconnect', async () => {
    const bus = new PriceBus();
    const tickers: string[] = [];
    const klines: { symbol: string; interval: Interval; close: number }[] = [];
    const statuses: string[] = [];
    bus.on('ticker', (t) => tickers.push(`${t.symbol}:${t.lastPrice}`));
    bus.on('kline', (k) => klines.push({ symbol: k.symbol, interval: k.interval, close: k.candle.close }));
    bus.on('status', (s) => statuses.push(s.status));
    const restCalls: { symbol: string; interval: Interval; limit: number }[] = [];
    const rest = {
      listSymbols: async () => [{ symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', tickSize: 0.01, pricePrecision: 2 }],
      getKlines: async (symbol: string, interval: Interval, opts: { limit: number }) => {
        restCalls.push({ symbol, interval, limit: opts.limit });
        return [candle(0, 100, true), candle(60_000, 101, false)];
      },
    } as unknown as BinanceRestClient;
    provider = new BinanceProvider(bus, 'http://unused', up.url, { random: noJitterMin }, rest);
    await provider.listSymbols();
    await provider.start();
    provider.subscribeKlines('BTCUSDT', '1m');
    await waitFor(() => up.subscribed(0).includes('btcusdt@kline_1m'));
    expect(provider.getStatus()).toMatchObject({ name: 'binance', connected: true, activeStreams: 2 });

    up.current.send(
      JSON.stringify({
        stream: '!miniTicker@arr',
        data: [
          { e: '24hrMiniTicker', E: 1, s: 'BTCUSDT', c: '101', o: '100', h: '102', l: '99', v: '10', q: '1000' },
          { e: '24hrMiniTicker', E: 1, s: 'ETHBTC', c: '0.05', o: '0.05', h: '0.05', l: '0.05', v: '1', q: '1' },
        ],
      }),
    );
    up.current.send(
      JSON.stringify({
        stream: 'btcusdt@kline_1m',
        data: { e: 'kline', s: 'BTCUSDT', k: { t: 0, T: 59_999, i: '1m', o: '1', c: '7', h: '8', l: '0.5', v: '1', q: '1', x: false } },
      }),
    );
    await waitFor(() => tickers.length === 1 && klines.length === 1);
    expect(tickers).toEqual(['BTCUSDT:101']);
    expect(klines[0]).toEqual({ symbol: 'BTCUSDT', interval: '1m', close: 7 });

    up.current.terminate();
    await waitFor(() => klines.length === 3);
    expect(restCalls).toEqual([{ symbol: 'BTCUSDT', interval: '1m', limit: 2 }]);
    expect(klines.slice(1).map((k) => k.close)).toEqual([100, 101]);
    expect(up.subscribed(1)).toEqual(['btcusdt@kline_1m']);
    expect(statuses).toEqual(['connected', 'reconnecting', 'connected']);

    provider.unsubscribeKlines('BTCUSDT', '1m');
    expect(provider.getStatus().activeStreams).toBe(1);
  });
});
