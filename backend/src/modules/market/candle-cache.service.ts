import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { isWindowComplete, mergeCandles, windowBounds } from './candle-window';
import { INTERVAL_MS } from './intervals';
import type { Candle, Interval } from './market.types';
import { MARKET_DATA_PROVIDER, type MarketDataProvider } from './providers/market-data-provider.interface';
import { PriceBus } from './price-bus';
import { SymbolRegistry } from './symbol-registry';

/**
 * Serves klines (ARCHITECTURE §3.2): closed candles come from the `candles` table when the window is complete,
 * so only the latest 2 candles (last closed + open) are fetched from the provider. Otherwise the full window is
 * fetched and its closed candles are stored. The open candle is never stored.
 */
@Injectable()
export class CandleCacheService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('CandleCache');
  private offBus: (() => void) | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider,
    private readonly registry: SymbolRegistry,
    private readonly bus: PriceBus,
  ) {}

  /** Live closed candles (upstream `kline` with isClosed) are upserted into the cache (ARCHITECTURE §3.2 step 4). */
  onModuleInit(): void {
    this.offBus = this.bus.on('kline', ({ symbol, interval, candle }) => {
      if (!candle.isClosed) return;
      this.storeClosed(symbol, interval, [candle]).catch((e: unknown) => this.logger.warn(`closed candle upsert failed: ${(e as Error).message}`));
    });
  }

  onApplicationShutdown(): void {
    this.offBus?.();
    this.offBus = null;
  }

  async getKlines(symbol: string, interval: Interval, limit: number, now = Date.now()): Promise<Candle[]> {
    await this.registry.require(symbol);
    const bounds = windowBounds(interval, limit, now);

    const fromDb = bounds.closedCount === 0 ? [] : await this.readClosed(symbol, interval, bounds.firstOpen, bounds.lastClosedOpen);
    if (isWindowComplete(fromDb.map((c) => c.openTime), interval, bounds)) {
      const recent = await this.provider.getKlines(symbol, interval, { limit: 2 });
      await this.storeClosed(symbol, interval, recent);
      return mergeCandles(fromDb, recent, limit);
    }

    const full = await this.provider.getKlines(symbol, interval, { limit });
    await this.storeClosed(symbol, interval, full);
    return full.slice(-limit);
  }

  /** Closed candles of the window, ascending. */
  private async readClosed(symbol: string, interval: Interval, fromOpen: number, toOpen: number): Promise<Candle[]> {
    const rows = await this.prisma.candle.findMany({
      where: { symbol, interval, openTime: { gte: new Date(fromOpen), lte: new Date(toOpen) } },
      orderBy: { openTime: 'asc' },
    });
    return rows.map((r) => ({
      openTime: r.openTime.getTime(),
      closeTime: r.closeTime.getTime(),
      open: r.open.toNumber(),
      high: r.high.toNumber(),
      low: r.low.toNumber(),
      close: r.close.toNumber(),
      volume: r.volume.toNumber(),
      quoteVolume: r.quoteVolume.toNumber(),
      isClosed: true,
    }));
  }

  /** Upsert closed candles only. Closed candles are final, so an existing row is left untouched. */
  async storeClosed(symbol: string, interval: Interval, candles: Candle[]): Promise<void> {
    const closed = candles.filter((c) => c.isClosed && c.closeTime === c.openTime + INTERVAL_MS[interval] - 1);
    if (closed.length === 0) return;
    const data: Prisma.CandleCreateManyInput[] = closed.map((c) => ({
      symbol,
      interval,
      openTime: new Date(c.openTime),
      closeTime: new Date(c.closeTime),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      quoteVolume: c.quoteVolume,
    }));
    await this.prisma.candle.createMany({ data, skipDuplicates: true });
  }
}
