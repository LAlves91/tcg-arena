import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { EnvService } from '../config/env.service';
import { AuthService } from './auth.service';
import {
  DiscordClient,
  DiscordOAuthError,
  DiscordTokenResponse,
  DiscordUser,
} from './discord.client';
import { MagicLinkStore } from './magic-link.store';
import { TokenService } from './token.service';

interface FakeUser {
  id: string;
  discordId: string | null;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  locale: string;
  region: string;
}

interface FakeAuthIdentity {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerSubject: string;
}

interface FakeSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

function makeFakePrisma(): {
  prisma: {
    user: typeof user;
    authIdentity: typeof authIdentity;
    session: typeof session;
    $transaction: (ops: Promise<unknown>[]) => Promise<unknown[]>;
  };
  users: Map<string, FakeUser>;
  identities: FakeAuthIdentity[];
  sessions: Map<string, FakeSession>;
} {
  const users = new Map<string, FakeUser>();
  const identities: FakeAuthIdentity[] = [];
  const sessions = new Map<string, FakeSession>();

  const user = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      users.get(where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<FakeUser> }) => {
      const u = users.get(where.id);
      if (!u) throw new Error('User not found');
      Object.assign(u, data);
      return u;
    },
    create: async ({
      data,
    }: {
      data: {
        discordId?: string | null;
        email?: string | null;
        displayName: string;
        avatarUrl?: string | null;
        locale?: string;
        authIdentities?: { create: { provider: AuthProvider; providerSubject: string } };
      };
    }) => {
      const id = randomUUID();
      const created: FakeUser = {
        id,
        discordId: data.discordId ?? null,
        email: data.email ?? null,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl ?? null,
        locale: data.locale ?? 'en',
        region: 'NA-East',
      };
      users.set(id, created);
      if (data.authIdentities) {
        identities.push({
          id: randomUUID(),
          userId: id,
          provider: data.authIdentities.create.provider,
          providerSubject: data.authIdentities.create.providerSubject,
        });
      }
      return created;
    },
  };

  const authIdentity = {
    findUnique: async ({
      where,
      include,
    }: {
      where: { provider_providerSubject: { provider: AuthProvider; providerSubject: string } };
      include?: { user?: boolean };
    }) => {
      const { provider, providerSubject } = where.provider_providerSubject;
      const match = identities.find(
        (i) => i.provider === provider && i.providerSubject === providerSubject,
      );
      if (!match) return null;
      if (include?.user) {
        return { ...match, user: users.get(match.userId) };
      }
      return match;
    },
  };

  const session = {
    findUnique: async ({ where }: { where: { id: string } }) => sessions.get(where.id) ?? null,
    create: async ({
      data,
    }: {
      data: {
        id: string;
        userId: string;
        refreshTokenHash: string;
        expiresAt: Date;
        userAgent?: string | null;
        ip?: string | null;
      };
    }) => {
      const created: FakeSession = {
        id: data.id,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        userAgent: data.userAgent ?? null,
        ip: data.ip ?? null,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      };
      sessions.set(created.id, created);
      return created;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeSession>;
    }) => {
      const s = sessions.get(where.id);
      if (!s) throw new Error('Session not found');
      Object.assign(s, data);
      return s;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { userId?: string; id?: string; revokedAt?: null };
      data: Partial<FakeSession>;
    }) => {
      let count = 0;
      for (const s of sessions.values()) {
        if (where.userId !== undefined && s.userId !== where.userId) continue;
        if (where.id !== undefined && s.id !== where.id) continue;
        if (where.revokedAt === null && s.revokedAt !== null) continue;
        Object.assign(s, data);
        count++;
      }
      return { count };
    },
  };

  return {
    prisma: {
      user,
      authIdentity,
      session,
      $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    },
    users,
    identities,
    sessions,
  };
}

function makeEnv(): EnvService {
  const values: Record<string, unknown> = {
    JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '30d',
    DISCORD_CLIENT_ID: 'discord-client-id',
    DISCORD_CLIENT_SECRET: 'discord-secret',
    DISCORD_REDIRECT_URI: 'http://localhost:4200/auth/discord/callback',
    MAGIC_LINK_TTL_SECONDS: 900,
    WEB_ORIGIN: 'http://localhost:4200',
    NODE_ENV: 'test',
  };
  return {
    get: (k: string) => values[k],
    isProduction: false,
    isDevelopment: false,
  } as unknown as EnvService;
}

