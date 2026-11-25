import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AlertWorker } from './alert-worker.service';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

/** Price alerts (F7) + AlertWorker. Market services come from the global MarketModule. */
@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertWorker],
  exports: [AlertsService, AlertWorker],
})
export class AlertsModule {}
