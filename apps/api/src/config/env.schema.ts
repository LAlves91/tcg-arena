import { z } from 'zod';

const durationSchema = z.string().regex(/^\d+(ms|s|m|h|d)$/, {
  message: 'must be a duration like "15m", "30d", "3600s"',
});

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  WEB_ORIGIN: z.string().url(),
  DISCORD_ACTIVITY_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),
  JWT_SECRET: z.string().min(32, {
    message: 'JWT_SECRET must be at least 32 characters',
  }),
  JWT_ACCESS_TTL: durationSchema.default('15m'),
  JWT_REFRESH_TTL: durationSchema.default('30d'),
  MAGIC_LINK_TTL_SECONDS: z.coerce.number().int().positive().default(900),
});

export type Env = z.infer<typeof envSchema>;
