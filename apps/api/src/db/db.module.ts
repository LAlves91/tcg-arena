import { Global, Module, OnModuleInit } from '@nestjs/common';
import { HealthCheckRegistry } from '../health/health-check.registry';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DbModule implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthCheckRegistry,
  ) {}

  onModuleInit(): void {
    this.health.register('db', async () => {
      await this.prisma.ping();
      return { status: 'ok' };
    });
  }
}