class FakeDiscordClient extends DiscordClient {
  tokenResponse: DiscordTokenResponse = {
    access_token: 'discord-access',
    token_type: 'Bearer',
    expires_in: 604800,
    scope: 'identify',
  };
  userResponse: DiscordUser = {
    id: '123456789',
    username: 'ada',
    global_name: 'Ada Lovelace',
    avatar: 'abc123',
    locale: 'en-US',
  };
  fail: 'token' | 'user' | null = null;

  override async exchangeCode(): Promise<DiscordTokenResponse> {
    if (this.fail === 'token') {
      throw new DiscordOAuthError('Discord token endpoint exploded', 500);
    }
    return this.tokenResponse;
  }

  override async fetchUser(): Promise<DiscordUser> {
    if (this.fail === 'user') {
      throw new DiscordOAuthError('Discord user endpoint exploded', 500);
    }
    return this.userResponse;
  }
}

class FakeMagicLinkStore extends MagicLinkStore {
  private readonly store = new Map<string, { email: string }>();
  private counter = 0;

  override async issue(
    email: string,
  ): Promise<{ nonce: string; email: string; expiresInSeconds: number; link: string }> {
    const nonce = `nonce-${++this.counter}`;
    this.store.set(nonce, { email: email.toLowerCase() });
    return {
      nonce,
      email: email.toLowerCase(),
      expiresInSeconds: 900,
      link: `http://localhost:4200/auth/email/verify?nonce=${nonce}`,
    };
  }

  override async consume(nonce: string): Promise<{ email: string } | null> {
    const record = this.store.get(nonce);
    if (!record) return null;
    this.store.delete(nonce);
    return record;
  }

  expire(nonce: string): void {
    this.store.delete(nonce);
  }
}

function makeService(): {
  service: AuthService;
  prisma: ReturnType<typeof makeFakePrisma>;
  tokens: TokenService;
  discord: FakeDiscordClient;
  magic: FakeMagicLinkStore;
  env: EnvService;
} {
  const env = makeEnv();
  const tokens = new TokenService(env);
  const discord = new FakeDiscordClient(env);
  const magic = new FakeMagicLinkStore(
    {
      get: async () => null,
      set: async () => undefined,
      del: async () => 0,
    } as never,
    env,
  );
  const prisma = makeFakePrisma();
  const service = new AuthService(prisma.prisma as never, tokens, discord, magic);
  return { service, prisma, tokens, discord, magic, env };
}

