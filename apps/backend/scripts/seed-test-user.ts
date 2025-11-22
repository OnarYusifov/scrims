import "@trayb/config/load-env";
import { prisma } from "@trayb/db";
import bcrypt from "bcryptjs";

async function main() {
  const email = "test.admin@trayb.az";
  const username = "testadmin";
  const plainPassword = "TestAdmin123!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const seededUsers = new Map<string, { id: string; username: string }>();

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      password: hashedPassword,
      role: "admin",
      emailVerified: new Date(),
    },
    create: {
      username,
      email,
      password: hashedPassword,
      role: "admin",
      emailVerified: new Date(),
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      emailVerified: true,
    },
  });
  seededUsers.set(user.email, { id: user.id, username: user.username });

  const competitorSeeds = [
    {
      email: "player.valorant@trayb.az",
      username: "valorantAce",
      role: "competitor",
    },
    {
      email: "player.cs2@trayb.az",
      username: "cs2Sharpshooter",
      role: "competitor",
    },
  ];

  for (const competitor of competitorSeeds) {
    const seeded = await prisma.user.upsert({
      where: { email: competitor.email },
      update: {
        username: competitor.username,
        password: hashedPassword,
        role: competitor.role,
        status: "active",
      },
      create: {
        username: competitor.username,
        email: competitor.email,
        password: hashedPassword,
        role: competitor.role,
        status: "active",
      },
      select: {
        id: true,
        username: true,
      },
    });
    seededUsers.set(competitor.email, {
      id: seeded.id,
      username: seeded.username,
    });
  }

  const matchesByExternalId = new Map<string, string>();
  const now = Date.now();
  const matches = [
    {
      externalId: "seed-match-valorant-1",
      hubId: "seed-hub-valorant",
      game: "valorant" as const,
      map: "Ascent",
      queueType: "ranked_global" as const,
      roundsPlayed: 24,
      winner: "alpha" as const,
      startedAt: new Date(now - 3 * 86_400_000),
      endedAt: new Date(now - 3 * 86_400_000 + 35 * 60 * 1000),
      durationSeconds: 35 * 60,
      players: [
        {
          email: "player.valorant@trayb.az",
          team: "alpha" as const,
          ratingBefore: 2080,
          ratingAfter: 2095,
          ratingDelta: 15,
          kills: 25,
          deaths: 16,
          assists: 8,
          acs: 245,
          hsPercentage: 22.5,
          entryKills: 5,
          clutches: 1,
        },
        {
          email: "test.admin@trayb.az",
          team: "bravo" as const,
          ratingBefore: 2050,
          ratingAfter: 2035,
          ratingDelta: -15,
          kills: 18,
          deaths: 20,
          assists: 10,
          acs: 198,
          hsPercentage: 18.2,
          entryKills: 2,
          clutches: 0,
        },
      ],
    },
    {
      externalId: "seed-match-valorant-2",
      hubId: "seed-hub-valorant",
      game: "valorant" as const,
      map: "Split",
      queueType: "ranked_global" as const,
      roundsPlayed: 26,
      winner: "bravo" as const,
      startedAt: new Date(now - 2 * 86_400_000),
      endedAt: new Date(now - 2 * 86_400_000 + 33 * 60 * 1000),
      durationSeconds: 33 * 60,
      players: [
        {
          email: "player.valorant@trayb.az",
          team: "bravo" as const,
          ratingBefore: 2095,
          ratingAfter: 2108,
          ratingDelta: 13,
          kills: 22,
          deaths: 18,
          assists: 11,
          acs: 232,
          hsPercentage: 21.1,
          entryKills: 4,
          clutches: 0,
        },
        {
          email: "test.admin@trayb.az",
          team: "alpha" as const,
          ratingBefore: 2035,
          ratingAfter: 2020,
          ratingDelta: -15,
          kills: 16,
          deaths: 21,
          assists: 9,
          acs: 184,
          hsPercentage: 17.2,
          entryKills: 1,
          clutches: 0,
        },
      ],
    },
    {
      externalId: "seed-match-cs2-1",
      hubId: "seed-hub-cs2",
      game: "cs2" as const,
      map: "Mirage",
      queueType: "ranked_private" as const,
      roundsPlayed: 30,
      winner: "alpha" as const,
      startedAt: new Date(now - 4 * 86_400_000),
      endedAt: new Date(now - 4 * 86_400_000 + 40 * 60 * 1000),
      durationSeconds: 40 * 60,
      players: [
        {
          email: "player.cs2@trayb.az",
          team: "alpha" as const,
          ratingBefore: 1700,
          ratingAfter: 1725,
          ratingDelta: 25,
          kills: 27,
          deaths: 19,
          assists: 6,
          acs: 215,
          hsPercentage: 48.5,
          entryKills: 6,
          clutches: 2,
        },
        {
          email: "test.admin@trayb.az",
          team: "bravo" as const,
          ratingBefore: 1680,
          ratingAfter: 1660,
          ratingDelta: -20,
          kills: 20,
          deaths: 22,
          assists: 7,
          acs: 180,
          hsPercentage: 30.2,
          entryKills: 1,
          clutches: 0,
        },
      ],
    },
  ];

  for (const matchSeed of matches) {
    const match = await prisma.match.upsert({
      where: { externalId: matchSeed.externalId },
      update: {
        hubId: matchSeed.hubId,
        game: matchSeed.game,
        map: matchSeed.map,
        queueType: matchSeed.queueType,
        roundsPlayed: matchSeed.roundsPlayed,
        winner: matchSeed.winner,
        startedAt: matchSeed.startedAt,
        endedAt: matchSeed.endedAt,
        durationSeconds: matchSeed.durationSeconds,
      },
      create: {
        externalId: matchSeed.externalId,
        hubId: matchSeed.hubId,
        game: matchSeed.game,
        map: matchSeed.map,
        queueType: matchSeed.queueType,
        roundsPlayed: matchSeed.roundsPlayed,
        winner: matchSeed.winner,
        startedAt: matchSeed.startedAt,
        endedAt: matchSeed.endedAt,
        durationSeconds: matchSeed.durationSeconds,
      },
      select: {
        id: true,
      },
    });
    matchesByExternalId.set(matchSeed.externalId, match.id);
    await prisma.matchPlayer.deleteMany({ where: { matchId: match.id } });
    await prisma.matchPlayer.createMany({
      data: matchSeed.players.map((player) => {
        const seeded = seededUsers.get(player.email);
        if (!seeded) {
          throw new Error(`Missing seeded user for ${player.email}`);
        }
        return {
          matchId: match.id,
          userId: seeded.id,
          team: player.team,
          ratingBefore: player.ratingBefore,
          ratingAfter: player.ratingAfter,
          ratingDelta: player.ratingDelta,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          acs: player.acs,
          hsPercentage: player.hsPercentage,
          entryKills: player.entryKills,
          clutches: player.clutches,
        };
      }),
    });
  }

  const eloSeeds = [
    {
      email: "player.valorant@trayb.az",
      game: "valorant" as const,
      rating: 2108,
      ratingDelta: 13,
      matchId: matchesByExternalId.get("seed-match-valorant-2"),
    },
    {
      email: "player.cs2@trayb.az",
      game: "cs2" as const,
      rating: 1725,
      ratingDelta: 25,
      matchId: matchesByExternalId.get("seed-match-cs2-1"),
    },
  ];

  await prisma.playerEloHistory.deleteMany({
    where: {
      sourceMatchId: {
        in: Array.from(matchesByExternalId.values()),
      },
    },
  });
  await prisma.playerEloHistory.createMany({
    data: eloSeeds
      .filter((seed) => seed.matchId)
      .map((seed) => {
        const seeded = seededUsers.get(seed.email);
        if (!seeded) {
          throw new Error(`Missing seeded user for ${seed.email}`);
        }
        return {
          userId: seeded.id,
          game: seed.game,
          rating: seed.rating,
          ratingDelta: seed.ratingDelta,
          sourceMatchId: seed.matchId,
        };
      }),
  });

  console.log("✅ Seeded test user:");
  console.table(user);
  console.log("\nUse these credentials for testing:");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${plainPassword}`);
  console.log(
    "\n✅ Seeded sample competitors and matches for analytics charts."
  );
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed test user", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
