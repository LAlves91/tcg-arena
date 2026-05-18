import { z } from 'zod';

export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: z.string().datetime(),
  refreshTokenExpiresAt: z.string().datetime(),
});

export const authUserSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  locale: z.string(),
  region: z.string(),
});

export const authResultSchema = tokenPairSchema.extend({
  user: authUserSchema,
});

export const discordCallbackBodySchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url().optional(),
});

export const emailRequestBodySchema = z.object({
  email: z.string().email().max(254),
});

export const emailRequestResponseSchema = z.object({
  status: z.literal('sent'),
});

export const emailVerifyBodySchema = z.object({
  nonce: z.string().min(16).max(128),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const logoutResponseSchema = z.object({
  status: z.literal('ok'),
});
