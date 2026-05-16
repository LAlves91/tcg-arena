import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthCheckRegistry, HealthCheckResult, HealthCheckStatus } from './health-check.registry';

const TRACKED_DEPENDENCIES = ['db', 'redis'] as const;

interface ReadinessResponse {
  status: HealthCheckStatus;
  checks: Record<string, HealthCheckResult>;
}

@Controller('health')
export class HealthController {
  constructor(private readonly registry: HealthCheckRegistry) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness(): Promise<ReadinessResponse> {
    const checks = await this.registry.run(TRACKED_DEPENDENCIES);
    const anyDown = Object.values(checks).some((c) => c.status === 'down');
    return {
      status: anyDown ? 'down' : 'ok',
      checks,
    };
  }
}
