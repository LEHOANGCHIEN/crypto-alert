import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv, testEndpointsEnabled } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { MarketModule } from './modules/market/market.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TestSupportModule } from './modules/test-support/test-support.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, envFilePath: ['.env', '../.env'] }),
    PrismaModule,
    MarketModule,
    HealthModule,
    AuthModule,
    UsersModule,
    // Test routes must not exist at all unless explicitly enabled (route → NOT_FOUND otherwise).
    ...(testEndpointsEnabled(process.env) ? [TestSupportModule] : []),
  ],
})
export class AppModule {}
