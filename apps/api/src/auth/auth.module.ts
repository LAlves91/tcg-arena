import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiscordClient } from './discord.client';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MagicLinkStore } from './magic-link.store';
import { TokenService } from './token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TokenService, DiscordClient, MagicLinkStore, JwtAuthGuard],
  exports: [AuthService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
