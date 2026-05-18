import { describe, expect, it } from 'vitest';
import {
  createFriendBodySchema,
  REGIONS,
  regionSchema,
  updateFriendBodySchema,
  updateMeBodySchema,
} from './schemas';

describe('users zod schemas', () => {
  it('accepts every region in the REGIONS list', () => {
    for (const r of REGIONS) {
      expect(regionSchema.safeParse(r).success).toBe(true);
    }
  });

  it('rejects unknown regions', () => {
    expect(regionSchema.safeParse('mars').success).toBe(false);
  });

  it('updateMe accepts a partial body but requires at least one field', () => {
    expect(updateMeBodySchema.safeParse({ displayName: 'Ada' }).success).toBe(true);
    expect(updateMeBodySchema.safeParse({ locale: 'pt-BR' }).success).toBe(true);
    expect(updateMeBodySchema.safeParse({}).success).toBe(false);
  });

  it('updateMe rejects malformed locales and out-of-range names', () => {
    expect(updateMeBodySchema.safeParse({ locale: 'english' }).success).toBe(false);
    expect(updateMeBodySchema.safeParse({ displayName: '' }).success).toBe(false);
    expect(
      updateMeBodySchema.safeParse({ displayName: 'a'.repeat(100) }).success,
    ).toBe(false);
  });

  it('createFriend requires a uuid target', () => {
    expect(createFriendBodySchema.safeParse({ targetUserId: 'not-a-uuid' }).success).toBe(false);
    expect(
      createFriendBodySchema.safeParse({
        targetUserId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(true);
  });

  it('updateFriend only accepts accept or block', () => {
    expect(updateFriendBodySchema.safeParse({ action: 'accept' }).success).toBe(true);
    expect(updateFriendBodySchema.safeParse({ action: 'block' }).success).toBe(true);
    expect(updateFriendBodySchema.safeParse({ action: 'remove' }).success).toBe(false);
  });
});
