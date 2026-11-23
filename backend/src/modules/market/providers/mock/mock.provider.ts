import { Logger } from '@nestjs/common';
import { AppError } from '../../../../common/app-error';
import type { MarketDataProvider, ProviderStatus } from '../market-data-provider.interface';
import type { Candle, Interval, SymbolInfo, Ticker } from '../../market.types';
import type { PriceBus } from '../../price-bus';

const HEARTBEAT_MS = 10_000;

/** Deterministic provider for tests/offline dev. Phase 0: connection state + heartbeat only. */
export class MockProvider implements MarketDataProvider {
  private readonly logger = new Logger('MockProvider');
  private timer: NodeJS.Timeout | null = null;
  private connected = false;
  private lastMessageAt: number | null = null;

  constructor(private readonly bus: PriceBus) {}

  async start(): Promise<void> {
    this.connected = true;
    this.beat();
    this.timer = setInterval(() => this.beat(), HEARTBEAT_MS);
    this.timer.unref();
    this.bus.emit('status', { status: 'connected', at: Date.now() });
    this.logger.log('mock market data started');
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.connected = false;
  }

  /** Back to the initial state (used by POST /test/reset). */
  reset(): void {
    this.connected = true;
    this.beat();
  }

  getStatus(): ProviderStatus {
    return { name: 'mock', connected: this.connected, lastMessageAt: this.lastMessageAt, activeStreams: 0 };
  }

  private beat(): void {
    this.lastMessageAt = Date.now();
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