describe('AuthService — Discord', () => {
  it('creates a user on first login and reuses on second', async () => {
    const { service, prisma } = makeService();

    const first = await service.loginWithDiscord('code-1', undefined, {});
    expect(first.user.displayName).toBe('Ada Lovelace');
    expect(first.user.avatarUrl).toContain('cdn.discordapp.com');
    expect(prisma.users.size).toBe(1);
    expect(prisma.identities).toHaveLength(1);
    expect(prisma.identities[0].provider).toBe(AuthProvider.discord);
    expect(prisma.sessions.size).toBe(1);

    const second = await service.loginWithDiscord('code-2', undefined, {});
    expect(prisma.users.size).toBe(1);
    expect(prisma.identities).toHaveLength(1);
    expect(prisma.sessions.size).toBe(2);
    expect(second.user.id).toBe(first.user.id);
  });

  it('falls back to username when global_name is missing', async () => {
    const { service, discord } = makeService();
    discord.userResponse = { ...discord.userResponse, global_name: null };
    const result = await service.loginWithDiscord('code', undefined, {});
    expect(result.user.displayName).toBe('ada');
  });

  it('maps Discord API failures to 503', async () => {
    const { service, discord } = makeService();
    discord.fail = 'token';
    await expect(service.loginWithDiscord('code', undefined, {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    discord.fail = 'user';
    await expect(service.loginWithDiscord('code', undefined, {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

describe('AuthService — Email magic link', () => {
  it('issues a token pair after a successful nonce verify', async () => {
    const { service, magic, prisma } = makeService();
    const issued = await magic.issue('ada@example.com');
    const result = await service.verifyEmailLogin(issued.nonce, {});
    expect(result.user.displayName).toBe('ada');
    expect(prisma.users.size).toBe(1);
    expect(prisma.sessions.size).toBe(1);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it('rejects an unknown or expired nonce', async () => {
    const { service, magic } = makeService();
    const issued = await magic.issue('ada@example.com');
    magic.expire(issued.nonce);
    await expect(service.verifyEmailLogin(issued.nonce, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.verifyEmailLogin('never-issued', {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('reuses the same User across repeat email logins', async () => {
    const { service, magic, prisma } = makeService();
    const first = await magic.issue('ada@example.com');
    await service.verifyEmailLogin(first.nonce, {});
    const second = await magic.issue('ada@example.com');
    const result = await service.verifyEmailLogin(second.nonce, {});
    expect(prisma.users.size).toBe(1);
    const onlyUser = Array.from(prisma.users.values())[0];
    expect(result.user.id).toBe(onlyUser.id);
  });
});

describe('AuthService — Refresh rotation', () => {
  it('rotates the refresh token and revokes the previous session', async () => {
    const { service, magic, prisma } = makeService();
    const initial = await service.verifyEmailLogin(
      (await magic.issue('ada@example.com')).nonce,
      {},
    );

    const refreshed = await service.refresh(initial.refreshToken, {});
    expect(refreshed.refreshToken).not.toBe(initial.refreshToken);

    const oldSessionId = initial.refreshToken.split('.')[0];
    const oldSession = prisma.sessions.get(oldSessionId);
    expect(oldSession?.revokedAt).not.toBeNull();

    const newSessionId = refreshed.refreshToken.split('.')[0];
    expect(prisma.sessions.get(newSessionId)?.revokedAt).toBeNull();
  });

  it('detects replay and revokes every active session for that user', async () => {
    const { service, magic, prisma } = makeService();
    const initial = await service.verifyEmailLogin(
      (await magic.issue('ada@example.com')).nonce,
      {},
    );

    // Open a second independent session for the same user (e.g. another device).
    const second = await service.verifyEmailLogin(
      (await magic.issue('ada@example.com')).nonce,
      {},
    );

    const rotated = await service.refresh(initial.refreshToken, {});
    // First refresh succeeded; rotated token is fresh.
    expect(rotated.refreshToken).toBeTruthy();

    // Replay the *original* refresh token. It was issued for a session that's
    // now revoked, so the service must burn every active session for the user.
    await expect(service.refresh(initial.refreshToken, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    for (const session of prisma.sessions.values()) {
      expect(session.revokedAt).not.toBeNull();
    }

    // The independent second session should also be revoked.
    await expect(service.refresh(second.refreshToken, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // And the freshly rotated one too.
    await expect(service.refresh(rotated.refreshToken, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects malformed, unknown, expired, or wrong-secret refresh tokens', async () => {
    const { service, magic, prisma } = makeService();
    const initial = await service.verifyEmailLogin(
      (await magic.issue('ada@example.com')).nonce,
      {},
    );

    await expect(service.refresh('no-dot-token', {})).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.refresh('not-a-session.bad-secret', {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const sessionId = initial.refreshToken.split('.')[0];
    await expect(service.refresh(`${sessionId}.wrong-secret`, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const session = prisma.sessions.get(sessionId);
    if (!session) throw new Error();
    session.expiresAt = new Date(Date.now() - 1000);
    await expect(service.refresh(initial.refreshToken, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('AuthService — Logout', () => {
  it('revokes only the targeted session', async () => {
    const { service, magic, prisma } = makeService();
    const a = await service.verifyEmailLogin((await magic.issue('ada@example.com')).nonce, {});
    const b = await service.verifyEmailLogin((await magic.issue('ada@example.com')).nonce, {});

    const sessionIdA = a.refreshToken.split('.')[0];
    const sessionIdB = b.refreshToken.split('.')[0];
    await service.logout(sessionIdA);

    expect(prisma.sessions.get(sessionIdA)?.revokedAt).not.toBeNull();
    expect(prisma.sessions.get(sessionIdB)?.revokedAt).toBeNull();
  });
});
