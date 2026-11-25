import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

/** Price alerts (F7). Market services come from the global MarketModule. */
@Module({ imports: [AuthModule], controllers: [AlertsController], providers: [AlertsService], exports: [AlertsService] })
export class AlertsModule {}
