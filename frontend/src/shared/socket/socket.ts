import { io, type Socket } from 'socket.io-client';
import { getAccessToken, onAccessTokenChange, refreshSession } from '../api/http';
import { queryClient } from '../api/queryClient';
import { useConnection } from './connection.store';
import type { MarketStatusEvent, SocketAck } from './events';

/**
 * The tab's single Socket.IO client (frontend/CONTEXT.md). API.md §4.1 + ARCHITECTURE §4 "Client side":
 * auto-reconnect 1 s → 10 s, token in the handshake, reconnect after every token change, re-subscribe and refetch
 * candles after a reconnect, window offline/online handling.
 */
type Subscription = { subscribe: string; unsubscribe: string; payload: object; onAck?: (ack: SocketAck) => void };

let socket: Socket | null = null;
const subscriptions = new Map<string, Subscription>();
/** Set while we drop the connection ourselves to send a new token: no banner, no data refetch. */
let tokenSwitch = false;

function emitSubscribe(key: string, s: Subscription): void {
  // A late ack for a subscription that was replaced or removed meanwhile is ignored.
  socket?.emit(s.subscribe, s.payload, (ack: SocketAck) => {
    if (subscriptions.get(key) === s) s.onAck?.(ack);
  });
}

function create(): Socket {
  const s = io(window.location.origin, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    // Evaluated on every (re)connect, so the handshake always carries the current token (guests: none).
    auth: (cb) => {
      const token = getAccessToken();
      cb(token ? { token } : {});
    },
  });

  s.on('connect', () => {
    const { everConnected } = useConnection.getState();
    const wasTokenSwitch = tokenSwitch;
    tokenSwitch = false;
    useConnection.setState({ connected: true, everConnected: true });
    for (const [key, sub] of subscriptions) emitSubscribe(key, sub);
    // After a real reconnect, fetch what was missed while offline (AC-RT-05).
    if (everConnected && !wasTokenSwitch) {
      void queryClient.invalidateQueries({ queryKey: ['klines'] });
      void queryClient.invalidateQueries({ queryKey: ['tickers'] });
    }
  });

  s.on('disconnect', () => {
    // Subscriptions are per connection: they are acknowledged again after the next connect.
    useConnection.setState(tokenSwitch ? { tickersLive: false, klineLive: null } : { connected: false, tickersLive: false, klineLive: null });
  });

  s.on('connect_error', (err: Error & { data?: { code?: string } }) => {
    const code = err.data?.code;
    if (code !== 'TOKEN_EXPIRED' && code !== 'UNAUTHENTICATED') return; // network errors: Socket.IO retries by itself
    // Handshake refused (API.md §4.1): refresh, then reconnect (as a guest if the session is gone).
    refreshSession()
      .catch(() => null)
      .finally(() => {
        if (navigator.onLine) s.connect();
      });
  });

  s.on('market:status', (e: MarketStatusEvent) => useConnection.setState({ marketStatus: e.status }));
  return s;
}

/** The singleton client (created on first use, not connected until `startSocket`). */
export function getSocket(): Socket {
  socket ??= create();
  return socket;
}

let started = false;

/** Connects once (after the session state is known) and wires token changes and offline/online events. */
export function startSocket(): void {
  if (started) return;
  started = true;
  const s = getSocket();
  onAccessTokenChange(() => {
    if (!s.active) return;
    tokenSwitch = s.connected;
    s.disconnect();
    s.connect();
  });
  window.addEventListener('offline', () => {
    tokenSwitch = false;
    s.disconnect();
    useConnection.setState({ connected: false, tickersLive: false, klineLive: null });
  });
  window.addEventListener('online', () => {
    if (!s.connected) s.connect();
  });
  if (navigator.onLine) s.connect();
}

/**
 * Keeps a server subscription (e.g. `kline:subscribe`) for as long as it is registered: emitted now if connected
 * and again after every reconnect. The returned function unsubscribes. `onAck` receives every ack.
 */
export function registerSubscription(key: string, sub: Subscription): () => void {
  subscriptions.set(key, sub);
  if (socket?.connected) emitSubscribe(key, sub);
  return () => {
    if (subscriptions.get(key) !== sub) return;
    subscriptions.delete(key);
    if (socket?.connected) socket.emit(sub.unsubscribe, sub.payload, () => undefined);
  };
}
