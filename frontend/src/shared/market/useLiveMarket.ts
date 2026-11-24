import { useEffect } from 'react';
import type { Candle, Interval, Ticker } from '../api/types';
import { queryClient } from '../api/queryClient';
import { registerSubscription } from '../socket/socket';
import { useConnection } from '../socket/connection.store';
import { useSocketEvent } from '../socket/useSocketEvent';
import { applyKline, mergeTickers } from './live';

/** Live `tickers:update` → the `['tickers']` cache (market list, chart header). Mount once per page. */
export function useLiveTickers(): void {
  useEffect(
    () =>
      registerSubscription('tickers', {
        subscribe: 'tickers:subscribe',
        unsubscribe: 'tickers:unsubscribe',
        payload: {},
        onAck: (ack) => useConnection.setState({ tickersLive: ack.success }),
      }),
    [],
  );
  useEffect(() => () => useConnection.setState({ tickersLive: false }), []);
  useSocketEvent('tickers:update', ({ tickers }) => {
    queryClient.setQueryData<Ticker[]>(['tickers'], (prev) => mergeTickers(prev, tickers));
  });
}

/** Live `kline:update` for the open chart → the `['klines', symbol, interval]` cache. */
export function useLiveKlines(symbol: string, interval: Interval, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const key = `${symbol}:${interval}`;
    const unregister = registerSubscription(`kline:${key}`, {
      subscribe: 'kline:subscribe',
      unsubscribe: 'kline:unsubscribe',
      payload: { symbol, interval },
      onAck: (ack) => useConnection.setState({ klineLive: ack.success ? key : null }),
    });
    return () => {
      unregister();
      useConnection.setState((s) => (s.klineLive === key ? { klineLive: null } : s));
    };
  }, [symbol, interval, enabled]);
  useSocketEvent('kline:update', (u) => {
    queryClient.setQueryData<Candle[]>(['klines', u.symbol, u.interval], (prev) => applyKline(prev, u.candle));
  });
}
