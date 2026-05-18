import {
  discordCallbackBodySchema,
  emailRequestBodySchema,
  emailVerifyBodySchema,
  logoutBodySchema,
  refreshBodySchema,
} from '@tcg/shared';
import { createZodDto } from 'nestjs-zod';

export class DiscordCallbackDto extends createZodDto(discordCallbackBodySchema) {}
export class EmailRequestDto extends createZodDto(emailRequestBodySchema) {}
export class EmailVerifyDto extends createZodDto(emailVerifyBodySchema) {}
export class RefreshDto extends createZodDto(refreshBodySchema) {}
export class LogoutDto extends createZodDto(logoutBodySchema) {}
