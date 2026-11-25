import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TestSupportController } from './test-support.controller';

@Module({ imports: [RateLimitModule, RealtimeModule, AlertsModule], controllers: [TestSupportController] })
export class TestSupportModule {}
