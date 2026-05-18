import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthenticatedUser } from './auth.types';
import { AUTH_REQUEST_USER } from './jwt-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest & Record<symbol, unknown>>();
    const user = req[AUTH_REQUEST_USER] as AuthenticatedUser | undefined;
    if (!user) {
      throw new Error('CurrentUser used on a route without JwtAuthGuard');
    }
    return user;
  },
);
