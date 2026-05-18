import { EnvService } from '../config/env.service';
import {
  RedisClientFactory,
  RedisClientRole,
  RedisService,
} from './redis.service';

type Listener = (channel: string, message: string) => void;

class FakeRedis {
  static instances: FakeRedis[] = [];

  readonly role: RedisClientRole;
  readonly store = new Map<string, string>();
  readonly ttls = new Map<string, number>();
  readonly subscribedChannels = new Set<string>();
  readonly publishLog: Array<{ channel: string; message: string }> = [];
  connected = false;

  private readonly listeners = new Map<string, Listener[]>();
  private static bus = new Map<string, FakeRedis[]>();

  constructor(role: RedisClientRole) {
    this.role = role;
    FakeRedis.instances.push(this);
  }

  static reset(): void {
    FakeRedis.instances = [];
    FakeRedis.bus = new Map();
  }

  on(event: string, listener: Listener): this {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
    return this;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async quit(): Promise<'OK'> {
    this.connected = false;
    for (const channel of this.subscribedChannels) {
      FakeRedis.removeFromBus(channel, this);
    }
    this.subscribedChannels.clear();
    return 'OK';
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    const expires = this.ttls.get(key);
    if (expires !== undefined && Date.now() > expires) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, mode?: 'EX', ttl?: number): Promise<'OK'> {
    this.store.set(key, value);
    if (mode === 'EX' && typeof ttl === 'number') {
      this.ttls.set(key, Date.now() + ttl * 1000);
    } else {
      this.ttls.delete(key);
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.delete(key);
    this.ttls.delete(key);
    return existed ? 1 : 0;
  }

  async publish(channel: string, message: string): Promise<number> {
    this.publishLog.push({ channel, message });
    const subs = FakeRedis.bus.get(channel) ?? [];
    for (const sub of subs) {
      const listeners = sub.listeners.get('message') ?? [];
      for (const listener of listeners) {
        listener(channel, message);
      }
    }
    return subs.length;
  }

  async subscribe(channel: string): Promise<number> {
    this.subscribedChannels.add(channel);
    const list = FakeRedis.bus.get(channel) ?? [];
    if (!list.includes(this)) list.push(this);
    FakeRedis.bus.set(channel, list);
    return this.subscribedChannels.size;
  }

  async unsubscribe(channel: string): Promise<number> {
    this.subscribedChannels.delete(channel);
    FakeRedis.removeFromBus(channel, this);
    return this.subscribedChannels.size;
  }

  private static removeFromBus(channel: string, instance: FakeRedis): void {
    const list = FakeRedis.bus.get(channel);
    if (!list) return;
    const filtered = list.filter((i) => i !== instance);
    if (filtered.length === 0) FakeRedis.bus.delete(channel);
    else FakeRedis.bus.set(channel, filtered);
  }
}

function makeEnv(overrides: Partial<Record<string, unknown>> = {}): EnvService {
  const values: Record<string, unknown> = {
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: undefined,
    ...overrides,
  };
  return {
    get: (key: string) => values[key],
  } as unknown as EnvService;
}

function findClient(role: RedisClientRole): FakeRedis {
  const client = FakeRedis.instances.find((i) => i.role === role);
  if (!client) throw new Error(`No fake redis client created for role: ${role}`);
  return client;
}

async function createService(): Promise<RedisService> {
  FakeRedis.reset();
  const factory: RedisClientFactory = (_options, role) =>
    new FakeRedis(role) as unknown as ReturnType<RedisClientFactory>;
  const service = new RedisService(makeEnv(), factory);
  await service.onModuleInit();
  return service;
}

describe('RedisService', () => {
  afterEach(() => {
    FakeRedis.reset();
  });

  it('creates three clients (default, publisher, subscriber)', async () => {
    const service = await createService();
    try {
      expect(FakeRedis.instances).toHaveLength(3);
      expect(FakeRedis.instances.map((i) => i.role).sort()).toEqual([
        'default',
        'publisher',
        'subscriber',
      ]);
    } finally {
      await service.onModuleDestroy();
    }
  });

  it('connects all clients on module init', async () => {
    const service = await createService();
    try {
      for (const instance of FakeRedis.instances) {
        expect(instance.connected).toBe(true);
      }
    } finally {
      await service.onModuleDestroy();
    }
  });

  it('round-trips JSON values through get/set', async () => {
    const service = await createService();
    try {
      await service.set('user:1', { name: 'Ada', wins: 3 });
      const value = await service.get<{ name: string; wins: number }>('user:1');
      expect(value).toEqual({ name: 'Ada', wins: 3 });
    } finally {
      await service.onModuleDestroy();
    }
  });

  it('returns null for missing keys', async () => {
    const service = await createService();
    try {
      expect(await service.get('missing')).toBeNull();
    } finally {
      await service.onModuleDestroy();
    }
  });

  it('honors TTL via EX argument', async () => {
    const service = await createService();
    try {
      await service.set('ephemeral', 'x', 30);
      const defaultClient = findClient('default');
      expect(defaultClient.ttls.get('ephemeral')).toBeDefined();
    } finally {
      await service.onModuleDestroy();
    }
  });

  it('rejects non-positive ttl values', async () => {
    const service = await createService();
    try {
      await expect(service.set('k', 'v', 0)).rejects.toThrow(/ttlSeconds/);
      await expect(service.set('k', 'v', -1)).rejects.toThrow(/ttlSeconds/);
    } finally {
      await service.onModuleDestroy();
    }
  });

  it('deletes keys', async () => {
    const service = await createService();
    try {
      await service.set('to-delete', 1);
      expect(await service.del('to-delete')).toBe(1);
      expect(await service.get('to-delete')).toBeNull();
    } finally {
      await service.onModuleDestroy();
    }
  });

  it('uses separate clients for publish and subscribe', async () => {
    const service = await createService();
    try {
      const received: unknown[] = [];
      await service.subscribe('events', (payload) => {
        received.push(payload);
      });
      await service.publish('events', { type: 'hello' });
      await new Promise((r) => setImmediate(r));
      expect(received).toEqual([{ type: 'hello' }]);

      const publisher = findClient('publisher');
      const subscriber = findClient('subscriber');
      expect(publisher.publishLog).toHaveLength(1);
      expect(subscriber.subscribedChannels.has('events')).toBe(true);
      expect(publisher.subscribedChannels.size).toBe(0);
    } finally {
      await service.onModuleDestroy();
    }
  });

  it('supports multiple handlers per channel and unsubscribe', async () => {
    const service = await createService();
    try {
      const a: unknown[] = [];
      const b: unknown[] = [];
      const subA = await service.subscribe('chan', (p) => {
        a.push(p);
      });
      await service.subscribe('chan', (p) => {
        b.push(p);
      });

      await service.publish('chan', 1);
      await new Promise((r) => setImmediate(r));
      expect(a).toEqual([1]);
      expect(b).toEqual([1]);

      await subA.unsubscribe();
      await service.publish('chan', 2);
      await new Promise((r) => setImmediate(r));
      expect(a).toEqual([1]);
      expect(b).toEqual([1, 2]);
    } finally {
      await service.onModuleDestroy();
    }
  });

  it('ping resolves when reply is PONG', async () => {
    const service = await createService();
    try {
      await expect(service.ping()).resolves.toBeUndefined();
    } finally {
      await service.onModuleDestroy();
    }
  });
});
