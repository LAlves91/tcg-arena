import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { LoggerModule } from '../common/logger/logger.module';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { EnvModule } from '../config/env.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [EnvModule, LoggerModule, HealthModule],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
