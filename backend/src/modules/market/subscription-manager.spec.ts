import type { MarketDataProvider } from './providers/market-data-provider.interface';
import { AppError } from '../../common/app-error';
import { MAX_UPSTREAM_KLINE_STREAMS, SubscriptionManager, UNSUBSCRIBE_GRACE_MS } from './subscription-manager';

function setup() {
  const upstream: string[] = [];
  const log: string[] = [];
  const provider = {
    subscribeKlines: (s: string, i: string) => {
      upstream.push(`${s}:${i}`);
      log.push(`+${s}:${i}`);
    },
    unsubscribeKlines: (s: string, i: string) => {
      upstream.splice(upstream.indexOf(`${s}:${i}`), 1);
      log.push(`-${s}:${i}`);
    },
  } as unknown as MarketDataProvider;
  return { sm: new SubscriptionManager(provider), upstream, log };
}

describe('SubscriptionManager ref-count', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('subscribes upstream once for many sockets and unsubscribes 5 s after the last one leaves', () => {
    const { sm, upstream, log } = setup();
    expect(sm.acquire('a', 'BTCUSDT', '1h')).toBe(true);
    expect(sm.acquire('b', 'BTCUSDT', '1h')).toBe(true);
    expect(log).toEqual(['+BTCUSDT:1h']);

    sm.release('a', 'BTCUSDT', '1h');
    jest.advanceTimersByTime(UNSUBSCRIBE_GRACE_MS * 2);
    expect(upstream).toEqual(['BTCUSDT:1h']);

    sm.release('b', 'BTCUSDT', '1h');
    jest.advanceTimersByTime(UNSUBSCRIBE_GRACE_MS - 1);
    expect(upstream).toEqual(['BTCUSDT:1h']);
    expect(sm.upstreamCount()).toBe(1);
    jest.advanceTimersByTime(1);
    expect(upstream).toEqual([]);
    expect(log).toEqual(['+BTCUSDT:1h', '-BTCUSDT:1h']);
    expect(sm.upstreamCount()).toBe(0);
  });

  it('a new subscriber during the grace period keeps the stream without re-subscribing', () => {
    const { sm, log } = setup();
    sm.acquire('a', 'ETHUSDT', '15m');
    sm.release('a', 'ETHUSDT', '15m');
    jest.advanceTimersByTime(3000);
    sm.acquire('b', 'ETHUSDT', '15m');
    jest.advanceTimersByTime(UNSUBSCRIBE_GRACE_MS * 3);
    expect(log).toEqual(['+ETHUSDT:15m']);
  });

  it('acquire is idempotent per socket and release of an unknown key is a no-op', () => {
    const { sm, log } = setup();
    expect(sm.acquire('a', 'BTCUSDT', '1m')).toBe(true);
    expect(sm.acquire('a', 'BTCUSDT', '1m')).toBe(false);
    expect(sm.socketCount('a')).toBe(1);
    sm.release('a', 'ETHUSDT', '1m');
    sm.release('z', 'BTCUSDT', '1m');
    sm.release('a', 'BTCUSDT', '1m');
    jest.advanceTimersByTime(UNSUBSCRIBE_GRACE_MS);
    expect(log).toEqual(['+BTCUSDT:1m', '-BTCUSDT:1m']);
  });

  it('releaseAll frees every subscription of a disconnected socket', () => {
    const { sm, upstream } = setup();
    sm.acquire('a', 'BTCUSDT', '1h');
    sm.acquire('a', 'ETHUSDT', '1h');
    sm.acquire('b', 'ETHUSDT', '1h');
    sm.releaseAll('a');
    expect(sm.socketCount('a')).toBe(0);
    jest.advanceTimersByTime(UNSUBSCRIBE_GRACE_MS);
    expect(upstream).toEqual(['ETHUSDT:1h']);
  });

  it('switching pairs: old stream goes after the grace period, new one stays', () => {
    const { sm, upstream } = setup();
    sm.acquire('a', 'BTCUSDT', '1h');
    sm.release('a', 'BTCUSDT', '1h');
    sm.acquire('a', 'BTCUSDT', '15m');
    sm.release('a', 'BTCUSDT', '15m');
    sm.acquire('a', 'ETHUSDT', '15m');
    expect(upstream.sort()).toEqual(['BTCUSDT:15m', 'BTCUSDT:1h', 'ETHUSDT:15m']);
    jest.advanceTimersByTime(UNSUBSCRIBE_GRACE_MS);
    expect(upstream).toEqual(['ETHUSDT:15m']);
  });

  it('reset unsubscribes everything immediately', () => {
    const { sm, upstream } = setup();
    sm.acquire('a', 'BTCUSDT', '1h');
    sm.acquire('b', 'ETHUSDT', '1h');
    sm.release('b', 'ETHUSDT', '1h');
    sm.reset();
    expect(upstream).toEqual([]);
    expect(sm.upstreamCount()).toBe(0);
    expect(sm.socketCount('a')).toBe(0);
    jest.advanceTimersByTime(UNSUBSCRIBE_GRACE_MS);
    expect(upstream).toEqual([]);
  });
});

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return e instanceof AppError ? e.code : 'OTHER';
  }
  return undefined;
};

