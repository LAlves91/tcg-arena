import { z } from 'zod';

export const REGIONS = [
  'NA-East',
  'NA-West',
  'SA',
  'EU-West',
  'EU-Central',
  'APAC',
] as const;

export const regionSchema = z.enum(REGIONS);
export type Region = z.infer<typeof regionSchema>;

export const FRIENDSHIP_STATUSES = ['pending', 'accepted', 'blocked'] as const;
export const friendshipStatusSchema = z.enum(FRIENDSHIP_STATUSES);
export type FriendshipStatusValue = z.infer<typeof friendshipStatusSchema>;

const localeSchema = z
  .string()
  .min(2)
  .max(10)
  .regex(/^[a-zA-Z]{2,3}([-_][a-zA-Z0-9]{2,8})?$/, {
    message: 'must be a BCP-47 locale like "en" or "pt-BR"',
  });

const displayNameSchema = z.string().trim().min(1).max(64);

const uuidSchema = z.string().uuid();

const isoDateSchema = z.string().datetime();

export const publicUserProfileSchema = z.object({
  id: uuidSchema,
  displayName: displayNameSchema,
  avatarUrl: z.string().url().nullable(),
  region: regionSchema,
  createdAt: isoDateSchema,
});

export const myUserProfileSchema = publicUserProfileSchema.extend({
  email: z.string().email().nullable(),
  discordId: z.string().nullable(),
  locale: localeSchema,
  updatedAt: isoDateSchema,
});

export const updateMeBodySchema = z
  .object({
    displayName: displayNameSchema.optional(),
    locale: localeSchema.optional(),
    region: regionSchema.optional(),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export const createFriendBodySchema = z.object({
  targetUserId: uuidSchema,
});

export const updateFriendBodySchema = z.object({
  action: z.enum(['accept', 'block']),
});

export const friendshipDtoSchema = z.object({
  id: uuidSchema,
  status: friendshipStatusSchema,
  createdAt: isoDateSchema,
  user: publicUserProfileSchema,
});

export const friendsListResponseSchema = z.object({
  friends: z.array(friendshipDtoSchema),
});
