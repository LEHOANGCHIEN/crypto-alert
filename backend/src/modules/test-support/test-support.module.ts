import { Module } from '@nestjs/common';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { TestSupportController } from './test-support.controller';

@Module({ imports: [RateLimitModule], controllers: [TestSupportController] })
export class TestSupportModule {}
