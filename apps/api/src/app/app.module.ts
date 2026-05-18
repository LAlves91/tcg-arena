import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { LoggerModule } from '../common/logger/logger.module';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { EnvModule } from '../config/env.module';
import { DbModule } from '../db/db.module';
import { HealthModule } from '../health/health.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    EnvModule,
    LoggerModule,
    HealthModule,
    DbModule,
    CacheModule,
    AuthModule,
    RealtimeModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
