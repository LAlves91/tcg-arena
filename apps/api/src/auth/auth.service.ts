import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, Prisma, Session, User } from '@prisma/client';
import type { AuthResult, AuthUser } from '@tcg/shared';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../db/prisma.service';
import { DiscordClient, DiscordOAuthError } from './discord.client';
import { MagicLinkStore } from './magic-link.store';
import { TokenService } from './token.service';

interface IssuedSession {
  session: Session;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

interface RequestMeta {
  userAgent?: string | null;
  ip?: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly discord: DiscordClient,
    private readonly magicLinks: MagicLinkStore,
  ) {}

  async loginWithDiscord(code: string, redirectUri: string | undefined, meta: RequestMeta): Promise<AuthResult> {
    let tokenResponse;
    let discordUser;
    try {
      tokenResponse = await this.discord.exchangeCode(code, redirectUri);
      discordUser = await this.discord.fetchUser(tokenResponse.access_token);
    } catch (err) {
      if (err instanceof DiscordOAuthError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }

    const avatarUrl = this.discord.buildAvatarUrl(discordUser.id, discordUser.avatar);
    const user = await this.upsertDiscordUser({
      discordId: discordUser.id,
      displayName: discordUser.global_name?.trim() || discordUser.username,
      avatarUrl,
      locale: discordUser.locale ?? 'en',
      email: discordUser.email ?? null,
    });

    const issued = await this.createSession(user.id, meta);
    return this.buildResult(user, issued);
  }

  async requestEmailLogin(email: string): Promise<void> {
    await this.magicLinks.issue(email);
  }

  async verifyEmailLogin(nonce: string, meta: RequestMeta): Promise<AuthResult> {
    const consumed = await this.magicLinks.consume(nonce);
    if (!consumed) {
      throw new UnauthorizedException('Magic link is invalid or has expired');
    }
    const user = await this.upsertEmailUser(consumed.email);
    const issued = await this.createSession(user.id, meta);
    return this.buildResult(user, issued);
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthResult> {
    const parsed = this.tokens.parseRefreshToken(refreshToken);
    if (!parsed) throw new UnauthorizedException('Invalid refresh token');

    const session = await this.prisma.session.findUnique({ where: { id: parsed.sessionId } });
    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revokedAt !== null) {
      // Replay: the session this token belonged to was already rotated/revoked.
      // Burn the entire active session set for this user.
      this.logger.warn(
        `Refresh token reuse detected for session ${session.id} (user ${session.userId}); revoking chain.`,
      );
      await this.revokeAllActiveSessions(session.userId);
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const ok = await this.tokens.verifyRefreshSecret(parsed.secret, session.refreshTokenHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException('User no longer exists');

    const newSessionId = randomUUID();
    const refresh = await this.tokens.issueRefreshToken(newSessionId);

    const [, newSession] = await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.create({
        data: {
          id: newSessionId,
          userId: user.id,
          refreshTokenHash: refresh.secretHash,
          expiresAt: refresh.expiresAt,
          userAgent: meta.userAgent ?? null,
          ip: meta.ip ?? null,
        },
      }),
    ]);

    return this.buildResult(user, {
      session: newSession,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
    });
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private buildResult(user: User, issued: IssuedSession): AuthResult {
    const access = this.tokens.signAccessToken({ sub: user.id, sid: issued.session.id });
    const authUser: AuthUser = {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      region: user.region,
    };
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: issued.refreshToken,
      refreshTokenExpiresAt: issued.refreshTokenExpiresAt.toISOString(),
      user: authUser,
    };
  }

  private async createSession(userId: string, meta: RequestMeta): Promise<IssuedSession> {
    const sessionId = randomUUID();
    const refresh = await this.tokens.issueRefreshToken(sessionId);
    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash: refresh.secretHash,
        expiresAt: refresh.expiresAt,
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
      },
    });
    return { session, refreshToken: refresh.token, refreshTokenExpiresAt: refresh.expiresAt };
  }

  private async revokeAllActiveSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async upsertDiscordUser(input: {
    discordId: string;
    displayName: string;
    avatarUrl: string | null;
    locale: string;
    email: string | null;
  }): Promise<User> {
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.discord,
          providerSubject: input.discordId,
        },
      },
      include: { user: true },
    });

    if (existingIdentity) {
      return this.prisma.user.update({
        where: { id: existingIdentity.userId },
        data: {
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        discordId: input.discordId,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        locale: input.locale,
        email: input.email,
        authIdentities: {
          create: {
            provider: AuthProvider.discord,
            providerSubject: input.discordId,
          },
        },
      },
    });
  }

  private async upsertEmailUser(email: string): Promise<User> {
    const normalized = email.toLowerCase();
    const existing = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.email,
          providerSubject: normalized,
        },
      },
      include: { user: true },
    });
    if (existing) return existing.user;

    try {
      return await this.prisma.user.create({
        data: {
          email: normalized,
          displayName: normalized.split('@')[0],
          authIdentities: {
            create: {
              provider: AuthProvider.email,
              providerSubject: normalized,
            },
          },
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const fallback = await this.prisma.authIdentity.findUnique({
          where: {
            provider_providerSubject: {
              provider: AuthProvider.email,
              providerSubject: normalized,
            },
          },
          include: { user: true },
        });
        if (fallback) return fallback.user;
      }
      throw err;
    }
  }
}
