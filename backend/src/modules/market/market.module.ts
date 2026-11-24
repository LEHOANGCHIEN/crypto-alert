import { Global, Inject, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import { PriceBus } from './price-bus';
import { SymbolRegistry } from './symbol-registry';
import { TickerStore } from './ticker-store';
import { CandleCacheService } from './candle-cache.service';
import { SubscriptionManager } from './subscription-manager';
import { MarketController } from './market.controller';
import { MARKET_DATA_PROVIDER, type MarketDataProvider } from './providers/market-data-provider.interface';
import { BinanceProvider } from './providers/binance/binance.provider';
import { MockProvider } from './providers/mock/mock.provider';

@Global()
@Module({
  controllers: [MarketController],
  providers: [
    PriceBus,
    SymbolRegistry,
    TickerStore,
    CandleCacheService,
    SubscriptionManager,
    {
      provide: MARKET_DATA_PROVIDER,
      inject: [ConfigService, PriceBus],
      useFactory: (config: ConfigService<Env, true>, bus: PriceBus): MarketDataProvider =>
        config.get('MARKET_DATA_PROVIDER', { infer: true }) === 'mock'
          ? new MockProvider(bus, config.get('MOCK_AUTO_TICK', { infer: true }))
          : new BinanceProvider(bus, config.get('BINANCE_REST_BASE_URL', { infer: true }), config.get('BINANCE_WS_BASE_URL', { infer: true })),
    },
  ],
  exports: [PriceBus, MARKET_DATA_PROVIDER, SymbolRegistry, TickerStore, SubscriptionManager],
})
export class MarketModule implements OnModuleInit, OnApplicationShutdown {
  constructor(@Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider) {}

  async onModuleInit(): Promise<void> {
    // Do not block boot on upstream reachability.
    void this.provider.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.provider.stop();
  }
}
