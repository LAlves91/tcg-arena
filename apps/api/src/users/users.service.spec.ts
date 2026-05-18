import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

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

function makeFakePrisma() {
  const users = new Map<string, FakeUserRow>();

  const user = {
    findUnique: async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Pick<FakeUserRow, 'displayName' | 'locale' | 'region'>>;
    }) => {
      const u = users.get(where.id);
      if (!u) throw new Error('not found');
      Object.assign(u, data, { updatedAt: new Date() });
      return u;
    },
  };

  function addUser(id: string, partial: Partial<FakeUserRow> = {}): FakeUserRow {
    const u: FakeUserRow = {
      id,
      discordId: null,
      email: `${id}@example.com`,
      displayName: `User ${id.slice(0, 4)}`,
      avatarUrl: null,
      locale: 'en',
      region: 'NA-East',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      ...partial,
    };
    users.set(id, u);
    return u;
  }

  return { prisma: { user } as never, users, addUser };
}

const ID = '11111111-1111-4111-8111-111111111111';

describe('UsersService', () => {
  it('getMe returns the full self profile including email + discordId', async () => {
    const { prisma, addUser } = makeFakePrisma();
    addUser(ID, { email: 'ada@example.com', discordId: '987654' });
    const service = new UsersService(prisma);

    const me = await service.getMe(ID);
    expect(me.id).toBe(ID);
    expect(me.email).toBe('ada@example.com');
    expect(me.discordId).toBe('987654');
    expect(me.locale).toBe('en');
    expect(me.region).toBe('NA-East');
  });

  it('getMe 404s on unknown user', async () => {
    const { prisma } = makeFakePrisma();
    const service = new UsersService(prisma);
    await expect(service.getMe(ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getPublicProfile strips email and discordId', async () => {
    const { prisma, addUser } = makeFakePrisma();
    addUser(ID, { email: 'ada@example.com', discordId: '987654' });
    const service = new UsersService(prisma);

    const profile = await service.getPublicProfile(ID);
    expect(profile.id).toBe(ID);
    expect((profile as Record<string, unknown>).email).toBeUndefined();
    expect((profile as Record<string, unknown>).discordId).toBeUndefined();
    expect((profile as Record<string, unknown>).locale).toBeUndefined();
    expect(profile.region).toBe('NA-East');
  });

  it('updateMe writes the patched fields and returns the refreshed profile', async () => {
    const { prisma, addUser } = makeFakePrisma();
    addUser(ID);
    const service = new UsersService(prisma);

    const updated = await service.updateMe(ID, {
      displayName: '  Ada  ',
      locale: 'pt-BR',
      region: 'EU-West',
    });
    expect(updated.locale).toBe('pt-BR');
    expect(updated.region).toBe('EU-West');
    // Trim should happen at the zod layer; service writes whatever it gets.
    expect(updated.displayName).toBe('  Ada  ');
  });

  it('coerces unknown stored region to NA-East defensively', async () => {
    const { prisma, addUser } = makeFakePrisma();
    addUser(ID, { region: 'mars' });
    const service = new UsersService(prisma);
    const me = await service.getMe(ID);
    expect(me.region).toBe('NA-East');
  });
});
