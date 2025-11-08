import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index';
import { eloService } from '../services/elo.service';

type ProfileUser = {
  id: string;
  discordId: string;
  username: string;
  discriminator: string | null;
  avatar: string | null;
  email?: string | null;
  role: string;
  elo: number;
  peakElo: number;
  matchesPlayed: number;
  isCalibrating: boolean;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalACS: number;
  totalADR: number;
  createdAt: Date;
  lastLogin?: Date | null;
};

interface ProfileResponseOptions {
  includeFullHistory?: boolean;
}

async function buildProfileResponse(
  user: ProfileUser,
  options: ProfileResponseOptions = {},
) {
  const matchLimit = options.includeFullHistory ? undefined : 5;

  const [
    eloHistoryRecords,
    recentStatsRaw,
    matches,
    matchHistoryCount,
    totalsAggregate,
    matchResults,
  ] = await Promise.all([
    prisma.eloHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        matchId: true,
        oldElo: true,
        newElo: true,
        change: true,
        won: true,
        seriesType: true,
        createdAt: true,
      },
    }),
    prisma.playerMatchStats.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        acs: true,
        adr: true,
        kast: true,
        headshotPercent: true,
        kd: true,
        wpr: true,
        rating20: true,
      },
    }),
    prisma.match.findMany({
      where: {
        playerStats: {
          some: { userId: user.id },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(matchLimit !== undefined ? { take: matchLimit } : {}),
      include: {
        teams: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    discordId: true,
                    avatar: true,
                    elo: true,
                    matchesPlayed: true,
                    isCalibrating: true,
                    peakElo: true,
                  },
                },
              },
            },
          },
        },
        playerStats: {
          select: {
            userId: true,
            teamId: true,
            kills: true,
            deaths: true,
            assists: true,
            acs: true,
            adr: true,
            kast: true,
            headshotPercent: true,
            firstKills: true,
            firstDeaths: true,
            multiKills: true,
            wpr: true,
            damageDelta: true,
            rating20: true,
          },
        },
      },
    }),
    prisma.match.count({
      where: {
        playerStats: {
          some: { userId: user.id },
        },
      },
    }),
    prisma.playerMatchStats.aggregate({
      where: { userId: user.id },
      _count: { _all: true },
      _sum: {
        kills: true,
        deaths: true,
        assists: true,
        damageDelta: true,
      },
      _avg: {
        acs: true,
        adr: true,
        kast: true,
        headshotPercent: true,
        wpr: true,
        rating20: true,
      },
    }),
    prisma.playerMatchStats.findMany({
      where: { userId: user.id },
      select: {
        teamId: true,
        match: {
          select: {
            id: true,
            status: true,
            winnerTeamId: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const eloHistoryMap = new Map(
    eloHistoryRecords.map((entry) => [entry.matchId, entry]),
  );

  const recentStats = recentStatsRaw.length > 0
    ? {
        acs: recentStatsRaw.reduce((sum, s) => sum + s.acs, 0) / recentStatsRaw.length,
        adr: recentStatsRaw.reduce((sum, s) => sum + s.adr, 0) / recentStatsRaw.length,
        kast: recentStatsRaw.reduce((sum, s) => sum + s.kast, 0) / recentStatsRaw.length,
        headshotPercent: recentStatsRaw.reduce((sum, s) => sum + s.headshotPercent, 0) / recentStatsRaw.length,
        kd: recentStatsRaw.reduce((sum, s) => sum + s.kd, 0) / recentStatsRaw.length,
        wpr: recentStatsRaw.reduce((sum, s) => sum + s.wpr, 0) / recentStatsRaw.length,
        rating20: recentStatsRaw.reduce((sum, s) => sum + (s.rating20 ?? 1), 0) / recentStatsRaw.length,
      }
    : {
        acs: 0,
        adr: 0,
        kast: 0,
        headshotPercent: 0,
        kd: 0,
        wpr: 0,
        rating20: 1,
      };

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId, 10) % 5}.png`;

  const avgKD = user.totalDeaths > 0 ? user.totalKills / user.totalDeaths : 0;
  const avgACS = user.matchesPlayed > 0 ? user.totalACS / user.matchesPlayed : 0;
  const avgADR = user.matchesPlayed > 0 ? user.totalADR / user.matchesPlayed : 0;

  const badge = eloService.getRankBadge(user.elo);

  const completedEntries = matchResults
    .filter(entry => entry.match.status === 'COMPLETED' && entry.match.winnerTeamId)
    .map((entry) => ({
      teamId: entry.teamId,
      matchId: entry.match.id,
      createdAt: entry.match.createdAt,
      outcome: entry.match.winnerTeamId === entry.teamId ? 'WIN' as const : 'LOSS' as const,
    }));

  const completedSortedAsc = completedEntries.slice().sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  let wins = 0;
  let losses = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentRunType: 'WIN' | 'LOSS' | null = null;
  let currentRunLength = 0;

  for (const entry of completedSortedAsc) {
    if (entry.outcome === 'WIN') {
      wins += 1;
    } else {
      losses += 1;
    }

    if (currentRunType === entry.outcome) {
      currentRunLength += 1;
    } else {
      currentRunType = entry.outcome;
      currentRunLength = 1;
    }

    if (entry.outcome === 'WIN') {
      longestWinStreak = Math.max(longestWinStreak, currentRunLength);
    } else {
      longestLossStreak = Math.max(longestLossStreak, currentRunLength);
    }
  }

  const completedSortedDesc = completedEntries.slice().sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  let currentStreakType: 'WIN' | 'LOSS' | null = null;
  let currentStreakLength = 0;
  for (const entry of completedSortedDesc) {
    if (!currentStreakType) {
      currentStreakType = entry.outcome;
      currentStreakLength = 1;
      continue;
    }
    if (entry.outcome === currentStreakType) {
      currentStreakLength += 1;
    } else {
      break;
    }
  }

  const completedMatchCount = wins + losses;
  const winRate =
    completedMatchCount > 0 ? Number(((wins / completedMatchCount) * 100).toFixed(2)) : 0;

  const aggregateCount = totalsAggregate._count?._all ?? 0;
  const totalKills = totalsAggregate._sum?.kills ?? 0;
  const totalDeaths = totalsAggregate._sum?.deaths ?? 0;
  const totalAssists = totalsAggregate._sum?.assists ?? 0;
  const totalDamageDelta = totalsAggregate._sum?.damageDelta ?? 0;
  const averageRating20 = totalsAggregate._avg?.rating20 ?? 1;
  const averageACSAll = totalsAggregate._avg?.acs ?? 0;
  const averageADRAll = totalsAggregate._avg?.adr ?? 0;
  const averageKASTAll = totalsAggregate._avg?.kast ?? 0;
  const averageHeadshotAll = totalsAggregate._avg?.headshotPercent ?? 0;
  const averageWPRAll = totalsAggregate._avg?.wpr ?? 0;
  const careerKD = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;

  const matchHistory = matches
    .map((match) => {
      const playerStat = match.playerStats.find((stat) => stat.userId === user.id);
      if (!playerStat) {
        return null;
      }

      const userTeam = match.teams.find((team) => team.id === playerStat.teamId);
      const opponentTeam = match.teams.find(
        (team) => team.id !== playerStat.teamId && team.name !== 'Player Pool',
      );

      const userScore = userTeam?.mapsWon ?? 0;
      const opponentScore = opponentTeam?.mapsWon ?? 0;

      let result: 'WIN' | 'LOSS' | 'PENDING' = 'PENDING';
      if (match.winnerTeamId) {
        result = match.winnerTeamId === userTeam?.id ? 'WIN' : 'LOSS';
      }

      const eloEntry = eloHistoryMap.get(match.id);

      return {
        id: match.id,
        createdAt: match.createdAt.toISOString(),
        status: match.status,
        seriesType: match.seriesType,
        result,
        score: {
          user: userScore,
          opponent: opponentScore,
        },
        userTeamName: userTeam?.name ?? 'Unknown',
        opponentTeamName: opponentTeam?.name ?? 'Unknown',
        userStats: {
          kills: playerStat.kills,
          deaths: playerStat.deaths,
          assists: playerStat.assists,
          acs: playerStat.acs,
          adr: playerStat.adr,
          kast: playerStat.kast,
          firstKills: playerStat.firstKills,
          headshotPercent: playerStat.headshotPercent,
          multiKills: playerStat.multiKills,
          wpr: playerStat.wpr,
          damageDelta: playerStat.damageDelta ?? 0,
          rating20: playerStat.rating20 ?? 1,
        },
        eloChange: eloEntry?.change ?? null,
        newElo: eloEntry?.newElo ?? null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return {
    user: {
      ...user,
      avatarUrl,
      avgKD,
      avgACS,
      avgADR,
      rankName: badge.name,
    },
    eloHistory: eloHistoryRecords.slice().reverse(),
    matchHistory,
    matchHistoryCount,
    recentStats,
    summary: {
      wins,
      losses,
      winRate,
      completedMatches: completedMatchCount,
      currentStreak: currentStreakType
        ? { type: currentStreakType, length: currentStreakLength }
        : null,
      longestWinStreak,
      longestLossStreak,
    },
    careerStats: {
      matchesRecorded: aggregateCount,
      kills: totalKills,
      deaths: totalDeaths,
      assists: totalAssists,
      damageDelta: totalDamageDelta,
      kd: careerKD,
      rating20: averageRating20,
      acs: averageACSAll,
      adr: averageADRAll,
      kast: averageKASTAll,
      headshotPercent: averageHeadshotAll,
      wpr: averageWPRAll,
    },
  };
}

export default async function userRoutes(fastify: FastifyInstance) {
  // Get user profile with stats and Elo history
  fastify.get('/profile', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Querystring: { fullHistory?: string } }> & { user: any }, reply: FastifyReply) => {
    try {
      const userId = request.user.userId;
      const includeFullHistory =
        request.query?.fullHistory === 'true' || request.query?.fullHistory === '1';

      // Get user with stats
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          discordId: true,
          username: true,
          discriminator: true,
          avatar: true,
          email: true,
          role: true,
          elo: true,
          peakElo: true,
          matchesPlayed: true,
          isCalibrating: true,
          totalKills: true,
          totalDeaths: true,
          totalAssists: true,
          totalACS: true,
          totalADR: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return buildProfileResponse(user, { includeFullHistory });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user profile by discordId
  fastify.get('/discord/:discordId', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { discordId: string }; Querystring: { fullHistory?: string } }>, reply: FastifyReply) => {
    try {
      const { discordId } = request.params;
      const includeFullHistory =
        request.query?.fullHistory === 'true' || request.query?.fullHistory === '1';

      const user = await prisma.user.findUnique({
        where: { discordId },
        select: {
          id: true,
          discordId: true,
          username: true,
          discriminator: true,
          avatar: true,
          role: true,
          elo: true,
          peakElo: true,
          matchesPlayed: true,
          isCalibrating: true,
          totalKills: true,
          totalDeaths: true,
          totalAssists: true,
          totalACS: true,
          totalADR: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return buildProfileResponse(user, { includeFullHistory });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get any user's profile (for viewing other profiles)
  fastify.get('/:userId', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { userId: string }; Querystring: { fullHistory?: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      const includeFullHistory =
        request.query?.fullHistory === 'true' || request.query?.fullHistory === '1';

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          discordId: true,
          username: true,
          discriminator: true,
          avatar: true,
          role: true,
          elo: true,
          peakElo: true,
          matchesPlayed: true,
          isCalibrating: true,
          totalKills: true,
          totalDeaths: true,
          totalAssists: true,
          totalACS: true,
          totalADR: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return buildProfileResponse(user, { includeFullHistory });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

