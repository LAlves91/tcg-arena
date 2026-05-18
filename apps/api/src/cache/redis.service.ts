import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { EnvService } from '../config/env.service';

export const REDIS_CLIENT_FACTORY = Symbol('REDIS_CLIENT_FACTORY');

export type RedisClientFactory = (
  options: RedisOptions,
  role: RedisClientRole,
) => Redis;

export type RedisClientRole = 'default' | 'publisher' | 'subscriber';

export type RedisSubscriptionHandler = (payload: unknown, channel: string) => void | Promise<void>;

export interface RedisSubscription {
  unsubscribe(): Promise<void>;
}

const defaultFactory: RedisClientFactory = (options) => new Redis(options);

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly defaultClient: Redis;
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly handlers = new Map<string, Set<RedisSubscriptionHandler>>();

  constructor(
    env: EnvService,
    @Inject(REDIS_CLIENT_FACTORY) factory: RedisClientFactory = defaultFactory,
  ) {
    const options: RedisOptions = {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD'),
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    };

    this.defaultClient = factory(options, 'default');
    this.publisher = factory(options, 'publisher');
    this.subscriber = factory(options, 'subscriber');

    this.subscriber.on('message', (channel, message) => {
      void this.dispatch(channel, message);
    });
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.defaultClient.connect().catch((err) => this.logFailure('default', err)),
      this.publisher.connect().catch((err) => this.logFailure('publisher', err)),
      this.subscriber.connect().catch((err) => this.logFailure('subscriber', err)),
    ]);
  }

  async onModuleDestroy(): Promise<void> {
    this.handlers.clear();
    await Promise.allSettled([
      this.defaultClient.quit(),
      this.publisher.quit(),
      this.subscriber.quit(),
    ]);
  }

  async ping(): Promise<void> {
    const reply = await this.defaultClient.ping();
    if (reply !== 'PONG') {
      throw new Error(`Unexpected PING reply: ${reply}`);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.defaultClient.get(key);
    return raw === null ? null : (this.deserialize(raw) as T);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = this.serialize(value);
    if (ttlSeconds === undefined || ttlSeconds === null) {
      await this.defaultClient.set(key, serialized);
      return;
    }
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error(`ttlSeconds must be a positive finite number, got: ${ttlSeconds}`);
    }
    await this.defaultClient.set(key, serialized, 'EX', Math.floor(ttlSeconds));
  }

  async del(key: string): Promise<number> {
    return this.defaultClient.del(key);
  }

  async publish(channel: string, payload: unknown): Promise<number> {
    return this.publisher.publish(channel, this.serialize(payload));
  }

  async subscribe(
    channel: string,
    handler: RedisSubscriptionHandler,
  ): Promise<RedisSubscription> {
    let handlers = this.handlers.get(channel);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(channel, handlers);
      await this.subscriber.subscribe(channel);
    }
    handlers.add(handler);

    return {
      unsubscribe: async (): Promise<void> => {
        const set = this.handlers.get(channel);
        if (!set) return;
        set.delete(handler);
        if (set.size === 0) {
          this.handlers.delete(channel);
          await this.subscriber.unsubscribe(channel);
        }
      },
    };
  }

  private async dispatch(channel: string, message: string): Promise<void> {
    const handlers = this.handlers.get(channel);
    if (!handlers || handlers.size === 0) return;
    const payload = this.deserialize(message);
    await Promise.all(
      Array.from(handlers).map(async (handler) => {
        try {
          await handler(payload, channel);
        } catch (err) {
          this.logger.error(
            `Subscriber handler for channel "${channel}" threw: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }),
    );
  }

  private serialize(value: unknown): string {
    return JSON.stringify(value ?? null);
  }

  private deserialize(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  private logFailure(role: RedisClientRole, err: unknown): void {
    this.logger.error(
      `Failed to connect Redis ${role} client: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
