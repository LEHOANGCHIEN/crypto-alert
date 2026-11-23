import { Logger } from '@nestjs/common';
import WebSocket from 'ws';
import { AppError } from '../../../../common/app-error';
import type { MarketDataProvider, ProviderStatus } from '../market-data-provider.interface';
import type { Candle, Interval, SymbolInfo, Ticker } from '../../market.types';
import type { PriceBus } from '../../price-bus';

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * Phase 0: minimal. REST ping + one WS connection to `!miniTicker@arr` that only tracks
 * `connected` / `lastMessageAt`. Full relay (subscriptions, watchdog, gap recovery) is Phase 3.
 */
export class BinanceProvider implements MarketDataProvider {
  private readonly logger = new Logger('BinanceProvider');
  private ws: WebSocket | null = null;
  private stopped = false;
  private connected = false;
  private lastMessageAt: number | null = null;
  private backoff = MIN_BACKOFF_MS;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly bus: PriceBus,
    private readonly restBaseUrl: string,
    private readonly wsBaseUrl: string,
  ) {}

  async start(): Promise<void> {
    this.stopped = false;
    try {
      const res = await fetch(`${this.restBaseUrl}/api/v3/ping`, { signal: AbortSignal.timeout(5000) });
      this.logger.log(`REST ping → HTTP ${res.status}`);
    } catch (e) {
      this.logger.warn(`REST ping failed: ${(e as Error).message}`);
    }
    this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.removeAllListeners();
    this.ws?.terminate();
    this.ws = null;
    this.connected = false;
  }

  getStatus(): ProviderStatus {
    return { name: 'binance', connected: this.connected, lastMessageAt: this.lastMessageAt, activeStreams: this.connected ? 1 : 0 };
  }

  private setConnected(value: boolean): void {
    if (this.connected === value) return;
    this.connected = value;
    this.bus.emit('status', { status: value ? 'connected' : 'reconnecting', at: Date.now() });
  }

  private connect(): void {
    const url = `${this.wsBaseUrl}/stream?streams=!miniTicker@arr`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.on('open', () => {
      this.logger.log('upstream WS connected');
      this.backoff = MIN_BACKOFF_MS;
      this.setConnected(true);
    });
    ws.on('message', () => {
      this.lastMessageAt = Date.now();
    });
    ws.on('error', (err) => this.logger.warn(`upstream WS error: ${err.message}`));
    ws.on('close', () => {
      this.setConnected(false);
      if (this.stopped) return;
      const delay = this.backoff;
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
      this.logger.warn(`upstream WS closed, retry in ${delay} ms`);
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    });
  }

  listSymbols(): Promise<SymbolInfo[]> {
    throw new AppError('MARKET_DATA_UNAVAILABLE');
  }
  get24hTickers(): Promise<Ticker[]> {
    throw new AppError('MARKET_DATA_UNAVAILABLE');
  }
  getKlines(_s: string, _i: Interval, _o: { limit: number; endTime?: number }): Promise<Candle[]> {
    throw new AppError('MARKET_DATA_UNAVAILABLE');
  }
  subscribeKlines(): void {}
  unsubscribeKlines(): void {}
}
