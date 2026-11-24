import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../../config/env';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitModule, ResettableThrottlerStorage } from '../rate-limit/rate-limit.module';
import { AuthController } from './auth.controller';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService<Env, true>) => ({ secret: c.get('JWT_ACCESS_SECRET', { infer: true }), signOptions: { algorithm: 'HS256' }, verifyOptions: { algorithms: ['HS256'] } }),
    }),
    RateLimitModule,
    ThrottlerModule.forRootAsync({
      imports: [RateLimitModule],
      inject: [ConfigService, ResettableThrottlerStorage],
      useFactory: (c: ConfigService<Env, true>, storage: ResettableThrottlerStorage) => ({
        throttlers: [{ ttl: 60_000, limit: c.get('LOGIN_RATE_LIMIT_PER_MINUTE', { infer: true }) }],
        storage,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, RefreshTokenService, JwtAuthGuard, AuthRateLimitGuard],
  exports: [JwtModule, JwtAuthGuard, RateLimitModule],
})
export class AuthModule {}
