import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AuthenticatedUser } from './auth.types';
import { TokenService } from './token.service';

export const AUTH_REQUEST_USER = Symbol('authenticatedUser');

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest & Record<symbol, unknown>>();
    const header = req.headers['authorization'];
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) throw new UnauthorizedException('Missing access token');

    try {
      const payload = this.tokens.verifyAccessToken(token);
      const user: AuthenticatedUser = { userId: payload.sub, sessionId: payload.sid };
      req[AUTH_REQUEST_USER] = user;
      return true;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException('Access token has expired');
      }
      if (err instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid access token');
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
