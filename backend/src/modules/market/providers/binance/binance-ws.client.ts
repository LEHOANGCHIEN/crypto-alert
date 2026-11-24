import { Logger } from '@nestjs/common';
import WebSocket from 'ws';
import { BACKOFF_HEALTHY_RESET_MS, backoffDelay } from './backoff';
import { SendQueue } from './send-queue';

/** The all-market ticker stream is always on (ARCHITECTURE §3.1). */
export const ALL_MARKET_TICKER_STREAM = '!miniTicker@arr';
/** Max stream names per SUBSCRIBE message (keeps each frame small; Binance allows 1024 streams per connection). */
const SUBSCRIBE_CHUNK = 100;

export type BinanceWsHandlers = {
  /** One combined-stream payload: `stream` is e.g. `btcusdt@kline_1h`. */
  onMessage: (stream: string, data: unknown) => void;
  /** Connected / not connected (only changes are reported). */
  onStatus: (connected: boolean) => void;
  /** Called after a reconnect (not after the first connect): the caller recovers gaps. */
  onReopen: () => void;
};

export type BinanceWsOptions = {
  /** No message for this long → force reconnect. */
  watchdogMs?: number;
  /** Binance closes connections after 24 h → reconnect proactively before that. */
  lifetimeMs?: number;
  healthyResetMs?: number;
  random?: () => number;
};

/**
 * Single upstream WebSocket to Binance combined streams (ARCHITECTURE §4): live SUBSCRIBE/UNSUBSCRIBE through a
 * rate-limited queue, watchdog, 23 h proactive reconnect, exponential backoff with jitter, resubscribe on open.
 */
export class BinanceWsClient {
  private readonly logger = new Logger('BinanceWs');
  private readonly streams = new Set<string>();
  private ws: WebSocket | null = null;
  private queue: SendQueue | null = null;
  private stopped = true;
  private isConnected = false;
  private everOpened = false;
  private attempt = 0;
  private nextId = 1;
  private lastMessage: number | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private lifetimeTimer: NodeJS.Timeout | null = null;
  private healthyTimer: NodeJS.Timeout | null = null;
  private readonly watchdogMs: number;
  private readonly lifetimeMs: number;
  private readonly healthyResetMs: number;
  private readonly random: () => number;

  constructor(
    private readonly baseUrl: string,
    private readonly handlers: BinanceWsHandlers,
    opts: BinanceWsOptions = {},
  ) {
    this.watchdogMs = opts.watchdogMs ?? 30_000;
    this.lifetimeMs = opts.lifetimeMs ?? 23 * 60 * 60 * 1000;
    this.healthyResetMs = opts.healthyResetMs ?? BACKOFF_HEALTHY_RESET_MS;
    this.random = opts.random ?? Math.random;
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get lastMessageAt(): number | null {
    return this.lastMessage;
  }

  /** Every upstream stream currently wanted, including the all-market ticker stream (sorted). */
  activeStreams(): string[] {
    return [ALL_MARKET_TICKER_STREAM, ...[...this.streams].sort()];
  }

  /** Kline (and other non-permanent) streams currently wanted. */
  extraStreams(): string[] {
    return [...this.streams].sort();
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.queue?.clear();
    this.dropSocket();
    this.setConnected(false);
  }

  subscribe(stream: string): void {
    if (this.streams.has(stream)) return;
    this.streams.add(stream);
    if (this.isConnected) this.sendMethod('SUBSCRIBE', [stream]);
  }

  unsubscribe(stream: string): void {
    if (!this.streams.delete(stream)) return;
    if (this.isConnected) this.sendMethod('UNSUBSCRIBE', [stream]);
  }

  private open(): void {
    const ws = new WebSocket(`${this.baseUrl}/stream?streams=${ALL_MARKET_TICKER_STREAM}`, { handshakeTimeout: this.watchdogMs });
    this.ws = ws;
    this.queue = new SendQueue((m) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(m);
    });

    ws.on('open', () => {
      if (this.ws !== ws) return;
      this.logger.log('upstream WS connected');
      const reopened = this.everOpened;
      this.everOpened = true;
      this.lastMessage = Date.now();
      this.setConnected(true);
      this.armWatchdog();
      this.lifetimeTimer = this.unref(setTimeout(() => this.reconnectNow('lifetime'), this.lifetimeMs));
      this.healthyTimer = this.unref(setTimeout(() => (this.attempt = 0), this.healthyResetMs));
      // Resubscribe every active stream (the all-market ticker stream is in the URL).
      const extra = this.extraStreams();
      for (let i = 0; i < extra.length; i += SUBSCRIBE_CHUNK) this.sendMethod('SUBSCRIBE', extra.slice(i, i + SUBSCRIBE_CHUNK));
      if (reopened) this.handlers.onReopen();
    });

    ws.on('message', (raw) => {
      if (this.ws !== ws) return;
      this.lastMessage = Date.now();
      this.armWatchdog();
      let msg: { stream?: string; data?: unknown };
      try {
        msg = JSON.parse(raw.toString()) as { stream?: string; data?: unknown };
      } catch {
        return;
      }
      if (typeof msg.stream === 'string') this.handlers.onMessage(msg.stream, msg.data);
    });

    ws.on('error', (err) => this.logger.warn(`upstream WS error: ${err.message}`));

    ws.on('close', () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.clearTimers();
      this.queue?.clear();
      this.setConnected(false);
      if (this.stopped) return;
      const delay = backoffDelay(this.attempt, this.random);
      this.attempt++;
      this.logger.warn(`upstream WS closed, retry in ${delay} ms`);
      this.reconnectTimer = this.unref(setTimeout(() => this.open(), delay));
    });
  }

  /** Planned reconnect (watchdog / 23 h lifetime): close now and open again without waiting for a backoff. */
  private reconnectNow(reason: string): void {
    if (this.stopped) return;
    this.logger.warn(`upstream WS reconnect (${reason})`);
    this.clearTimers();
    this.queue?.clear();
    this.dropSocket();
    this.setConnected(false);
    this.open();
  }

  private armWatchdog(): void {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = this.unref(setTimeout(() => this.reconnectNow('watchdog'), this.watchdogMs));
  }

  private sendMethod(method: 'SUBSCRIBE' | 'UNSUBSCRIBE', params: string[]): void {
    this.queue?.push(JSON.stringify({ method, params, id: this.nextId++ }));
  }

  private setConnected(value: boolean): void {
    if (this.isConnected === value) return;
    this.isConnected = value;
    this.handlers.onStatus(value);
  }

  private dropSocket(): void {
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;
    ws.removeAllListeners();
    ws.on('error', () => undefined);
    ws.terminate();
  }

  private clearTimers(): void {
    for (const t of [this.reconnectTimer, this.watchdogTimer, this.lifetimeTimer, this.healthyTimer]) if (t) clearTimeout(t);
    this.reconnectTimer = this.watchdogTimer = this.lifetimeTimer = this.healthyTimer = null;
  }

  private unref(t: NodeJS.Timeout): NodeJS.Timeout {
    t.unref?.();
    return t;
  }
}
