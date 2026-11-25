import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import { SymbolRegistry } from '../market/symbol-registry';
import { TickerStore } from '../market/ticker-store';
import { isConditionMet, type AlertCondition, type AlertStatus } from './alert-match';

export const ACTIVE_ALERT_LIMIT = 20;

/** Fields of the API.md §2 `Alert` type (Decimal/Date serialised globally). */
export const alertSelect = {
  id: true,
  symbol: true,
  condition: true,
  targetPrice: true,
  status: true,
  triggeredPrice: true,
  createdAt: true,
  triggeredAt: true,
} as const;

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly symbols: SymbolRegistry,
    private readonly tickers: TickerStore,
  ) {}

  list(userId: number, status?: AlertStatus) {
    return this.prisma.alert.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: alertSelect,
    });
  }

  /** Check order (API.md §3.5): validation → symbol exists → active limit → current price → already met. */
  async create(userId: number, input: { symbol: string; condition: AlertCondition; targetPrice: number }) {
    await this.symbols.require(input.symbol);
    if ((await this.prisma.alert.count({ where: { userId, status: 'ACTIVE' } })) >= ACTIVE_ALERT_LIMIT) {
      throw new AppError('ALERT_LIMIT_REACHED');
    }
    const ticker = await this.tickers.get(input.symbol);
    if (!ticker) throw new AppError('MARKET_DATA_UNAVAILABLE');
    if (isConditionMet(input.condition, input.targetPrice, ticker.lastPrice)) throw new AppError('ALERT_CONDITION_ALREADY_MET');
    return this.prisma.alert.create({
      data: { userId, symbol: input.symbol, condition: input.condition, targetPrice: input.targetPrice },
      select: alertSelect,
    });
  }

  /** ACTIVE or TRIGGERED; another user's alert is reported exactly like a missing one. */
  async remove(userId: number, id: number) {
    const { count } = await this.prisma.alert.deleteMany({ where: { id, userId } });
    if (count === 0) throw new AppError('ALERT_NOT_FOUND');
    return { id };
  }
}
