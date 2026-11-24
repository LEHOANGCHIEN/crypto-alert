import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import type { SymbolInfo } from './market.types';
import { MARKET_DATA_PROVIDER, type MarketDataProvider } from './providers/market-data-provider.interface';

export const SYMBOL_REFRESH_MS = 6 * 60 * 60 * 1000;
const RETRY_MS = 10_000;

/** USDT / TRADING / spot symbols with price precision (ARCHITECTURE §2). Refreshed every 6 h. */
@Injectable()
export class SymbolRegistry implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('SymbolRegistry');
  private symbols: SymbolInfo[] = [];
  private bySymbol = new Map<string, SymbolInfo>();
  private loaded = false;
  private loading: Promise<void> | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(@Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider) {}

  onModuleInit(): void {
    // Never block boot on upstream reachability; retry until the first load works.
    void this.refresh().catch(() => this.scheduleRetry());
    this.timer = setInterval(() => void this.refresh().catch(() => undefined), SYMBOL_REFRESH_MS);
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

  /** Reload from the provider; keeps the old list when the provider fails. */
  refresh(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const list = await this.provider.listSymbols();
        this.symbols = list;
        this.bySymbol = new Map(list.map((s) => [s.symbol, s]));
        this.loaded = true;
        this.logger.log(`loaded ${list.length} USDT symbols`);
      } catch (e) {
        this.logger.warn(`symbol refresh failed: ${(e as Error).message}`);
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

  async list(): Promise<SymbolInfo[]> {
    await this.ensureLoaded();
    return this.symbols;
  }

  async get(symbol: string): Promise<SymbolInfo | undefined> {
    await this.ensureLoaded();
    return this.bySymbol.get(symbol);
  }

  /** Throws SYMBOL_NOT_FOUND for anything that is not a TRADING USDT spot pair. */
  async require(symbol: string): Promise<SymbolInfo> {
    const info = await this.get(symbol);
    if (!info) throw new AppError('SYMBOL_NOT_FOUND');
    return info;
  }
}
