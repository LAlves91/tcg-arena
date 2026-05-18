import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { EnvService } from '../config/env.service';
import { AUTH_REQUEST_USER, JwtAuthGuard } from './jwt-auth.guard';
import { TokenService } from './token.service';

function makeEnv(): EnvService {
  return {
    get: (k: string) =>
      ({
        JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '30d',
      } as Record<string, unknown>)[k],
    isProduction: false,
    isDevelopment: false,
  } as unknown as EnvService;
}

function makeCtx(headers: Record<string, string | undefined> = {}): {
  ctx: ExecutionContext;
  req: Record<string | symbol, unknown>;
} {
  const req: Record<string | symbol, unknown> = { headers };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('JwtAuthGuard', () => {
  const tokens = new TokenService(makeEnv());
  const guard = new JwtAuthGuard(tokens);

  it('rejects requests without an Authorization header', () => {
    const { ctx } = makeCtx({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects requests with a malformed Authorization header', () => {
    const { ctx } = makeCtx({ authorization: 'Basic abc' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects invalid bearer tokens', () => {
    const { ctx } = makeCtx({ authorization: 'Bearer not-a-jwt' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('accepts a valid token and stashes the user on the request', () => {
    const { token } = tokens.signAccessToken({ sub: 'u1', sid: 's1' });
    const { ctx, req } = makeCtx({ authorization: `Bearer ${token}` });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req[AUTH_REQUEST_USER]).toEqual({ userId: 'u1', sessionId: 's1' });
  });

  it('rejects expired tokens', async () => {
    const expiredEnv = {
      get: (k: string) =>
        ({
          JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
          JWT_ACCESS_TTL: '1ms',
          JWT_REFRESH_TTL: '30d',
        } as Record<string, unknown>)[k],
      isProduction: false,
      isDevelopment: false,
    } as unknown as EnvService;
    const shortLived = new TokenService(expiredEnv);
    const { token } = shortLived.signAccessToken({ sub: 'u1', sid: 's1' });
    // jwt expiresIn uses seconds; '1ms' → 0s → already expired on the next tick.
    await new Promise((r) => setTimeout(r, 1100));
    const { ctx } = makeCtx({ authorization: `Bearer ${token}` });
    expect(() => guard.canActivate(ctx)).toThrow(/expired|Invalid/);
  });
});
