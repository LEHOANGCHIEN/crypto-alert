import type { NotificationRecord } from '../notification.types';

/** A delivery channel (ARCHITECTURE §5). New channels (email, Telegram…) implement this and join NOTIFICATION_CHANNELS. */
export interface NotificationChannel {
  readonly name: string;
  send(userId: number, notification: NotificationRecord): Promise<void>;
}

/** Multi-provider token: an array of every registered NotificationChannel. */
export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');
