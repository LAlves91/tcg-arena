import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { RedisService } from '../cache/redis.service';
import { EnvService } from '../config/env.service';

const NONCE_BYTES = 32;
const PREFIX = 'magic:';

interface MagicLinkRecord {
  email: string;
  createdAt: number;
}

export interface IssuedMagicLink {
  nonce: string;
  email: string;
  expiresInSeconds: number;
  link: string;
}

@Injectable()
export class MagicLinkStore {
  private readonly logger = new Logger(MagicLinkStore.name);

  constructor(
    private readonly redis: RedisService,
    private readonly env: EnvService,
  ) {}

  async issue(email: string): Promise<IssuedMagicLink> {
    const nonce = randomBytes(NONCE_BYTES).toString('base64url');
    const ttl = this.env.get('MAGIC_LINK_TTL_SECONDS');
    const record: MagicLinkRecord = { email: email.toLowerCase(), createdAt: Date.now() };
    await this.redis.set(this.key(nonce), record, ttl);

    const link = `${this.env.get('WEB_ORIGIN')}/auth/email/verify?nonce=${encodeURIComponent(nonce)}`;
    if (!this.env.isProduction) {
      this.logger.log(`Magic link for ${record.email}: ${link}`);
    }

    return { nonce, email: record.email, expiresInSeconds: ttl, link };
  }

  async consume(nonce: string): Promise<{ email: string } | null> {
    const key = this.key(nonce);
    const record = await this.redis.get<MagicLinkRecord>(key);
    if (!record) return null;
    await this.redis.del(key);
    return { email: record.email };
  }

  private key(nonce: string): string {
    return `${PREFIX}${nonce}`;
  }
}
