import { describe, expect, it } from 'vitest';
import {
  discordCallbackBodySchema,
  emailRequestBodySchema,
  emailVerifyBodySchema,
  refreshBodySchema,
} from './schemas';

describe('auth zod schemas', () => {
  it('accepts a discord callback with a code', () => {
    expect(discordCallbackBodySchema.safeParse({ code: 'abc' }).success).toBe(true);
  });

  it('rejects a discord callback without a code', () => {
    expect(discordCallbackBodySchema.safeParse({}).success).toBe(false);
  });

  it('normalises email by rejecting bogus addresses', () => {
    expect(emailRequestBodySchema.safeParse({ email: 'ada@example.com' }).success).toBe(true);
    expect(emailRequestBodySchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('requires a sufficiently long nonce', () => {
    expect(emailVerifyBodySchema.safeParse({ nonce: 'short' }).success).toBe(false);
    expect(emailVerifyBodySchema.safeParse({ nonce: 'a'.repeat(40) }).success).toBe(true);
  });

  it('requires a refresh token', () => {
    expect(refreshBodySchema.safeParse({}).success).toBe(false);
    expect(refreshBodySchema.safeParse({ refreshToken: 'x.y' }).success).toBe(true);
  });
});
