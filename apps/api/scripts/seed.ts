// Deterministic dev seed. Idempotent: re-running upserts the same rows.
// Real production seeding is out of scope; this is for local DX and CI.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Stable UUIDs so seed output is identical across runs (and across machines).
const USERS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    displayName: 'Alice',
    email: 'alice@example.com',
    region: 'NA-East',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    displayName: 'Bob',
    email: 'bob@example.com',
    region: 'NA-West',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    displayName: 'Carol',
    email: 'carol@example.com',
    region: 'EU-West',
  },
];

const DEMO_DECK = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  userId: USERS[0].id,
  gameId: 'op-tcg',
  name: 'Red Luffy Aggro (demo)',
  listJson: {
    leader: 'OP01-001',
    cards: [
      { code: 'OP01-013', count: 4 },
      { code: 'OP01-014', count: 4 },
      { code: 'OP01-024', count: 4 },
    ],
  },
};

async function main(): Promise<void> {
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: user,
      update: { displayName: user.displayName, region: user.region },
    });
  }

  await prisma.deck.upsert({
    where: { id: DEMO_DECK.id },
    create: DEMO_DECK,
    update: {
      name: DEMO_DECK.name,
      listJson: DEMO_DECK.listJson,
    },
  });

  const userCount = await prisma.user.count();
  const deckCount = await prisma.deck.count();
  console.log(`Seeded: ${userCount} users, ${deckCount} decks.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
