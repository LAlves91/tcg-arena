import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import type { MyUserProfile, PublicUserProfile } from '@tcg/shared';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateMeDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<MyUserProfile> {
    return this.users.getMe(user.userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateMeDto,
  ): Promise<MyUserProfile> {
    return this.users.updateMe(user.userId, body);
  }

  @Get(':id')
  publicProfile(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PublicUserProfile> {
    return this.users.getPublicProfile(id);
  }
}
