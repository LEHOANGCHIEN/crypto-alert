import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Ticker } from '../market/market.types';
import { PriceBus } from '../market/price-bus';
import type { NotificationRecord } from '../notifications/notification.types';
import { notificationSelect } from '../notifications/notification.types';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertIndex, type IndexedAlert } from './alert-index';

/**
 * Evaluates every PriceBus ticker against the ACTIVE alerts (ARCHITECTURE §3.3 / §5).
 * Prices come from the all-market ticker stream, so alerts work for symbols nobody is viewing.
 * One-shot: a conditional UPDATE … WHERE status = 'ACTIVE' and the notification INSERT run in one transaction;
 * only the transaction that changed the row dispatches.
 */
@Injectable()
export class AlertWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('AlertWorker');
  private readonly index = new AlertIndex();
  /** Alerts whose trigger transaction is running: later ticks skip them. */
  private readonly inFlight = new Set<number>();
  private offBus: (() => void) | null = null;
  /** Changes made while a reload query runs are re-applied on top of its result. */
  private pending: { added: IndexedAlert[]; removed: Set<number> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: PriceBus,
    private readonly notifications: NotificationsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.offBus = this.bus.on('ticker', (t) => this.onTicker(t));
    await this.reload();
  }

  onApplicationShutdown(): void {
    this.offBus?.();
    this.offBus = null;
  }

  /** Clear memory and load every ACTIVE alert from the DB (boot and POST /test/worker/reload). Returns the count. */
  async reload(): Promise<number> {
    const pending = { added: [] as IndexedAlert[], removed: new Set<number>() };
    this.pending = pending;
    try {
      const rows = await this.prisma.alert.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, userId: true, symbol: true, condition: true, targetPrice: true },
      });
      this.index.load(rows.map((r) => ({ ...r, targetPrice: r.targetPrice.toNumber() })));
      for (const a of pending.added) this.index.add(a);
      for (const id of pending.removed) this.index.remove(id);
    } finally {
      if (this.pending === pending) this.pending = null;
    }
    this.logger.log(`loaded ${this.index.size} active alerts`);
    return this.index.size;
  }

  /** Called by AlertsService after the DB insert succeeded. */
  add(alert: IndexedAlert): void {
    this.pending?.added.push(alert);
    this.index.add(alert);
  }

  /** Called by AlertsService after the DB delete succeeded. */
  remove(id: number): void {
    this.pending?.removed.add(id);
    this.index.remove(id);
  }

  get activeCount(): number {
    return this.index.size;
  }

  private onTicker(t: Ticker): void {
    for (const alert of this.index.matching(t.symbol, t.lastPrice)) {
      if (this.inFlight.has(alert.id)) continue;
      void this.trigger(alert, t.lastPrice);
    }
  }

  private async trigger(alert: IndexedAlert, price: number): Promise<void> {
    this.inFlight.add(alert.id);
    try {
      const notification = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.alert.updateMany({
          where: { id: alert.id, status: 'ACTIVE' },
          data: { status: 'TRIGGERED', triggeredPrice: price, triggeredAt: new Date() },
        });
        if (count !== 1) return null; // already triggered or deleted meanwhile
        return tx.notification.create({
          data: {
            userId: alert.userId,
            alertId: alert.id,
            type: 'ALERT_TRIGGERED',
            payload: { alertId: alert.id, symbol: alert.symbol, condition: alert.condition, targetPrice: alert.targetPrice, triggeredPrice: price },
          },
          select: notificationSelect,
        });
      });
      this.index.remove(alert.id);
      if (notification) await this.notifications.dispatch(alert.userId, notification as unknown as NotificationRecord);
    } catch (e) {
      // The alert stays in the index and is retried on the next matching tick.
      this.logger.error(`trigger of alert ${alert.id} failed: ${(e as Error).message}`);
    } finally {
      this.inFlight.delete(alert.id);
    }
  }
}
