import { z } from 'zod';
import {
  authResultSchema,
  authUserSchema,
  discordCallbackBodySchema,
  emailRequestBodySchema,
  emailRequestResponseSchema,
  emailVerifyBodySchema,
  logoutBodySchema,
  logoutResponseSchema,
  refreshBodySchema,
  tokenPairSchema,
} from './schemas';

export type TokenPair = z.infer<typeof tokenPairSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResult = z.infer<typeof authResultSchema>;
export type DiscordCallbackBody = z.infer<typeof discordCallbackBodySchema>;
export type EmailRequestBody = z.infer<typeof emailRequestBodySchema>;
export type EmailRequestResponse = z.infer<typeof emailRequestResponseSchema>;
export type EmailVerifyBody = z.infer<typeof emailVerifyBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
