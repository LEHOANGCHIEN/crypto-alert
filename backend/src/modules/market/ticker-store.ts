import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import type { Ticker } from './market.types';
import { MARKET_DATA_PROVIDER, type MarketDataProvider } from './providers/market-data-provider.interface';
import { SymbolRegistry } from './symbol-registry';

export const TICKER_REFRESH_MS = 5 * 60 * 1000;
const RETRY_MS = 10_000;

/** Latest 24h ticker per USDT symbol (ARCHITECTURE §2). REST snapshot at startup and every 5 min. */
@Injectable()
export class TickerStore implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('TickerStore');
  private tickers = new Map<string, Ticker>();
  private loaded = false;
  private loading: Promise<void> | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider,
    private readonly registry: SymbolRegistry,
  ) {}

  onModuleInit(): void {
    void this.refresh().catch(() => this.scheduleRetry());
    this.timer = setInterval(() => void this.refresh().catch(() => undefined), TICKER_REFRESH_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private scheduleRetry(): void {
    if (this.loaded) return;
    const t = setTimeout(() => void this.refresh().catch(() => this.scheduleRetry()), RETRY_MS);
    t.unref();
  }

  /** Reload the snapshot; keeps the previous data when the provider fails. */
  refresh(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const known = new Set((await this.registry.list()).map((s) => s.symbol));
        const fresh = await this.provider.get24hTickers();
        const next = new Map<string, Ticker>();
        for (const t of fresh) if (known.has(t.symbol)) next.set(t.symbol, t);
        this.tickers = next;
        this.loaded = true;
        this.logger.log(`loaded ${next.size} tickers`);
      } catch (e) {
        this.logger.warn(`ticker refresh failed: ${(e as Error).message}`);
        throw e;
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.refresh();
    if (!this.loaded) throw new AppError('MARKET_DATA_UNAVAILABLE');
  }

  /** All USDT tickers sorted by quoteVolume desc. */
  async list(): Promise<Ticker[]> {
    await this.ensureLoaded();
    return [...this.tickers.values()].sort((a, b) => b.quoteVolume - a.quoteVolume);
  }

  async get(symbol: string): Promise<Ticker | undefined> {
    await this.ensureLoaded();
    return this.tickers.get(symbol);
  }
}