describe('SubscriptionManager caps', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('a socket may hold at most 2 kline subscriptions (3rd → SUBSCRIPTION_LIMIT_REACHED)', () => {
    const { sm, log } = setup();
    sm.acquire('a', 'BTCUSDT', '1h');
    sm.acquire('a', 'ETHUSDT', '1h');
    expect(codeOf(() => sm.acquire('a', 'SOLUSDT', '1h'))).toBe('SUBSCRIPTION_LIMIT_REACHED');
    expect(log).toEqual(['+BTCUSDT:1h', '+ETHUSDT:1h']);
    expect(sm.socketCount('a')).toBe(2);
    // Re-subscribing one it already holds is still fine; other sockets are not affected.
    expect(codeOf(() => sm.acquire('a', 'BTCUSDT', '1h'))).toBeUndefined();
    expect(codeOf(() => sm.acquire('b', 'SOLUSDT', '1h'))).toBeUndefined();
    // After releasing one, a new one is allowed again.
    sm.release('a', 'BTCUSDT', '1h');
    expect(codeOf(() => sm.acquire('a', 'SOLUSDT', '1h'))).toBeUndefined();
  });

  it('at most 200 upstream kline streams (201st new stream → MARKET_DATA_UNAVAILABLE)', () => {
    const { sm, upstream } = setup();
    for (let i = 0; i < MAX_UPSTREAM_KLINE_STREAMS; i++) sm.acquire(`s${i}`, `S${i}USDT`, '1m');
    expect(sm.upstreamCount()).toBe(200);
    expect(codeOf(() => sm.acquire('new', 'NEWUSDT', '1m'))).toBe('MARKET_DATA_UNAVAILABLE');
    expect(upstream).toHaveLength(200);
    expect(sm.socketCount('new')).toBe(0);
    // Joining an existing stream does not add an upstream stream, so it is allowed.
    expect(codeOf(() => sm.acquire('new', 'S0USDT', '1m'))).toBeUndefined();
  });

  it('streams in their grace period still count toward the global cap until unsubscribed', () => {
    const { sm } = setup();
    for (let i = 0; i < MAX_UPSTREAM_KLINE_STREAMS; i++) sm.acquire(`s${i}`, `S${i}USDT`, '1m');
    sm.release('s0', 'S0USDT', '1m');
    expect(codeOf(() => sm.acquire('new', 'NEWUSDT', '1m'))).toBe('MARKET_DATA_UNAVAILABLE');
    jest.advanceTimersByTime(UNSUBSCRIBE_GRACE_MS);
    expect(codeOf(() => sm.acquire('new', 'NEWUSDT', '1m'))).toBeUndefined();
  });
});
