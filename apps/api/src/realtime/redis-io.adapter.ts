import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { ServerOptions } from 'socket.io';
import { Server } from 'socket.io';
import { EnvService } from '../config/env.service';

/**
 * IoAdapter that:
 * - Pins the Socket.IO path so the URL stays stable for clients.
 * - Optionally wires the Redis pub/sub adapter so multiple API instances
 *   share rooms; called once at bootstrap.
 *
 * Tests skip `connectToRedis` and use a single in-process server.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(env: EnvService): Promise<void> {
    const options = {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD'),
    };
    this.pubClient = new Redis(options);
    this.subClient = this.pubClient.duplicate();
    await Promise.all([
      this.pubClient.connect().catch(() => undefined),
      this.subClient.connect().catch(() => undefined),
    ]);
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    this.logger.log('Socket.IO Redis adapter ready');
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  override async dispose(): Promise<void> {
    await Promise.allSettled([this.pubClient?.quit(), this.subClient?.quit()]);
    this.pubClient = null;
    this.subClient = null;
    this.adapterConstructor = null;
  }
}
