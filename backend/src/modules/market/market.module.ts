import { Global, Inject, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import { PriceBus } from './price-bus';
import { MARKET_DATA_PROVIDER, type MarketDataProvider } from './providers/market-data-provider.interface';
import { BinanceProvider } from './providers/binance/binance.provider';
import { MockProvider } from './providers/mock/mock.provider';

@Global()
@Module({
  providers: [
    PriceBus,
    {
      provide: MARKET_DATA_PROVIDER,
      inject: [ConfigService, PriceBus],
      useFactory: (config: ConfigService<Env, true>, bus: PriceBus): MarketDataProvider =>
        config.get('MARKET_DATA_PROVIDER', { infer: true }) === 'mock'
          ? new MockProvider(bus)
          : new BinanceProvider(bus, config.get('BINANCE_REST_BASE_URL', { infer: true }), config.get('BINANCE_WS_BASE_URL', { infer: true })),
    },
  ],
  exports: [PriceBus, MARKET_DATA_PROVIDER],
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
