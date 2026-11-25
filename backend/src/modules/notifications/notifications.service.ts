import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import { ROOMS, SERVER_EVENTS } from '../realtime/events';
import { RealtimeService } from '../realtime/realtime.service';
import { NOTIFICATION_CHANNELS, type NotificationChannel } from './channels/notification-channel.interface';
import { notificationSelect, type NotificationRecord } from './notification.types';

export const DEFAULT_NOTIFICATION_LIMIT = 50;

/** Stored notifications (API.md §3.6) and dispatch to every registered channel (ARCHITECTURE §5). */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  constructor(
    @Inject(NOTIFICATION_CHANNELS) private readonly channels: NotificationChannel[],
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** A failing channel is logged and never affects the other channels or the (already committed) trigger. */
  async dispatch(userId: number, notification: NotificationRecord): Promise<void> {
    await Promise.all(
      this.channels.map((c) =>
        c.send(userId, notification).catch((e: unknown) => this.logger.error(`channel ${c.name} failed for notification ${notification.id}: ${(e as Error).message}`)),
      ),
    );
  }

  unreadCount(userId: number): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  /** Newest first; `unreadCount` counts all unread, not only the returned items. */
  async list(userId: number, limit = DEFAULT_NOTIFICATION_LIMIT) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit, select: notificationSelect }),
      this.unreadCount(userId),
    ]);
    return { items, unreadCount };
  }

  /** Idempotent; another user's notification is reported exactly like a missing one. */
  async markRead(userId: number, id: number) {
    const { count } = await this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    const notification = await this.prisma.notification.findFirst({ where: { id, userId }, select: notificationSelect });
    if (!notification) throw new AppError('NOTIFICATION_NOT_FOUND');
    if (count > 0) await this.emitRead(userId, [id]);
    return notification;
  }

  async markAllRead(userId: number) {
    const ids = (await this.prisma.notification.findMany({ where: { userId, readAt: null }, select: { id: true } })).map((n) => n.id);
    const { count } = ids.length
      ? await this.prisma.notification.updateMany({ where: { id: { in: ids }, readAt: null }, data: { readAt: new Date() } })
      : { count: 0 };
    if (count > 0) await this.emitRead(userId, ids);
    return { updated: count };
  }

  /** `notification:read` to all of the user's sockets (API.md §3.6 / §4.3) so other tabs update their bell. */
  private async emitRead(userId: number, ids: number[]): Promise<void> {
    this.realtime.emitToRoom(ROOMS.user(userId), SERVER_EVENTS.NOTIFICATION_READ, { ids, unreadCount: await this.unreadCount(userId) });
  }
}
