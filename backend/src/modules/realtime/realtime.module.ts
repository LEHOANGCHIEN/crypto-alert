import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeRelay } from './realtime.relay';
import { RealtimeService } from './realtime.service';

/** Socket.IO relay to browsers (ADR-02). Market services come from the global MarketModule. */
@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, RealtimeService, RealtimeRelay],
  exports: [RealtimeService, RealtimeRelay],
})
export class RealtimeModule {}
