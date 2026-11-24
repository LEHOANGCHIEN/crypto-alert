import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import { SymbolRegistry } from '../market/symbol-registry';

export const WATCHLIST_LIMIT = 50;

const itemSelect = { symbol: true, createdAt: true } as const;

@Injectable()
export class WatchlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly symbols: SymbolRegistry,
  ) {}

  list(userId: number) {
    return this.prisma.watchlistItem.findMany({ where: { userId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: itemSelect });
  }

  /** Idempotent: an existing item is returned unchanged (also at the limit). */
  async add(userId: number, symbol: string) {
    await this.symbols.require(symbol);
    const existing = await this.prisma.watchlistItem.findUnique({ where: { userId_symbol: { userId, symbol } }, select: itemSelect });
    if (existing) return existing;
    if ((await this.prisma.watchlistItem.count({ where: { userId } })) >= WATCHLIST_LIMIT) throw new AppError('WATCHLIST_LIMIT_REACHED');
    try {
      return await this.prisma.watchlistItem.create({ data: { userId, symbol }, select: itemSelect });
    } catch (e) {
      // Concurrent duplicate PUT: the unique (user_id, symbol) wins, return the stored row.
      if ((e as { code?: string }).code === 'P2002') {
        return this.prisma.watchlistItem.findUniqueOrThrow({ where: { userId_symbol: { userId, symbol } }, select: itemSelect });
      }
      throw e;
    }
  }

  /** Idempotent: also succeeds when the symbol is not in the list. */
  async remove(userId: number, symbol: string) {
    await this.prisma.watchlistItem.deleteMany({ where: { userId, symbol } });
    return { symbol };
  }
}
