import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { InAppChannel } from './channels/in-app.channel';
import { NOTIFICATION_CHANNELS, type NotificationChannel } from './channels/notification-channel.interface';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/** Notifications (F8). Channels are injected as one array through NOTIFICATION_CHANNELS. */
@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [NotificationsController],
  providers: [
    InAppChannel,
    { provide: NOTIFICATION_CHANNELS, inject: [InAppChannel], useFactory: (...channels: NotificationChannel[]) => channels },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
