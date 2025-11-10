import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTestUsers() {
  console.log('Creating test users...');

  const testUsers = [
    { discordId: '100000000000000001', username: 'TestUser1', elo: 1200 },
    { discordId: '100000000000000002', username: 'TestUser2', elo: 1100 },
    { discordId: '100000000000000003', username: 'TestUser3', elo: 1000 },
    { discordId: '100000000000000004', username: 'TestUser4', elo: 950 },
    { discordId: '100000000000000005', username: 'TestUser5', elo: 900 },
    { discordId: '100000000000000006', username: 'TestUser6', elo: 850 },
    { discordId: '100000000000000007', username: 'TestUser7', elo: 800 },
    { discordId: '100000000000000008', username: 'TestUser8', elo: 750 },
    { discordId: '100000000000000009', username: 'TestUser9', elo: 700 },
  ];

  const rootDiscordId = '492690309143330816';

  const rootUser = await prisma.user.upsert({
    where: { discordId: rootDiscordId },
    update: {
      username: 'RootUser',
      role: 'ROOT',
      isWhitelisted: true,
    },
    create: {
      discordId: rootDiscordId,
      username: 'RootUser',
      role: 'ROOT',
      isWhitelisted: true,
      isCalibrating: false,
      elo: 1200,
      peakElo: 1200,
    },
  });
  console.log(`✓ Ensured ROOT access for ${rootUser.discordId}`);

  for (const testUser of testUsers) {
    const user = await prisma.user.upsert({
      where: { discordId: testUser.discordId },
      update: {
        username: testUser.username,
        elo: testUser.elo,
        peakElo: testUser.elo,
        isWhitelisted: true,
        isCalibrating: false,
      },
      create: {
        discordId: testUser.discordId,
        username: testUser.username,
        elo: testUser.elo,
        peakElo: testUser.elo,
        isWhitelisted: true,
        isCalibrating: false,
        role: 'USER',
      },
    });
    console.log(`✓ Created/updated: ${user.username} (Elo: ${user.elo})`);
  }

  console.log(`\n✅ Created ${testUsers.length} test users!`);
  console.log('\nYou can now use these Discord IDs to join matches:');
  testUsers.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.discordId} - ${u.username} (Elo: ${u.elo})`);
  });
}

addTestUsers()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

