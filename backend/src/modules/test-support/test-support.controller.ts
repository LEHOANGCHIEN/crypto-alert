import { Controller, Inject, Post } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { seedDemo } from '../../seed/seed-demo';
import { MARKET_DATA_PROVIDER, type MarketDataProvider } from '../market/providers/market-data-provider.interface';
import { ResettableThrottlerStorage } from '../rate-limit/rate-limit.module';
import { MockProvider } from '../market/providers/mock/mock.provider';

/** API.md §3.8. Mounted only when ENABLE_TEST_ENDPOINTS=true AND MARKET_DATA_PROVIDER=mock. */
@Controller('test')
export class TestSupportController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider,
    private readonly throttler: ResettableThrottlerStorage,
  ) {}

  @Post('reset')
  async reset() {
    await this.prisma.$executeRawUnsafe('TRUNCATE users, candles RESTART IDENTITY CASCADE');
    await seedDemo(this.prisma);
    if (this.provider instanceof MockProvider) this.provider.reset();
    this.throttler.reset();
    return { ok: true };
  }
}
