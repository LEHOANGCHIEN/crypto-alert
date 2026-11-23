import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MARKET_DATA_PROVIDER, type MarketDataProvider } from '../market/providers/market-data-provider.interface';

const VERSION = process.env.npm_package_version ?? '0.1.0';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider,
  ) {}

  @Get()
  async get() {
    let db: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    const s = this.provider.getStatus();
    return {
      status: db === 'up' && s.connected ? 'ok' : 'degraded',
      db,
      marketData: {
        provider: s.name,
        connected: s.connected,
        lastMessageAt: s.lastMessageAt === null ? null : new Date(s.lastMessageAt),
        activeStreams: s.activeStreams,
      },
      version: VERSION,
      time: new Date(),
    };
  }
}
