import { Injectable, Logger } from '@nestjs/common';
import { EnvService } from '../config/env.service';

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  locale?: string;
  email?: string | null;
}

export class DiscordOAuthError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'DiscordOAuthError';
  }
}

const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const USER_URL = 'https://discord.com/api/users/@me';

@Injectable()
export class DiscordClient {
  private readonly logger = new Logger(DiscordClient.name);

  constructor(private readonly env: EnvService) {}

  async exchangeCode(code: string, redirectUri?: string): Promise<DiscordTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.env.get('DISCORD_CLIENT_ID'),
      client_secret: this.env.get('DISCORD_CLIENT_SECRET'),
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri ?? this.env.get('DISCORD_REDIRECT_URI'),
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`Discord token exchange failed: ${res.status} ${text}`);
      throw new DiscordOAuthError('Failed to exchange Discord code', res.status);
    }

    return (await res.json()) as DiscordTokenResponse;
  }

  async fetchUser(accessToken: string): Promise<DiscordUser> {
    const res = await fetch(USER_URL, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`Discord user fetch failed: ${res.status} ${text}`);
      throw new DiscordOAuthError('Failed to fetch Discord user', res.status);
    }
    return (await res.json()) as DiscordUser;
  }

  buildAvatarUrl(userId: string, avatarHash: string | null | undefined): string | null {
    if (!avatarHash) return null;
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}`;
  }
}
