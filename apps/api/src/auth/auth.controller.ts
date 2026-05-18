import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthResult, EmailRequestResponse, LogoutResponse } from '@tcg/shared';
import { FastifyRequest } from 'fastify';
import { AuthenticatedUser } from './auth.types';
import {
  DiscordCallbackDto,
  EmailRequestDto,
  EmailVerifyDto,
  LogoutDto,
  RefreshDto,
} from './auth.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('discord/callback')
  @HttpCode(HttpStatus.OK)
  discordCallback(@Body() body: DiscordCallbackDto, @Req() req: FastifyRequest): Promise<AuthResult> {
    return this.auth.loginWithDiscord(body.code, body.redirectUri, requestMeta(req));
  }

  @Post('email/request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestEmail(@Body() body: EmailRequestDto): Promise<EmailRequestResponse> {
    await this.auth.requestEmailLogin(body.email);
    return { status: 'sent' };
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() body: EmailVerifyDto, @Req() req: FastifyRequest): Promise<AuthResult> {
    return this.auth.verifyEmailLogin(body.nonce, requestMeta(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: RefreshDto, @Req() req: FastifyRequest): Promise<AuthResult> {
    return this.auth.refresh(body.refreshToken, requestMeta(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() _body: LogoutDto,
  ): Promise<LogoutResponse> {
    await this.auth.logout(user.sessionId);
    return { status: 'ok' };
  }
}

function requestMeta(req: FastifyRequest): { userAgent: string | null; ip: string | null } {
  const ua = req.headers['user-agent'];
  return {
    userAgent: typeof ua === 'string' ? ua : null,
    ip: req.ip ?? null,
  };
}
