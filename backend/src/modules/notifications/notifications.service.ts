import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICATION_CHANNELS, type NotificationChannel } from './channels/notification-channel.interface';
import type { NotificationRecord } from './notification.types';

/** Dispatches stored notifications to every registered channel (ARCHITECTURE §5). */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  constructor(@Inject(NOTIFICATION_CHANNELS) private readonly channels: NotificationChannel[]) {}

  /** A failing channel is logged and never affects the other channels or the (already committed) trigger. */
  async dispatch(userId: number, notification: NotificationRecord): Promise<void> {
    await Promise.all(
      this.channels.map((c) =>
        c.send(userId, notification).catch((e: unknown) => this.logger.error(`channel ${c.name} failed for notification ${notification.id}: ${(e as Error).message}`)),
      ),
    );
  }
}
