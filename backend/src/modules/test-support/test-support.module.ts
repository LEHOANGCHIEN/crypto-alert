import { Module } from '@nestjs/common';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TestSupportController } from './test-support.controller';

@Module({ imports: [RateLimitModule, RealtimeModule], controllers: [TestSupportController] })
export class TestSupportModule {}
