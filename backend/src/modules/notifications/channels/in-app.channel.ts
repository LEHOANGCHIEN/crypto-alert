import { Injectable } from '@nestjs/common';
import { serialize } from '../../../common/serialize';
import { PrismaService } from '../../../prisma/prisma.service';
import { ROOMS, SERVER_EVENTS } from '../../realtime/events';
import { RealtimeService } from '../../realtime/realtime.service';
import type { NotificationRecord } from '../notification.types';
import type { NotificationChannel } from './notification-channel.interface';

/** In-app delivery: `notification:new` to the user's sockets (API.md §4.3). An offline user simply gets nothing; the row waits in the DB. */
@Injectable()
export class InAppChannel implements NotificationChannel {
  readonly name = 'in-app';

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async send(userId: number, notification: NotificationRecord): Promise<void> {
    const unreadCount = await this.prisma.notification.count({ where: { userId, readAt: null } });
    this.realtime.emitToRoom(ROOMS.user(userId), SERVER_EVENTS.NOTIFICATION_NEW, serialize({ notification, unreadCount }));
  }
}
