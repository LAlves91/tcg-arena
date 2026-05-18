import { Global, Module, OnModuleInit } from '@nestjs/common';
import { HealthCheckRegistry } from '../health/health-check.registry';
import Redis from 'ioredis';
import {
  REDIS_CLIENT_FACTORY,
  RedisClientFactory,
  RedisService,
} from './redis.service';

const ioredisFactory: RedisClientFactory = (options) => new Redis(options);

@Global()
@Module({
  providers: [
    { provide: REDIS_CLIENT_FACTORY, useValue: ioredisFactory },
    RedisService,
  ],
  exports: [RedisService],
})
export class CacheModule implements OnModuleInit {
  constructor(
    private readonly redis: RedisService,
    private readonly health: HealthCheckRegistry,
  ) {}

  onModuleInit(): void {
    this.health.register('redis', async () => {
      await this.redis.ping();
      return { status: 'ok' };
    });
  }
}
