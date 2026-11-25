import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { InAppChannel } from './channels/in-app.channel';
import { NOTIFICATION_CHANNELS, type NotificationChannel } from './channels/notification-channel.interface';
import { NotificationsService } from './notifications.service';

/** Notifications (F8). Channels are injected as one array through NOTIFICATION_CHANNELS. */
@Module({
  imports: [RealtimeModule],
  providers: [
    InAppChannel,
    { provide: NOTIFICATION_CHANNELS, inject: [InAppChannel], useFactory: (...channels: NotificationChannel[]) => channels },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
