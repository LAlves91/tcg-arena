import { EnvService } from '../config/env.service';
import { TokenService } from './token.service';

function makeEnv(overrides: Partial<Record<string, unknown>> = {}): EnvService {
  const values: Record<string, unknown> = {
    JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '30d',
    NODE_ENV: 'test',
    ...overrides,
  };
  return {
    get: (k: string) => values[k],
    isProduction: false,
    isDevelopment: false,
  } as unknown as EnvService;
}

describe('TokenService', () => {
  const service = new TokenService(makeEnv());

  it('signs and verifies access tokens', () => {
    const { token, expiresAt } = service.signAccessToken({ sub: 'user-1', sid: 'sess-1' });
    expect(token.split('.')).toHaveLength(3);
    const payload = service.verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.sid).toBe('sess-1');
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects tampered access tokens', () => {
    const { token } = service.signAccessToken({ sub: 'user-1', sid: 'sess-1' });
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(() => service.verifyAccessToken(tampered)).toThrow();
  });

  it('rejects access tokens signed with another secret', () => {
    const other = new TokenService(makeEnv({ JWT_SECRET: 'a-totally-different-secret-token-32+' }));
    const { token } = other.signAccessToken({ sub: 'user-1', sid: 'sess-1' });
    expect(() => service.verifyAccessToken(token)).toThrow();
  });

  it('issues refresh tokens whose secret verifies against the hash', async () => {
    const refresh = await service.issueRefreshToken('sess-2');
    const parsed = service.parseRefreshToken(refresh.token);
    expect(parsed).toEqual({ sessionId: 'sess-2', secret: expect.any(String) });
    expect(refresh.token.startsWith('sess-2.')).toBe(true);
    expect(refresh.expiresAt.getTime()).toBeGreaterThan(Date.now());
    if (!parsed) throw new Error();
    const ok = await service.verifyRefreshSecret(parsed.secret, refresh.secretHash);
    expect(ok).toBe(true);
  });

  it('rejects mismatched refresh secrets', async () => {
    const refresh = await service.issueRefreshToken('sess-3');
    const ok = await service.verifyRefreshSecret('not-the-secret', refresh.secretHash);
    expect(ok).toBe(false);
  });

  it('returns null when parsing malformed refresh tokens', () => {
    expect(service.parseRefreshToken('no-dot')).toBeNull();
    expect(service.parseRefreshToken('')).toBeNull();
    expect(service.parseRefreshToken('only-prefix.')).toBeNull();
    expect(service.parseRefreshToken('.only-suffix')).toBeNull();
  });
});
