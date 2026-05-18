import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import jwt, { JwtPayload as JsonWebTokenPayload } from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { EnvService } from '../config/env.service';
import { JwtPayload } from './auth.types';
import { durationToMs, durationToSeconds } from './duration';

const REFRESH_SECRET_BYTES = 48;

export interface SignedAccessToken {
  token: string;
  expiresAt: Date;
}

export interface IssuedRefreshToken {
  /** Full token returned to the caller — format `<sessionId>.<secret>`. */
  token: string;
  /** Hash of the secret portion; persist this in `Session.refreshTokenHash`. */
  secretHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(private readonly env: EnvService) {}

  signAccessToken(payload: JwtPayload): SignedAccessToken {
    const ttl = this.env.get('JWT_ACCESS_TTL');
    const expiresInSec = durationToSeconds(ttl);
    const token = jwt.sign({ sub: payload.sub, sid: payload.sid }, this.env.get('JWT_SECRET'), {
      algorithm: 'HS256',
      expiresIn: expiresInSec,
    });
    const expiresAt = new Date(Date.now() + expiresInSec * 1000);
    return { token, expiresAt };
  }

  verifyAccessToken(token: string): JwtPayload {
    const decoded = jwt.verify(token, this.env.get('JWT_SECRET'), {
      algorithms: ['HS256'],
    }) as JsonWebTokenPayload;
    if (
      typeof decoded !== 'object' ||
      typeof decoded.sub !== 'string' ||
      typeof (decoded as { sid?: unknown }).sid !== 'string'
    ) {
      throw new Error('Malformed JWT payload');
    }
    return {
      sub: decoded.sub,
      sid: (decoded as { sid: string }).sid,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }

  async issueRefreshToken(sessionId: string): Promise<IssuedRefreshToken> {
    const secret = randomBytes(REFRESH_SECRET_BYTES).toString('base64url');
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    const ttlMs = durationToMs(this.env.get('JWT_REFRESH_TTL'));
    return {
      token: `${sessionId}.${secret}`,
      secretHash,
      expiresAt: new Date(Date.now() + ttlMs),
    };
  }

  parseRefreshToken(token: string): { sessionId: string; secret: string } | null {
    const idx = token.indexOf('.');
    if (idx <= 0 || idx === token.length - 1) return null;
    const sessionId = token.slice(0, idx);
    const secret = token.slice(idx + 1);
    if (!sessionId || !secret) return null;
    return { sessionId, secret };
  }

  verifyRefreshSecret(secret: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, secret);
  }
}
