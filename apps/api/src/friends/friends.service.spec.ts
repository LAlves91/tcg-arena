import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { FriendsService } from './friends.service';

interface FakeUserRow {
  id: string;
  discordId: string | null;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  locale: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeFriendshipRow {
  id: string;
  userAId: string;
  userBId: string;
  status: FriendshipStatus;
  createdAt: Date;
}

function requireUser(users: Map<string, FakeUserRow>, id: string): FakeUserRow {
  const u = users.get(id);
  if (!u) throw new Error(`fake prisma: user ${id} not seeded`);
  return u;
}

function makeFakePrisma() {
  const users = new Map<string, FakeUserRow>();
  const friendships = new Map<string, FakeFriendshipRow>();

  const user = {
    findUnique: async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null,
  };

  const friendship = {
    findUnique: async ({ where }: { where: { id: string } }) => friendships.get(where.id) ?? null,
    findMany: async ({
      where,
    }: {
      where: {
        AND?: Array<
          | { OR?: Array<{ userAId?: string; userBId?: string }> }
          | { status?: { in: FriendshipStatus[] } }
        >;
      };
    }) => {
      const conds = where.AND ?? [];
      const orCond = conds.find((c) => 'OR' in c) as
        | { OR: Array<{ userAId?: string; userBId?: string }> }
        | undefined;
      const statusCond = conds.find((c) => 'status' in c) as
        | { status: { in: FriendshipStatus[] } }
        | undefined;
      const candidateId = orCond?.OR[0]?.userAId ?? orCond?.OR[0]?.userBId;
      const userId = candidateId;
      const statusIn = statusCond?.status.in;

      const out = Array.from(friendships.values())
        .filter((r) => (userId ? r.userAId === userId || r.userBId === userId : true))
        .filter((r) => (statusIn ? statusIn.includes(r.status) : true))
        .map((r) => ({
          ...r,
          userA: requireUser(users, r.userAId),
          userB: requireUser(users, r.userBId),
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return out;
    },
    create: async ({
      data,
    }: {
      data: { userAId: string; userBId: string; status: FriendshipStatus };
    }) => {
      const dup = Array.from(friendships.values()).find(
        (r) => r.userAId === data.userAId && r.userBId === data.userBId,
      );
      if (dup) {
        throw new Prisma.PrismaClientKnownRequestError('unique violation', {
          code: 'P2002',
          clientVersion: 'test',
        });
      }
      const row: FakeFriendshipRow = {
        id: randomUUID(),
        userAId: data.userAId,
        userBId: data.userBId,
        status: data.status,
        createdAt: new Date(),
      };
      friendships.set(row.id, row);
      return {
        ...row,
        userA: requireUser(users, row.userAId),
        userB: requireUser(users, row.userBId),
      };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { status?: FriendshipStatus };
    }) => {
      const row = friendships.get(where.id);
      if (!row) throw new Error('not found');
      if (data.status) row.status = data.status;
      return {
        ...row,
        userA: requireUser(users, row.userAId),
        userB: requireUser(users, row.userBId),
      };
    },
    delete: async ({ where }: { where: { id: string } }) => {
      friendships.delete(where.id);
      return null;
    },
  };

  function addUser(id: string, displayName = `User ${id.slice(0, 4)}`): FakeUserRow {
    const u: FakeUserRow = {
      id,
      discordId: null,
      email: `${id}@example.com`,
      displayName,
      avatarUrl: null,
      locale: 'en',
      region: 'NA-East',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    users.set(id, u);
    return u;
  }

  return {
    prisma: { user, friendship } as never,
    users,
    friendships,
    addUser,
  };
}

function lo(): string {
  // Force a deterministic "low" UUID so canonical ordering is predictable.
  return '11111111-1111-4111-8111-111111111111';
}
function hi(): string {
  return '22222222-2222-4222-8222-222222222222';
}
function third(): string {
  return '33333333-3333-4333-8333-333333333333';
}

function makeService() {
  const env = makeFakePrisma();
  const service = new FriendsService(env.prisma);
  return { service, ...env };
}

describe('FriendsService', () => {
  describe('create', () => {
    it('creates a pending friendship between two distinct users', async () => {
      const { service, addUser, friendships } = makeService();
      addUser(lo(), 'Alice');
      addUser(hi(), 'Bob');

      const created = await service.create(lo(), hi());
      expect(created.status).toBe('pending');
      expect(created.user.id).toBe(hi());
      expect(created.user.displayName).toBe('Bob');
      expect(friendships.size).toBe(1);
      const row = Array.from(friendships.values())[0];
      // Canonical ordering: low first.
      expect(row.userAId).toBe(lo());
      expect(row.userBId).toBe(hi());
    });

    it('rejects self-friendship with 400', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      await expect(service.create(lo(), lo())).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns 404 when the target user does not exist', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      await expect(service.create(lo(), hi())).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns 409 on a duplicate friend request (from either direction)', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      addUser(hi());
      await service.create(lo(), hi());
      await expect(service.create(lo(), hi())).rejects.toBeInstanceOf(ConflictException);
      await expect(service.create(hi(), lo())).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns 409 even when the existing row is accepted or blocked', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      addUser(hi());
      const pending = await service.create(lo(), hi());
      await service.update(hi(), pending.id, { action: 'accept' });
      await expect(service.create(lo(), hi())).rejects.toBeInstanceOf(ConflictException);

      // Block then try again — still 409 (blocked prevents new requests from either side).
      await service.update(lo(), pending.id, { action: 'block' });
      await expect(service.create(lo(), hi())).rejects.toBeInstanceOf(ConflictException);
      await expect(service.create(hi(), lo())).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('accept transitions pending → accepted', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      addUser(hi());
      const created = await service.create(lo(), hi());
      const accepted = await service.update(hi(), created.id, { action: 'accept' });
      expect(accepted.status).toBe('accepted');
    });

    it('accept on a non-pending row is a 409', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      addUser(hi());
      const created = await service.create(lo(), hi());
      await service.update(hi(), created.id, { action: 'accept' });
      await expect(service.update(hi(), created.id, { action: 'accept' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('block works from any state and is idempotent-ish (409 when already blocked)', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      addUser(hi());
      const created = await service.create(lo(), hi());

      const blocked = await service.update(lo(), created.id, { action: 'block' });
      expect(blocked.status).toBe('blocked');
      await expect(service.update(hi(), created.id, { action: 'block' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects updates from a user not in the pair (403)', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      addUser(hi());
      addUser(third(), 'Charlie');
      const created = await service.create(lo(), hi());
      await expect(service.update(third(), created.id, { action: 'accept' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('404s on an unknown friendship id', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      await expect(
        service.update(lo(), '00000000-0000-4000-8000-000000000000', { action: 'accept' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('lets either party delete a pending row', async () => {
      const { service, addUser, friendships } = makeService();
      addUser(lo());
      addUser(hi());
      const created = await service.create(lo(), hi());
      await service.remove(hi(), created.id);
      expect(friendships.size).toBe(0);
    });

    it('lets either party delete an accepted row (unfriend)', async () => {
      const { service, addUser, friendships } = makeService();
      addUser(lo());
      addUser(hi());
      const created = await service.create(lo(), hi());
      await service.update(hi(), created.id, { action: 'accept' });
      await service.remove(lo(), created.id);
      expect(friendships.size).toBe(0);
    });

    it('rejects deletion by a third party with 403', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      addUser(hi());
      addUser(third());
      const created = await service.create(lo(), hi());
      await expect(service.remove(third(), created.id)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('list', () => {
    it('returns pending+accepted friendships with the other user inlined, hides blocked', async () => {
      const { service, addUser } = makeService();
      addUser(lo(), 'Alice');
      addUser(hi(), 'Bob');
      addUser(third(), 'Charlie');

      const pending = await service.create(lo(), hi());
      await service.update(hi(), pending.id, { action: 'accept' });
      await service.create(lo(), third()); // pending

      const list = await service.list(lo());
      expect(list).toHaveLength(2);
      expect(list.every((f) => f.user.id !== lo())).toBe(true);
      const statuses = list.map((f) => f.status).sort();
      expect(statuses).toEqual(['accepted', 'pending']);

      // Block the accepted one: it should disappear from the list.
      const acceptedRow = list.find((f) => f.status === 'accepted');
      if (!acceptedRow) throw new Error();
      await service.update(lo(), acceptedRow.id, { action: 'block' });
      const after = await service.list(lo());
      expect(after.map((f) => f.status)).toEqual(['pending']);
    });

    it('does not surface email / discordId / locale on the inlined user', async () => {
      const { service, addUser } = makeService();
      addUser(lo());
      addUser(hi());
      await service.create(lo(), hi());
      const [friend] = await service.list(lo());
      expect((friend.user as Record<string, unknown>).email).toBeUndefined();
      expect((friend.user as Record<string, unknown>).discordId).toBeUndefined();
      expect((friend.user as Record<string, unknown>).locale).toBeUndefined();
    });
  });
});
