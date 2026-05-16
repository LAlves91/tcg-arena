import { Injectable } from '@nestjs/common';

export type HealthCheckStatus = 'ok' | 'down' | 'not-configured';

export interface HealthCheckResult {
  status: HealthCheckStatus;
  detail?: string;
}

export type HealthCheck = () => HealthCheckResult | Promise<HealthCheckResult>;

@Injectable()
export class HealthCheckRegistry {
  private readonly checks = new Map<string, HealthCheck>();

  register(name: string, check: HealthCheck): void {
    this.checks.set(name, check);
  }

  async run(names: readonly string[]): Promise<Record<string, HealthCheckResult>> {
    const result: Record<string, HealthCheckResult> = {};
    await Promise.all(
      names.map(async (name) => {
        const check = this.checks.get(name);
        if (!check) {
          result[name] = { status: 'not-configured' };
          return;
        }
        try {
          result[name] = await check();
        } catch (err) {
          result[name] = {
            status: 'down',
            detail: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );
    return result;
  }
}
