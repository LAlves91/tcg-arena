import { Injectable, NotFoundException } from '@nestjs/common';
import { MyUserProfile, PublicUserProfile, UpdateMeBody } from '@tcg/shared';
import { PrismaService } from '../db/prisma.service';
import { toMyProfile, toPublicProfile } from './user-mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<MyUserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return toMyProfile(user);
  }

  async updateMe(userId: string, patch: UpdateMeBody): Promise<MyUserProfile> {
    const data: { displayName?: string; locale?: string; region?: string } = {};
    if (patch.displayName !== undefined) data.displayName = patch.displayName;
    if (patch.locale !== undefined) data.locale = patch.locale;
    if (patch.region !== undefined) data.region = patch.region;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return toMyProfile(user);
  }

  async getPublicProfile(userId: string): Promise<PublicUserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return toPublicProfile(user);
  }
}
