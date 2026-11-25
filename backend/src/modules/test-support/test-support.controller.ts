import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertWorker } from '../alerts/alert-worker.service';
import { seedDemo } from '../../seed/seed-demo';
import { MARKET_DATA_PROVIDER, type MarketDataProvider } from '../market/providers/market-data-provider.interface';
import { MockProvider } from '../market/providers/mock/mock.provider';
import { SubscriptionManager } from '../market/subscription-manager';
import { SymbolRegistry } from '../market/symbol-registry';
import { TickerStore } from '../market/ticker-store';
import { ResettableThrottlerStorage } from '../rate-limit/rate-limit.module';
import { RealtimeRelay } from '../realtime/realtime.relay';
import { RealtimeService } from '../realtime/realtime.service';
import { CloseCandleDto, DisconnectDto, TickDto } from './dto/market-control.dto';

const DEFAULT_DISCONNECT_MS = 3_000;

/** API.md §3.8. Mounted only when ENABLE_TEST_ENDPOINTS=true AND MARKET_DATA_PROVIDER=mock. */
@Controller('test')
export class TestSupportController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider,
    private readonly throttler: ResettableThrottlerStorage,
    private readonly registry: SymbolRegistry,
    private readonly tickerStore: TickerStore,
    private readonly subscriptions: SubscriptionManager,
    private readonly realtime: RealtimeService,
    private readonly relay: RealtimeRelay,
    private readonly worker: AlertWorker,
  ) {}

  private mock(): MockProvider {
    if (!(this.provider instanceof MockProvider)) throw new AppError('NOT_FOUND');
    return this.provider;
  }

  @Post('reset')
  async reset() {
    // Live clients first, so no subscription of a previous test survives into the next one.
    this.realtime.disconnectAll();
    this.subscriptions.reset();
    this.relay.reset();
    await this.prisma.$executeRawUnsafe('TRUNCATE users, candles RESTART IDENTITY CASCADE');
    await seedDemo(this.prisma);
    const mock = this.mock();
    mock.reset();
    await this.tickerStore.refresh();
    mock.resetCounters();
    this.throttler.reset();
    // IDs restart at 1 after the truncate: the worker must forget every alert of the previous test.
    await this.worker.reload();
    return { ok: true };
  }

  @Post('market/tick')
  async tick(@Body() body: TickDto) {
    await this.registry.require(body.symbol);
    return { ticker: this.mock().tick(body.symbol, body.price, body.quoteVolume) };
  }

  @Post('market/close-candle')
  async closeCandle(@Body() body: CloseCandleDto) {
    await this.registry.require(body.symbol);
    return this.mock().closeCandle(body.symbol, body.interval);
  }

  @Post('market/disconnect')
  disconnect(@Body() body: DisconnectDto) {
    this.mock().simulateDisconnect(body.durationMs ?? DEFAULT_DISCONNECT_MS);
    return { ok: true };
  }

  /** Simulates a backend restart for the worker: memory cleared, ACTIVE alerts reloaded from the DB (AC-ALERT-09). */
  @Post('worker/reload')
  async workerReload() {
    return { activeAlerts: await this.worker.reload() };
  }

  @Get('market/stats')
  stats() {
    return this.mock().getStats();
  }
}
