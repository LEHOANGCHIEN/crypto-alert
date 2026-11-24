import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import type { Interval } from './market.types';
import { MARKET_DATA_PROVIDER, type MarketDataProvider } from './providers/market-data-provider.interface';

/** A room that becomes empty keeps its upstream stream this long before UNSUBSCRIBE (ARCHITECTURE §3.2 step 5). */
export const UNSUBSCRIBE_GRACE_MS = 5_000;
/** ARCHITECTURE §4 "Limits". */
export const MAX_KLINE_SUBSCRIPTIONS_PER_SOCKET = 2;
export const MAX_UPSTREAM_KLINE_STREAMS = 200;

const keyOf = (symbol: string, interval: Interval): string => `${symbol}:${interval}`;
const parseKey = (key: string): [string, Interval] => key.split(':') as [string, Interval];

/**
 * Ref-counts kline subscriptions of Socket.IO clients and drives upstream subscribe/unsubscribe (ARCHITECTURE §2).
 * All upstream kline (un)subscribes go through here (backend/CONTEXT.md "Real-time & worker").
 */
@Injectable()
export class SubscriptionManager implements OnApplicationShutdown {
  /** key → number of sockets holding it; a key with 0 is still subscribed upstream during its grace period */
  private readonly refs = new Map<string, number>();
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();
  private readonly bySocket = new Map<string, Set<string>>();

  constructor(@Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider) {}

  /**
   * Adds the subscription for this socket. Returns false when the socket already held it (idempotent).
   * Throws SUBSCRIPTION_LIMIT_REACHED (socket holds 2 already) or MARKET_DATA_UNAVAILABLE (200 upstream streams).
   */
  acquire(socketId: string, symbol: string, interval: Interval): boolean {
    const key = keyOf(symbol, interval);
    const mine = this.bySocket.get(socketId) ?? new Set<string>();
    if (mine.has(key)) return false;
    if (mine.size >= MAX_KLINE_SUBSCRIPTIONS_PER_SOCKET) throw new AppError('SUBSCRIPTION_LIMIT_REACHED');
    if (!this.refs.has(key) && this.refs.size >= MAX_UPSTREAM_KLINE_STREAMS) throw new AppError('MARKET_DATA_UNAVAILABLE');

    mine.add(key);
    this.bySocket.set(socketId, mine);
    const count = this.refs.get(key);
    const timer = this.graceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(key);
    }
    if (count === undefined) this.provider.subscribeKlines(symbol, interval);
    this.refs.set(key, (count ?? 0) + 1);
    return true;
  }

  /** Removes the subscription of this socket (no-op if it did not hold it). */
  release(socketId: string, symbol: string, interval: Interval): void {
    const key = keyOf(symbol, interval);
    const mine = this.bySocket.get(socketId);
    if (!mine?.delete(key)) return;
    if (mine.size === 0) this.bySocket.delete(socketId);
    const count = (this.refs.get(key) ?? 1) - 1;
    this.refs.set(key, count);
    if (count === 0) this.startGrace(key);
  }

  /** Socket disconnected: release everything it held. */
  releaseAll(socketId: string): void {
    for (const key of [...(this.bySocket.get(socketId) ?? [])]) {
      const [symbol, interval] = parseKey(key);
      this.release(socketId, symbol, interval);
    }
  }

  /** Kline subscriptions held by this socket. */
  socketCount(socketId: string): number {
    return this.bySocket.get(socketId)?.size ?? 0;
  }

  /** Upstream kline streams currently subscribed (including those waiting out their grace period). */
  upstreamCount(): number {
    return this.refs.size;
  }

  /** Test support: drop every subscription and unsubscribe upstream immediately. */
  reset(): void {
    for (const t of this.graceTimers.values()) clearTimeout(t);
    this.graceTimers.clear();
    for (const key of this.refs.keys()) {
      const [symbol, interval] = parseKey(key);
      this.provider.unsubscribeKlines(symbol, interval);
    }
    this.refs.clear();
    this.bySocket.clear();
  }

  onApplicationShutdown(): void {
    for (const t of this.graceTimers.values()) clearTimeout(t);
    this.graceTimers.clear();
  }

  private startGrace(key: string): void {
    const timer = setTimeout(() => {
      this.graceTimers.delete(key);
      if (this.refs.get(key) !== 0) return;
      this.refs.delete(key);
      const [symbol, interval] = parseKey(key);
      this.provider.unsubscribeKlines(symbol, interval);
    }, UNSUBSCRIBE_GRACE_MS);
    timer.unref?.();
    this.graceTimers.set(key, timer);
  }
}
