import { Global, Module } from '@nestjs/common';
import { HealthCheckRegistry } from './health-check.registry';
import { HealthController } from './health.controller';

@Global()
@Module({
  controllers: [HealthController],
  providers: [HealthCheckRegistry],
  exports: [HealthCheckRegistry],
})
export class HealthModule {}
