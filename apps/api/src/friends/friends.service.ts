import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Friendship, FriendshipStatus, Prisma, User } from '@prisma/client';
import type { FriendshipDto, UpdateFriendBody } from '@tcg/shared';
import { PrismaService } from '../db/prisma.service';
import { toPublicProfile } from '../users/user-mapper';
import { canonicalPair, isMember, otherUserId } from './friend-pair';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<FriendshipDto[]> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        AND: [
          { OR: [{ userAId: userId }, { userBId: userId }] },
          { status: { in: [FriendshipStatus.pending, FriendshipStatus.accepted] } },
        ],
      },
      include: { userA: true, userB: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDto(row, userId));
  }

  async create(actorId: string, targetUserId: string): Promise<FriendshipDto> {
    if (actorId === targetUserId) {
      throw new BadRequestException('Cannot send a friend request to yourself');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Target user not found');

    const pair = canonicalPair(actorId, targetUserId);

    try {
      const created = await this.prisma.friendship.create({
        data: { ...pair, status: FriendshipStatus.pending },
        include: { userA: true, userB: true },
      });
      return this.toDto(created, actorId);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A friendship already exists between these users');
      }
      throw err;
    }
  }

  async update(actorId: string, friendshipId: string, body: UpdateFriendBody): Promise<FriendshipDto> {
    const row = await this.requireMembership(actorId, friendshipId);

    if (body.action === 'accept') {
      if (row.status !== FriendshipStatus.pending) {
        throw new ConflictException(`Cannot accept a friendship in status "${row.status}"`);
      }
      const updated = await this.prisma.friendship.update({
        where: { id: row.id },
        data: { status: FriendshipStatus.accepted },
        include: { userA: true, userB: true },
      });
      return this.toDto(updated, actorId);
    }

    // action === 'block'
    if (row.status === FriendshipStatus.blocked) {
      throw new ConflictException('Friendship is already blocked');
    }
    const blocked = await this.prisma.friendship.update({
      where: { id: row.id },
      data: { status: FriendshipStatus.blocked },
      include: { userA: true, userB: true },
    });
    return this.toDto(blocked, actorId);
  }

  async remove(actorId: string, friendshipId: string): Promise<void> {
    const row = await this.requireMembership(actorId, friendshipId);
    await this.prisma.friendship.delete({ where: { id: row.id } });
  }

  private async requireMembership(actorId: string, friendshipId: string): Promise<Friendship> {
    const row = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!row) throw new NotFoundException('Friendship not found');
    if (!isMember(row, actorId)) {
      // Hide existence from non-members.
      throw new ForbiddenException('Not a member of this friendship');
    }
    return row;
  }

  private toDto(
    row: Friendship & { userA: User; userB: User },
    selfId: string,
  ): FriendshipDto {
    const other = otherUserId(row, selfId) === row.userAId ? row.userA : row.userB;
    return {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      user: toPublicProfile(other),
    };
  }
}
