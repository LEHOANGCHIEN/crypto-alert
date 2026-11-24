import type { MarketDataProvider } from './providers/market-data-provider.interface';
import { SubscriptionManager, UNSUBSCRIBE_GRACE_MS } from './subscription-manager';

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
