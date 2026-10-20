import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.gameRecord.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('poker123', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: defaultPassword,
        lifetimeWinnings: 250.0,
        lifetimeLosses: 50.0,
      },
    }),
    prisma.user.create({
      data: {
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: defaultPassword,
        lifetimeWinnings: 80.0,
        lifetimeLosses: 180.0,
      },
    }),
    prisma.user.create({
      data: {
        username: 'charlie',
        email: 'charlie@example.com',
        passwordHash: defaultPassword,
        lifetimeWinnings: 120.0,
        lifetimeLosses: 100.0,
      },
    }),
    prisma.user.create({
      data: {
        username: 'diana',
        email: 'diana@example.com',
        passwordHash: defaultPassword,
        lifetimeWinnings: 320.0,
        lifetimeLosses: 90.0,
      },
    }),
  ]);

  console.log(`✅ Seeded ${users.length} users.`);

  // Create a sample completed game record
  const game = await prisma.gameRecord.create({
    data: {
      roomCode: 'ROYAL8',
      totalPot: 400.0,
      players: [
        {
          userId: users[0].id,
          username: users[0].username,
          buyIn: 100,
          finalChips: 190,
          net: 90,
        },
        {
          userId: users[1].id,
          username: users[1].username,
          buyIn: 100,
          finalChips: 20,
          net: -80,
        },
        {
          userId: users[2].id,
          username: users[2].username,
          buyIn: 100,
          finalChips: 90,
          net: -10,
        },
        {
          userId: users[3].id,
          username: users[3].username,
          buyIn: 100,
          finalChips: 100,
          net: 0,
        },
      ],
    },
  });

  console.log(`✅ Seeded sample game record with ID: ${game.id}`);
  console.log('✨ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
