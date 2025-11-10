import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { eloService, PerformanceEvaluation } from '../services/elo.service';
import { randomService } from '../services/random.service';
import { parseScoreboardFromHtml } from '../services/scoreboard-html.service';
import { MatchStatus, MatchStatsReviewStatus, MatchStatsSource, SeriesType, Prisma } from '@prisma/client';
import { emitRealtimeEvent } from '../events/app-events';
import {
  DiscordIdentity,
  MatchResultPayload,
  MatchResultPlayer,
} from '../bot/types';
import {
  fetchMatchesForCache,
  getMatchListFromCache,
  invalidateMatchLists,
  invalidateMatchSnapshot,
  refreshMatchSnapshot,
  setMatchListCache,
} from '../cache/match-cache';
import { recalculateUserTotals } from '../services/statistics.service';
import { enqueueMatchSnapshotRefresh, enqueueProfileRefresh } from '../queues/job-queue';

const buildDiscordIdentity = (user: {
  discordId: string | null;
  username: string | null;
  avatar: string | null;
}): DiscordIdentity | null => {
  if (!user.discordId) {
    return null;
  }
  return {
    discordId: user.discordId,
    username: user.username,
    avatarUrl: user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
      : null,
  };
};

interface AggregatedPlayerStats {
  userId: string;
  teamId?: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  headshotPercent?: number;
  firstKills?: number;
  firstDeaths?: number;
  kast?: number;
  multiKills?: number;
  damageDelta?: number;
}

interface TeamMemberWithUser {
  userId: string;
  user: {
    id: string;
    username: string | null;
    discordId: string | null;
    avatar: string | null;
    elo: number;
    matchesPlayed?: number;
    isCalibrating?: boolean;
    peakElo?: number;
  };
}

interface TeamWithMembers {
  id: string;
  name: string;
  members: TeamMemberWithUser[];
  mapsWon: number | null;
}

const createMatchResultPayload = ({
  matchId,
  seriesType,
  teams,
  winnerTeamId,
  maps,
  stats,
  eloResults,
  completedAt,
}: {
  matchId: string;
  seriesType: string;
  teams: TeamWithMembers[];
  winnerTeamId: string;
  maps: Array<{
    mapName: string;
    score: { alpha: number; bravo: number };
    winnerTeamId: string;
  }>;
  stats: Map<string, AggregatedPlayerStats>;
  eloResults: Array<{
    userId: string;
    oldElo: number;
    newElo: number;
    change: number;
  }>;
  completedAt: Date;
}): MatchResultPayload => {
  const teamAlpha = teams.find((t) => t.name === 'Team Alpha');
  const teamBravo = teams.find((t) => t.name === 'Team Bravo');

  const summarizeTeam = (
    team: TeamWithMembers | undefined,
    teamKey: 'ALPHA' | 'BRAVO',
  ): MatchResultPayload['teamAlpha'] => {
    if (!team) {
      return {
        name: teamKey === 'ALPHA' ? 'Team Alpha' : 'Team Bravo',
        score: 0,
        players: [],
      };
    }

    const players: MatchResultPlayer[] = team.members.map((member) => {
      const identity = buildDiscordIdentity(member.user);
      const stat = stats.get(member.userId);
      const elo = eloResults.find((result) => result.userId === member.userId);
      const kills = stat?.kills ?? 0;
      const deaths = stat?.deaths ?? 0;
      const assists = stat?.assists ?? 0;
      const acs = stat?.acs ?? 0;
      const adr = stat?.adr ?? 0;
      const plusMinus = kills - deaths;

      return {
        ...identity,
        username: identity?.username ?? member.user.username,
        team: teamKey,
        kills,
        deaths,
        assists,
        acs,
        adr,
        plusMinus,
        elo: elo
          ? {
              oldElo: elo.oldElo,
              newElo: elo.newElo,
              change: elo.change,
            }
          : undefined,
      };
    });

    const score = maps.filter((map) =>
      map.winnerTeamId === team.id,
    ).length;

    return {
      name: team.name,
      score,
      players,
    };
  };

  const matchMaps = maps.map((map) => ({
    mapName: map.mapName,
    scoreAlpha: map.score?.alpha ?? 0,
    scoreBravo: map.score?.bravo ?? 0,
    winner:
      map.winnerTeamId === teamAlpha?.id
        ? ('ALPHA' as const)
        : map.winnerTeamId === teamBravo?.id
        ? ('BRAVO' as const)
        : ('TIE' as const),
  }));

  const teamAlphaSummary = summarizeTeam(teamAlpha, 'ALPHA');
  const teamBravoSummary = summarizeTeam(teamBravo, 'BRAVO');
  const allPlayers = [...teamAlphaSummary.players, ...teamBravoSummary.players];
  const mvp =
    allPlayers.length > 0
      ? allPlayers
          .slice()
          .sort((a, b) =>
            b.acs === a.acs ? b.kills - a.kills : b.acs - a.acs,
          )[0]
      : undefined;

  const winner =
    winnerTeamId === teamAlpha?.id
      ? 'ALPHA'
      : winnerTeamId === teamBravo?.id
      ? 'BRAVO'
      : 'TIE';

  return {
    matchId,
    seriesType,
    teamAlpha: teamAlphaSummary,
    teamBravo: teamBravoSummary,
    winner,
    maps: matchMaps,
    mvp,
    completedAt,
  };
};

const getUniqueUserIds = (stats: Array<{ userId: string }>): string[] =>
  Array.from(new Set(stats.map((stat) => stat.userId)));

const broadcastMatchUpdate = (
  matchId: string,
  action: string,
  data?: unknown,
) => {
  emitRealtimeEvent('match:updated', {
    matchId,
    action,
    data,
    timestamp: new Date().toISOString(),
  });
};

const broadcastMatchCreated = (matchId: string, data?: unknown) => {
  emitRealtimeEvent('match:created', {
    matchId,
    action: 'match:created',
    data,
    timestamp: new Date().toISOString(),
  });
};

const broadcastMatchDeleted = (matchId: string, data?: unknown) => {
  emitRealtimeEvent('match:deleted', {
    matchId,
    action: 'match:deleted',
    data,
    timestamp: new Date().toISOString(),
  });
};

async function applyEloAdjustments({
  fastify,
  match,
  aggregatedStats,
  winnerTeamId,
}: {
  fastify: FastifyInstance;
  match: {
    id: string;
    seriesType: SeriesType;
    teams: TeamWithMembers[];
  };
  aggregatedStats: Map<string, AggregatedPlayerStats>;
  winnerTeamId: string;
}) {
  const memberByUserId = new Map<
    string,
    { teamId: string; member: TeamMemberWithUser }
  >();

  for (const team of match.teams) {
    for (const member of team.members) {
      memberByUserId.set(member.userId, { teamId: team.id, member });
    }
  }

  const teamStats = new Map<string, AggregatedPlayerStats[]>();
  for (const stat of aggregatedStats.values()) {
    if (!stat.teamId) continue;
    const existing = teamStats.get(stat.teamId) ?? [];
    existing.push(stat);
    teamStats.set(stat.teamId, existing);
  }

  const acsRankByUser = new Map<string, number>();
  for (const [teamId, statsList] of teamStats.entries()) {
    const sorted = [...statsList].sort(
      (a, b) => (b.acs ?? 0) - (a.acs ?? 0),
    );
    sorted.forEach((stat, index) => {
      acsRankByUser.set(stat.userId, index + 1);
    });
  }

  const teamAverageElo = new Map<string, number>();
  for (const team of match.teams) {
    if (!team.members.length) continue;
    const total = team.members.reduce(
      (sum, member) => sum + (member.user.elo ?? 0),
      0,
    );
    teamAverageElo.set(
      team.id,
      Math.round(total / Math.max(1, team.members.length)),
    );
  }

  const performanceByUser = new Map<string, PerformanceEvaluation>();

  for (const stat of aggregatedStats.values()) {
    const entry = memberByUserId.get(stat.userId);
    if (!entry) continue;

    const playerElo = entry.member.user.elo ?? 0;
    const bandMetrics = await eloService.getBandMetrics(playerElo);
    const isTopTwo = (acsRankByUser.get(stat.userId) ?? 3) <= 2;
    const performance = eloService.evaluatePerformance(
      stat,
      bandMetrics,
      isTopTwo,
    );

    performanceByUser.set(stat.userId, performance);
  }

  const winningTeam = match.teams.find((team) => team.id === winnerTeamId);
  if (winningTeam) {
    let topPerformerId: string | null = null;
    let topScore = -Infinity;
    let bottomPerformerId: string | null = null;
    let bottomScore = Infinity;

    for (const member of winningTeam.members) {
      const performance = performanceByUser.get(member.userId);
      if (!performance) continue;

      if (performance.rawPerformance > topScore) {
        topScore = performance.rawPerformance;
        topPerformerId = member.userId;
      }

      if (performance.rawPerformance < bottomScore) {
        bottomScore = performance.rawPerformance;
        bottomPerformerId = member.userId;
      }
    }

    if (topPerformerId) {
      const performance = performanceByUser.get(topPerformerId);
      if (performance) {
        performance.multiplier = Math.max(performance.multiplier, 1.1);
      }
    }

    if (bottomPerformerId) {
      const performance = performanceByUser.get(bottomPerformerId);
      if (performance) {
        performance.multiplier = Math.min(performance.multiplier, 0.9);
      }
    }
  }

  const eloResults: Array<{
    userId: string;
    oldElo: number;
    newElo: number;
    change: number;
    performanceMultiplier: number;
    teamMultiplier: number;
    rawPerformance: number;
    rating20: number;
  }> = [];
  const affectedUserIds = new Set<string>();

  for (const stat of aggregatedStats.values()) {
    const entry = memberByUserId.get(stat.userId);
    if (!entry) continue;

    const { teamId, member } = entry;
    const performance = performanceByUser.get(stat.userId);
    if (!performance) continue;

    const teamAverage = teamAverageElo.get(teamId) ?? 0;
    const opponentTeam = match.teams.find(
      (team) => team.id !== teamId && team.name !== 'Player Pool',
    );
    const opponentAverage = opponentTeam
      ? teamAverageElo.get(opponentTeam.id) ?? teamAverage
      : teamAverage;
    const teamDiff = teamAverage - opponentAverage;
    const teamMultiplier = eloService.getTeamMultiplier(
      teamDiff,
      winnerTeamId === teamId,
    );

    const result = await eloService.calculateEloChange({
      player: {
        id: member.user.id,
        elo: member.user.elo ?? 0,
        matchesPlayed: member.user.matchesPlayed ?? 0,
        isCalibrating: member.user.isCalibrating ?? true,
        peakElo: member.user.peakElo ?? member.user.elo ?? 0,
      },
      matchId: match.id,
      seriesType: match.seriesType,
      won: winnerTeamId === teamId,
      opponentAverageElo: opponentAverage,
      teamAverageElo: teamAverage,
      teamEloDiff: teamDiff,
      performanceMultiplier: performance.multiplier,
      rawPerformance: performance.rawPerformance,
      teamMultiplier,
    });

    const rating20 = eloService.calculateRating(
      performance.rawPerformance,
      performance.multiplier,
      result.teamMultiplier,
      result.change,
    );

    await prisma.playerMatchStats.upsert({
      where: {
        matchId_userId: {
          matchId: match.id,
          userId: stat.userId,
        },
      },
      create: {
        matchId: match.id,
        userId: stat.userId,
        teamId,
        kills: stat.kills,
        deaths: stat.deaths,
        assists: stat.assists,
        acs: stat.acs,
        adr: stat.adr,
        headshotPercent: stat.headshotPercent ?? 0,
        firstKills: stat.firstKills ?? 0,
        firstDeaths: stat.firstDeaths ?? 0,
        kast: stat.kast ?? 0,
        multiKills: stat.multiKills ?? 0,
        damageDelta: stat.damageDelta ?? 0,
        kd: stat.deaths > 0 ? stat.kills / stat.deaths : stat.kills,
        plusMinus: stat.kills - stat.deaths,
        wpr: performance.rawPerformance,
        rating20,
      },
      update: {
        teamId,
        kills: stat.kills,
        deaths: stat.deaths,
        assists: stat.assists,
        acs: stat.acs,
        adr: stat.adr,
        headshotPercent: stat.headshotPercent ?? 0,
        firstKills: stat.firstKills ?? 0,
        firstDeaths: stat.firstDeaths ?? 0,
        kast: stat.kast ?? 0,
        multiKills: stat.multiKills ?? 0,
        damageDelta: stat.damageDelta ?? 0,
        kd: stat.deaths > 0 ? stat.kills / stat.deaths : stat.kills,
        plusMinus: stat.kills - stat.deaths,
        wpr: performance.rawPerformance,
        rating20,
      },
    });

    eloResults.push({
      userId: member.user.id,
      oldElo: result.oldElo,
      newElo: result.newElo,
      change: result.change,
      performanceMultiplier: result.performanceMultiplier,
      teamMultiplier: result.teamMultiplier,
      rawPerformance: result.rawPerformance,
      rating20,
    });

    affectedUserIds.add(member.user.id);

    if (fastify.discordBot && member.user.discordId) {
      fastify.discordBot
        .updateRankRole({
          discordId: member.user.discordId,
          elo: result.newElo,
          isCalibrating: result.matchesPlayed < 10,
        })
        .catch((err) => {
          fastify.log.error(
            { err, userId: member.user.id },
            'Failed to update Discord rank role',
          );
        });
    }
  }

  const affectedUsers = Array.from(affectedUserIds);

  await recalculateUserTotals(affectedUsers);
  await refreshMatchSnapshot(match.id).catch(() => undefined);
  await invalidateMatchLists().catch(() => undefined);
  await enqueueMatchSnapshotRefresh(match.id).catch(() => undefined);
  await Promise.all(
    affectedUsers.map((userId) => enqueueProfileRefresh(userId).catch(() => undefined)),
  );

  return {
    eloResults,
    affectedUserIds: affectedUsers,
  };
}

export default async function matchRoutes(fastify: FastifyInstance) {
  // Get all matches (paginated)
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      cache?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const page = parseInt(request.query.page || '1');
      const limit = Math.min(parseInt(request.query.limit || '20'), 50);
      const status = request.query.status;
      const cacheOption = request.query.cache;

      const cacheParams = { page, limit, status };
      const shouldBypassCache = cacheOption === 'refresh' || cacheOption === 'skip';

      if (!shouldBypassCache) {
        const cached = await getMatchListFromCache<any>(cacheParams);
        if (cached) {
          return cached;
        }
      }

      const payload = await fetchMatchesForCache(cacheParams);
      if (!shouldBypassCache) {
        await setMatchListCache(cacheParams, payload);
      }

      return payload;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/:id/stats/tracker', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const currentUser = (request as any).user;
    const userId = currentUser?.userId;
    const userRole = currentUser?.role;
    const matchId = request.params.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teams: {
          include: { members: true },
        },
      },
    });

    if (!match) {
      return reply.code(404).send({ error: 'Match not found' });
    }

    const isParticipant = match.teams.some((team) =>
      team.members.some((member) => member.userId === userId),
    );
    const isAdmin = ['ADMIN', 'ROOT'].includes(userRole);
    if (!isParticipant && !isAdmin) {
      return reply
        .code(403)
        .send({ error: 'Only match participants or admins can upload tracker stats' });
    }

    const bucketKeys = ['scoreboard', 'rounds', 'duels', 'economy', 'performance'] as const;
    type TrackerBucketKey = typeof bucketKeys[number];
    const buckets: Record<TrackerBucketKey, string | undefined> = {
      scoreboard: undefined,
      rounds: undefined,
      duels: undefined,
      economy: undefined,
      performance: undefined,
    };
    const unrecognised: Array<{ filename?: string }> = [];

    try {
      const parts = (request as any).parts?.();
      if (!parts || typeof parts[Symbol.asyncIterator] !== 'function') {
        return reply.code(400).send({ error: 'Multipart form data is required' });
      }

      const filenameMatchers = [
        { key: 'scoreboard' as const, pattern: /scoreboard/i },
        { key: 'rounds' as const, pattern: /round/i },
        { key: 'duels' as const, pattern: /duel/i },
        { key: 'economy' as const, pattern: /econ/i },
        { key: 'performance' as const, pattern: /perf/i },
      ];

      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          const content = buffer.toString('utf-8');
          const filename = part.filename || '';

          const matchedByName = filenameMatchers.find(({ pattern }) => pattern.test(filename));
          if (matchedByName) {
            buckets[matchedByName.key] = content;
            continue;
          }

          if (bucketKeys.includes(part.fieldname as TrackerBucketKey)) {
            buckets[part.fieldname as TrackerBucketKey] = content;
            continue;
          }

          unrecognised.push({ filename });
        } else {
          await part.toBuffer().catch(() => undefined);
        }
      }

      if (!buckets.scoreboard) {
        return reply.code(400).send({ error: 'Scoreboard HTML file is required (filename should include "scoreboard")' });
      }

      const parsedScoreboard = parseScoreboardFromHtml(buckets.scoreboard);

      const buildRows = (
        players: typeof parsedScoreboard.teams[number]['players'],
        team: 'alpha' | 'bravo',
      ) =>
        players.map((player, index) => ({
          team,
          position: index + 1,
          playerName: player.playerId,
          rank: player.rank,
          acs: player.acs,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          plusMinus: player.plusMinus,
          kd: player.kd,
          damageDelta: player.damageDelta,
          adr: player.adr,
          hsPercent: player.headshotPercent,
          kastPercent: player.kast,
          firstKills: player.firstKills,
          firstDeaths: player.firstDeaths,
          multiKills: player.multiKills,
        }));

      const teamsForScoreboard = parsedScoreboard.teams.slice(0, 2);
      const scoreboardPayload = {
        alpha: buildRows(teamsForScoreboard[0]?.players ?? [], 'alpha'),
        bravo: buildRows(teamsForScoreboard[1]?.players ?? [], 'bravo'),
        teams: parsedScoreboard.teams.map((team) => ({
          name: team.name,
          players: team.players,
        })),
        mapName: parsedScoreboard.mapName ?? null,
      };

      const serialisedScoreboard = JSON.parse(JSON.stringify(parsedScoreboard)) as Prisma.JsonValue;

      const submissionPayload: Prisma.JsonObject = {
        files: Object.fromEntries(
          bucketKeys
            .map((key) => [key, buckets[key]])
            .filter(([, value]) => value !== undefined),
        ),
        metadata: {
          uploadedAt: new Date().toISOString(),
          providedFiles: bucketKeys.filter((key) => buckets[key]),
          unrecognisedFiles: unrecognised.map((entry) => entry.filename).filter(Boolean),
          detectedMap: parsedScoreboard.mapName ?? null,
        },
        parsedScoreboard: serialisedScoreboard,
      };

      const submission = await prisma.matchStatsSubmission.create({
        data: {
          matchId,
          uploaderId: userId,
          source: MatchStatsSource.TRACKER,
          status: MatchStatsReviewStatus.PENDING_REVIEW,
          payload: submissionPayload,
        },
      });

      await prisma.match.update({
        where: { id: matchId },
        data: { statsStatus: MatchStatsReviewStatus.PENDING_REVIEW },
      });

      await prisma.auditLog.create({
        data: {
          action: 'MATCH_TRACKER_STATS_UPLOADED',
          entity: 'Match',
          entityId: matchId,
          matchId,
          userId,
          details: {
            submissionId: submission.id,
            source: MatchStatsSource.TRACKER,
            providedFiles: bucketKeys.filter((key) => buckets[key]),
            unrecognisedFiles: unrecognised.map((entry) => entry.filename).filter(Boolean),
          },
        },
      });

      return {
        message: 'Tracker HTML bundle submitted for review',
        submissionId: submission.id,
        statsStatus: submission.status,
        receivedFiles: bucketKeys.filter((key) => buckets[key]),
        scoreboard: scoreboardPayload,
        unrecognisedFiles: unrecognised.map((entry) => entry.filename).filter(Boolean),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to process tracker HTML bundle' });
    }
  });

  // Get match by ID
  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const match = await prisma.match.findUnique({
        where: { id },
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
                      isCalibrating: true,
                      totalKills: true,
                      totalDeaths: true,
                      totalAssists: true,
                      totalACS: true,
                      totalADR: true,
                      matchesPlayed: true,
                    },
                  },
                },
              },
              captain: {
                select: {
                  id: true,
                  username: true,
                  discordId: true,
                  avatar: true,
                },
              },
            },
          },
          maps: {
            orderBy: { order: 'asc' },
          },
          winnerTeam: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
          playerStats: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  discordId: true,
                  avatar: true,
                },
              },
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          statsSubmissions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              source: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              notes: true,
              uploader: {
                select: {
                  id: true,
                  username: true,
                  discordId: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Aggregate per-map stats for all users in the match
      const userIds = new Set<string>();
      match.teams.forEach(team => {
        team.members.forEach(member => {
          userIds.add(member.userId);
        });
      });

      // Get aggregated stats from PlayerMatchStats for all users
      const aggregatedStats = await Promise.all(
        Array.from(userIds).map(async (userId) => {
          const stats = await prisma.playerMatchStats.groupBy({
            by: ['userId'],
            where: { userId },
            _avg: {
              headshotPercent: true,
              kast: true,
              damageDelta: true,
            },
            _sum: {
              firstKills: true,
              firstDeaths: true,
              multiKills: true,
            },
            _count: {
              id: true, // Number of matches with stats
            },
          });

          if (stats.length > 0) {
            const stat = stats[0];
            return {
              userId,
              avgHeadshotPercent: stat._avg.headshotPercent || 0,
              avgKAST: stat._avg.kast || 0,
              avgDamageDelta: stat._avg.damageDelta || 0,
              totalFirstKills: stat._sum.firstKills || 0,
              totalFirstDeaths: stat._sum.firstDeaths || 0,
              totalMultiKills: stat._sum.multiKills || 0,
            };
          }
          return {
            userId,
            avgHeadshotPercent: 0,
            avgKAST: 0,
            avgDamageDelta: 0,
            totalFirstKills: 0,
            totalFirstDeaths: 0,
            totalMultiKills: 0,
          };
        })
      );

      // Create a map for quick lookup
      const statsMap = new Map(
        aggregatedStats.map(s => [s.userId, s])
      );

      // Enrich user data with aggregated stats
      match.teams.forEach(team => {
        team.members.forEach(member => {
          const stats = statsMap.get(member.userId);
          if (stats) {
            (member.user as any).avgHeadshotPercent = stats.avgHeadshotPercent;
            (member.user as any).avgKAST = stats.avgKAST;
            (member.user as any).avgDamageDelta = stats.avgDamageDelta;
            (member.user as any).totalFirstKills = stats.totalFirstKills;
            (member.user as any).totalFirstDeaths = stats.totalFirstDeaths;
            (member.user as any).totalMultiKills = stats.totalMultiKills;
          } else {
            (member.user as any).avgHeadshotPercent = 0;
            (member.user as any).avgKAST = 0;
            (member.user as any).avgDamageDelta = 0;
            (member.user as any).totalFirstKills = 0;
            (member.user as any).totalFirstDeaths = 0;
            (member.user as any).totalMultiKills = 0;
          }
        });
      });

      const eloHistory = await prisma.eloHistory.findMany({
        where: { matchId: id },
        select: {
          userId: true,
          oldElo: true,
          newElo: true,
          change: true,
        },
      });

      return {
        ...match,
        eloHistory,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new match
  fastify.post('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Body: {
      seriesType?: 'BO1' | 'BO3' | 'BO5';
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const seriesType = request.body.seriesType || 'BO1';

      const match = await prisma.match.create({
        data: {
          seriesType,
          status: 'DRAFT',
        },
        include: {
          teams: true,
        },
      });

      broadcastMatchCreated(match.id, {
        status: match.status,
        seriesType: match.seriesType,
      });

      await invalidateMatchLists().catch(() => undefined);

      return match;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Join match (add to a team)
  fastify.post('/:id/join', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      teamId?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id: matchId } = request.params;
      const { teamId } = request.body;

      // Get match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if match is joinable
      if (!['DRAFT', 'CAPTAIN_VOTING', 'TEAM_SELECTION'].includes(match.status)) {
        return reply.code(400).send({ error: 'Match is not in a joinable state' });
      }

      // If teamId provided, join that team
      if (teamId) {
        const team = match.teams.find(t => t.id === teamId);
        if (!team) {
          return reply.code(404).send({ error: 'Team not found' });
        }

        // Check if already in team
        const existingMember = team.members.find(m => m.userId === userId);
        if (existingMember) {
          return reply.code(400).send({ error: 'Already in this team' });
        }

        // Check team size (max 5 per team)
        if (team.members.length >= 5) {
          return reply.code(400).send({ error: 'Team is full' });
        }

        // Add to team
        await prisma.teamMember.create({
          data: {
            teamId,
            userId,
          },
        });

        broadcastMatchUpdate(matchId, 'team:joined', {
          userId,
          teamId,
        });

        const userRecord = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            username: true,
            discordId: true,
            avatar: true,
          },
        });

        const identity = userRecord ? buildDiscordIdentity(userRecord) : null;
        if (identity && fastify.discordBot) {
          fastify.discordBot
            .syncLobby({
              matchId,
              players: [identity],
            })
            .catch((err) => fastify.log.error({ err, matchId, userId }, 'Failed to queue lobby sync after join'));
        }

        return { message: 'Joined team successfully' };
      }

      // If no teamId, check if user is already in any team (including Player Pool)
      const userInTeam = match.teams.some(team =>
        team.members.some(member => member.userId === userId)
      );

      if (userInTeam) {
        return reply.code(400).send({ error: 'Already in this match' });
      }

      // Add user to Player Pool (unassigned) instead of directly to a team
      // This allows admins to manually assign teams later
      let playerPool = match.teams.find(t => t.name === 'Player Pool');
      
      if (!playerPool) {
        playerPool = await prisma.team.create({
          data: {
            matchId,
            name: 'Player Pool',
            side: 'ATTACKER', // Doesn't matter for pool
          },
          include: {
            members: true,
          },
        });
      } else {
        // Reload team with members if it exists
        playerPool = await prisma.team.findUnique({
          where: { id: playerPool.id },
          include: {
            members: true,
          },
        });
      }

      if (!playerPool) {
        return reply.code(500).send({ error: 'Failed to create player pool' });
      }

      // Add to Player Pool
      await prisma.teamMember.create({
        data: {
          teamId: playerPool.id,
          userId,
        },
      });

      broadcastMatchUpdate(matchId, 'team:joined', {
        userId,
        teamId: playerPool.id,
      });

      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          discordId: true,
          avatar: true,
        },
      });

      const identity = userRecord ? buildDiscordIdentity(userRecord) : null;
      if (identity && fastify.discordBot) {
        fastify.discordBot
          .syncLobby({
            matchId,
            players: [identity],
          })
          .catch((err) => fastify.log.error({ err, matchId, userId }, 'Failed to queue lobby sync after join'));
      }

      return { message: 'Joined match successfully. You are in the player pool.', teamId: playerPool.id };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Leave match
  fastify.post('/:id/leave', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id: matchId } = request.params;

      // Get match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Find team member
      let teamMember = null;
      for (const team of match.teams) {
        teamMember = team.members.find(m => m.userId === userId);
        if (teamMember) {
          await prisma.teamMember.delete({
            where: { id: teamMember.id },
          });
          broadcastMatchUpdate(matchId, 'team:left', {
            userId,
            teamId: team.id,
          });
          return { message: 'Left match successfully' };
        }
      }

      return reply.code(400).send({ error: 'Not in this match' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Remove player from match (admin/root only)
  fastify.post('/:id/remove-player', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      userId: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const currentUser = (request as any).user;
      const { id: matchId } = request.params;
      const { userId } = request.body;

      // Check if user is admin or root
      if (currentUser.role !== 'ADMIN' && currentUser.role !== 'ROOT') {
        return reply.code(403).send({ error: 'Only admins can remove players' });
      }

      // Get match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Prevent modification of completed or cancelled matches
      if (['COMPLETED', 'CANCELLED'].includes(match.status)) {
        return reply.code(400).send({ error: 'Cannot modify players in a completed or cancelled match' });
      }

      // Find team member and remove captain if needed
      let teamMember = null;
      let teamWithMember = null;
      for (const team of match.teams) {
        teamMember = team.members.find(m => m.userId === userId);
        if (teamMember) {
          teamWithMember = team;
          // Remove captain if this player is captain
          if (team.captainId === userId) {
            await prisma.team.update({
              where: { id: team.id },
              data: { captainId: null },
            });
          }
          await prisma.teamMember.delete({
            where: { id: teamMember.id },
          });
          broadcastMatchUpdate(matchId, 'team:removed', {
            userId,
            teamId: team.id,
            removedBy: currentUser.id,
          });
          return { message: 'Player removed successfully' };
        }
      }

      return reply.code(400).send({ error: 'Player not in this match' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Set team captain (admin/root only)
  fastify.post('/:id/set-captain', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      userId: string;
      teamId: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const currentUser = (request as any).user;
      const { id: matchId } = request.params;
      const { userId, teamId } = request.body;

      // Check if user is admin or root
      if (!['ADMIN', 'ROOT'].includes(currentUser.role)) {
        return reply.code(403).send({ error: 'Only admins can set captains' });
      }

      // Get match and team
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Prevent modification of completed or cancelled matches
      if (['COMPLETED', 'CANCELLED'].includes(match.status)) {
        return reply.code(400).send({ error: 'Cannot modify teams in a completed or cancelled match' });
      }

      const team = match.teams.find(t => t.id === teamId);
      if (!team) {
        return reply.code(404).send({ error: 'Team not found' });
      }

      // Verify player is in the team
      const isMember = team.members.some(m => m.userId === userId);
      if (!isMember) {
        return reply.code(400).send({ error: 'Player is not a member of this team' });
      }

      // Set captain
      await prisma.team.update({
        where: { id: teamId },
        data: { captainId: userId },
      });

      fastify.log.info(`Set captain ${userId} for team ${teamId} in match ${matchId}`);

      broadcastMatchUpdate(matchId, 'team:captain-set', {
        teamId,
        userId,
        setBy: currentUser.id,
      });

      return { message: 'Captain set successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Move player between teams (admin/root only). Omit teamId to move to Player Pool.
  fastify.post('/:id/move-player', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      userId: string;
      teamId?: string | null;
    };
  }>, reply: FastifyReply) => {
    try {
      const currentUser = (request as any).user;
      const { id: matchId } = request.params;
      const { userId, teamId } = request.body;

      if (!userId) {
        return reply.code(400).send({ error: 'userId is required' });
      }

      if (!['ADMIN', 'ROOT'].includes(currentUser.role)) {
        return reply.code(403).send({ error: 'Only admins can move players' });
      }

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      let currentMembership: { id: string; teamId: string } | null = null;
      let currentTeam: (typeof match.teams)[number] | undefined;

      for (const team of match.teams) {
        const member = team.members.find((m) => m.userId === userId);
        if (member) {
          currentMembership = { id: member.id, teamId: team.id };
          currentTeam = team;
          break;
        }
      }

      if (!currentMembership || !currentTeam) {
        return reply.code(404).send({ error: 'Player not part of this match' });
      }

      // Prevent modification of completed or cancelled matches
      if (['COMPLETED', 'CANCELLED'].includes(match.status)) {
        return reply.code(400).send({ error: 'Cannot move players in a completed or cancelled match' });
      }

      let targetTeamId: string;
      if (teamId) {
        const targetTeam = match.teams.find((team) => team.id === teamId);
        if (!targetTeam) {
          return reply.code(404).send({ error: 'Target team not found' });
        }
        targetTeamId = targetTeam.id;
      } else {
        let poolTeam = match.teams.find((team) => team.name === 'Player Pool');
        if (!poolTeam) {
          poolTeam = await prisma.team.create({
            data: {
              matchId,
              name: 'Player Pool',
              side: 'ATTACKER',
            },
            include: {
              members: true,
            },
          });
        }
        targetTeamId = poolTeam.id;
      }

      if (currentMembership.teamId === targetTeamId) {
        return { message: 'Player already assigned to target team', targetTeamId };
      }

      if (currentTeam.captainId === userId) {
        await prisma.team.update({
          where: { id: currentTeam.id },
          data: { captainId: null },
        });
      }

      await prisma.teamMember.update({
        where: { id: currentMembership.id },
        data: { teamId: targetTeamId },
      });

      fastify.log.info(
        { matchId, userId, targetTeamId },
        'Moved player to new team',
      );

      broadcastMatchUpdate(matchId, 'team:moved', {
        userId,
        fromTeamId: currentMembership.teamId,
        toTeamId: targetTeamId,
        movedBy: currentUser.id,
      });

      return { message: 'Player reassigned successfully', targetTeamId };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update match status (admin/root only)
  fastify.patch('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { status?: MatchStatus };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      const { id: matchId } = request.params;
      const { status } = request.body;

      // Only admins can update match status
      if (!['ADMIN', 'ROOT'].includes(userRole)) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      const match = await prisma.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Update status if provided
      if (status) {
        await prisma.match.update({
          where: { id: matchId },
          data: { status },
        });
        broadcastMatchUpdate(matchId, `status:${status}`, {
          status,
          updatedBy: (request as any).user.userId,
        });
      }

      return { message: 'Match updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete match (only creator or admin)
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const userRole = (request as any).user.role;
      const { id: matchId } = request.params;

      // Only admins can delete matches for now
      if (!['ADMIN', 'ROOT'].includes(userRole)) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      // Get match with all stats to reverse
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          playerStats: {
            include: {
              user: true,
            },
          },
          eloChanges: true,
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      const userIds = getUniqueUserIds(match.playerStats);

      // If match was completed, reverse all Elo changes and user stats
      if (match.status === 'COMPLETED' && match.eloChanges.length > 0) {
        fastify.log.info(`Reversing Elo changes for match ${matchId}`);

        // Reverse Elo for each player
        for (const eloChange of match.eloChanges) {
          await prisma.user.update({
            where: { id: eloChange.userId },
            data: {
              elo: eloChange.oldElo, // Revert to old Elo
              matchesPlayed: {
                decrement: 1, // Decrease match count
              },
            },
          });
        }
      }

      // Delete the match (cascade will handle related records)
      await prisma.match.delete({
        where: { id: matchId },
      });

      await recalculateUserTotals(userIds);
      await invalidateMatchLists().catch(() => undefined);
      await invalidateMatchSnapshot(matchId).catch(() => undefined);
      await Promise.all(
        userIds.map((userId) => enqueueProfileRefresh(userId).catch(() => undefined)),
      );

      broadcastMatchDeleted(matchId, { reason: 'manual-delete' });

      return { message: 'Match deleted successfully. Elo and aggregated stats recalculated.' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Start captain voting phase (when 10 players ready)
  fastify.patch('/:id/start-captain-voting', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      const totalPlayers = match.teams.reduce((sum, team) => sum + team.members.length, 0);
      const isAdmin = ['ADMIN', 'ROOT'].includes(userRole);
      
      if (!isAdmin && totalPlayers < 10) {
        return reply.code(400).send({ error: 'Not enough players (need 10)' });
      }

      if (match.status !== 'DRAFT') {
        return reply.code(400).send({ error: 'Match must be in DRAFT status' });
      }

      // Update match status to CAPTAIN_VOTING
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'CAPTAIN_VOTING' },
      });

      broadcastMatchUpdate(matchId, 'status:CAPTAIN_VOTING');

      return { message: 'Captain voting phase started' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Finalize captains (after voting completes)
  fastify.patch('/:id/finalize-captains', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match || match.status !== 'CAPTAIN_VOTING') {
        return reply.code(400).send({ error: 'Match not in captain voting phase' });
      }

      // Get votes
      const votes = await prisma.matchVote.findMany({
        where: { matchId },
      });

      const totalPlayers = match.teams.reduce((sum, team) => sum + team.members.length, 0);
      if (votes.length < totalPlayers) {
        return reply.code(400).send({ error: 'Not all players have voted yet' });
      }

      // Count votes
      const voteCounts: Record<string, number> = {};
      votes.forEach(vote => {
        if (vote.votedForTeamId) {
          voteCounts[vote.votedForTeamId] = (voteCounts[vote.votedForTeamId] || 0) + 1;
        }
      });

      // Sort by votes
      const sorted = Object.entries(voteCounts)
        .sort((a, b) => b[1] - a[1]);

      const captain1Id = sorted[0]?.[0];
      const captain2Id = sorted[1]?.[0];

      if (!captain1Id || !captain2Id) {
        return reply.code(400).send({ error: 'Could not determine captains' });
      }

      // Ensure we have 2 teams
      let team1 = match.teams.find(t => t.name === 'Team Alpha');
      let team2 = match.teams.find(t => t.name === 'Team Bravo');

      if (!team1) {
        team1 = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Alpha',
            side: 'ATTACKER',
            captainId: captain1Id,
          },
        }) as any;
      } else {
        await prisma.team.update({
          where: { id: team1.id },
          data: { captainId: captain1Id },
        });
      }

      if (!team2) {
        team2 = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Bravo',
            side: 'DEFENDER',
            captainId: captain2Id,
          },
        }) as any;
      } else {
        await prisma.team.update({
          where: { id: team2.id },
          data: { captainId: captain2Id },
        });
      }

      // Move to TEAM_SELECTION phase
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'TEAM_SELECTION' },
      });

      broadcastMatchUpdate(matchId, 'status:TEAM_SELECTION');

      return { message: 'Captains finalized', captain1Id, captain2Id };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Finalize team allocation (move to MAP_PICK_BAN)
  fastify.patch('/:id/finalize-teams', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match || match.status !== 'TEAM_SELECTION') {
        return reply.code(400).send({ error: 'Match not in team selection phase' });
      }

      // Verify both teams have 5 players
      const team1 = match.teams.find(t => t.name === 'Team Alpha');
      const team2 = match.teams.find(t => t.name === 'Team Bravo');

      if (!team1 || !team2) {
        return reply.code(400).send({ error: 'Teams not found' });
      }

      if (team1.members.length !== 5 || team2.members.length !== 5) {
        return reply.code(400).send({ error: 'Both teams must have exactly 5 players' });
      }

      // Update match status to MAP_PICK_BAN
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'MAP_PICK_BAN' },
      });

      broadcastMatchUpdate(matchId, 'status:MAP_PICK_BAN');

      if (fastify.discordBot) {
        const [teamAlphaMembers, teamBravoMembers] = await Promise.all([
          prisma.teamMember.findMany({
            where: { teamId: team1.id },
            include: {
              user: {
                select: {
                  username: true,
                  discordId: true,
                  avatar: true,
                },
              },
            },
          }),
          prisma.teamMember.findMany({
            where: { teamId: team2.id },
            include: {
              user: {
                select: {
                  username: true,
                  discordId: true,
                  avatar: true,
                },
              },
            },
          }),
        ]);

        const teamAlphaIdentities = teamAlphaMembers
          .map((member) => buildDiscordIdentity(member.user))
          .filter((identity): identity is DiscordIdentity => Boolean(identity));
        const teamBravoIdentities = teamBravoMembers
          .map((member) => buildDiscordIdentity(member.user))
          .filter((identity): identity is DiscordIdentity => Boolean(identity));

        if (teamAlphaIdentities.length || teamBravoIdentities.length) {
          fastify.discordBot
            .assignTeams({
              matchId,
              teamAlpha: teamAlphaIdentities,
              teamBravo: teamBravoIdentities,
            })
            .catch((err) =>
              fastify.log.error(
                { err, matchId },
                'Failed to assign team voice channels',
              ),
            );
        }
      }

      return { message: 'Teams finalized, moving to map pick/ban' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Pick/Ban a map (captain only)
  fastify.post('/:id/pick-ban', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      mapName: string;
      action: 'PICK' | 'BAN';
      order: number;
      teamId: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id: matchId } = request.params;
      const { mapName, action, order, teamId } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
          maps: true,
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      if (match.status !== 'MAP_PICK_BAN') {
        return reply.code(400).send({ error: 'Match not in pick/ban phase' });
      }

      // Verify user is captain of the team
      const team = match.teams.find(t => t.id === teamId);
      if (!team || team.captainId !== userId) {
        return reply.code(403).send({ error: 'Only the team captain can pick/ban maps' });
      }

      // Verify map is not already picked/banned
      const existingSelection = match.maps.find(m => m.mapName === mapName);
      if (existingSelection) {
        return reply.code(400).send({ error: 'Map already selected' });
      }

      // Create map selection
      await prisma.mapSelection.create({
        data: {
          matchId,
          mapName,
          action,
          order,
          teamId,
          wasPlayed: false,
        },
      });

      broadcastMatchUpdate(matchId, 'map:selection', {
        mapName,
        action,
        order,
        teamId,
      });

      return { message: `Map ${action === 'PICK' ? 'picked' : 'banned'} successfully` };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Start match (captain only, after pick/ban complete)
  fastify.post('/:id/start-match', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
          maps: true,
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      if (match.status !== 'MAP_PICK_BAN') {
        return reply.code(400).send({ error: 'Match not in pick/ban phase' });
      }

      // Verify user is a captain
      const isCaptain = match.teams.some(t => t.captainId === userId);
      if (!isCaptain) {
        return reply.code(403).send({ error: 'Only captains can start the match' });
      }

      // Verify at least one map is picked
      const pickedMaps = match.maps.filter(m => m.action === 'PICK');
      if (pickedMaps.length === 0) {
        return reply.code(400).send({ error: 'At least one map must be picked' });
      }

      // Update match status to IN_PROGRESS
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      broadcastMatchUpdate(matchId, 'status:IN_PROGRESS');

      return { message: 'Match started successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Start team selection phase (deprecated - use start-captain-voting instead)
  fastify.patch('/:id/start-team-selection', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      allocationMethod: 'random' | 'elo' | 'captain';
      captainMethod?: 'voting' | 'elo' | 'random';
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const userRole = (request as any).user.role;
      const { id: matchId } = request.params;
      const { allocationMethod, captainMethod } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if user is admin or all players are in
      const totalPlayers = match.teams.reduce((sum, team) => sum + team.members.length, 0);
      const isAdmin = ['ADMIN', 'ROOT'].includes(userRole);
      
      if (!isAdmin && totalPlayers < 10) {
        return reply.code(400).send({ error: 'Not enough players (need 10)' });
      }

      // Update match status
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'TEAM_SELECTION',
        },
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
                    },
                  },
                },
              },
            },
          },
        },
      });

      broadcastMatchUpdate(matchId, 'status:TEAM_SELECTION');

      // If captain method specified, select captains
      if (allocationMethod === 'captain' && captainMethod) {
        await selectCaptains(matchId, captainMethod, isAdmin, userId, fastify);
      }

      return updatedMatch;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Vote for captain
  fastify.post('/:id/captain-vote', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { candidateId: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id: matchId } = request.params;
      const { candidateId } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match || !['CAPTAIN_VOTING', 'TEAM_SELECTION'].includes(match.status)) {
        return reply.code(400).send({ error: 'Match not in captain voting or team selection phase' });
      }

      // Check if user is in match
      const userInMatch = match.teams.some(team =>
        team.members.some(member => member.userId === userId)
      );

      if (!userInMatch) {
        return reply.code(400).send({ error: 'Not in this match' });
      }

      // Store vote in MatchVote (reusing votedForTeamId for captain candidate ID)
      await prisma.matchVote.upsert({
        where: {
          matchId_userId: {
            matchId,
            userId,
          },
        },
        update: {
          votedForTeamId: candidateId, // Reusing this field for captain candidate
        },
        create: {
          matchId,
          userId,
          votedForTeamId: candidateId,
        },
      });

      // Check if we have enough votes to determine captains
      const totalPlayers = match.teams.reduce((sum, team) => sum + team.members.length, 0);
      const votes = await prisma.matchVote.findMany({
        where: { matchId },
      });

      // If all players have voted, determine captains
      if (votes.length >= totalPlayers) {
        // Count votes
        const voteCounts: Record<string, number> = {};
        votes.forEach(vote => {
          if (vote.votedForTeamId) {
            voteCounts[vote.votedForTeamId] = (voteCounts[vote.votedForTeamId] || 0) + 1;
          }
        });

        // Sort by votes
        const sorted = Object.entries(voteCounts)
          .sort((a, b) => b[1] - a[1]);

        // Check for tie (if top 2 have same votes)
        let captain1Id = sorted[0]?.[0];
        let captain2Id = sorted[1]?.[0];
        const topVotes = sorted[0]?.[1];
        const secondVotes = sorted[1]?.[1];

        // If tie, use coinflip
        if (topVotes === secondVotes && sorted.length >= 2) {
          // For tie, we'll return the tied candidates and let frontend handle coinflip
          return reply.send({
            message: 'Vote recorded',
            needsCoinflip: true,
            candidates: [captain1Id, captain2Id],
            voteCounts,
          });
        }

        // Ensure we have 2 teams
        let team1 = match.teams.find(t => t.name === 'Team Alpha');
        let team2 = match.teams.find(t => t.name === 'Team Bravo');

        if (!team1) {
          team1 = await prisma.team.create({
            data: {
              matchId,
              name: 'Team Alpha',
              side: 'ATTACKER',
              captainId: captain1Id,
            },
          }) as any;
        } else {
          await prisma.team.update({
            where: { id: team1.id },
            data: { captainId: captain1Id },
          });
        }

        if (!team2) {
          team2 = await prisma.team.create({
            data: {
              matchId,
              name: 'Team Bravo',
              side: 'DEFENDER',
              captainId: captain2Id,
            },
          }) as any;
        } else {
          await prisma.team.update({
            where: { id: team2.id },
            data: { captainId: captain2Id },
          });
        }
      }

      return { message: 'Vote recorded', voteCounts: {} };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get captain vote results
  fastify.get('/:id/captain-votes', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { id: matchId } = request.params;

      const votes = await prisma.matchVote.findMany({
        where: { matchId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Count votes
      const voteCounts: Record<string, number> = {};
      votes.forEach(vote => {
        if (vote.votedForTeamId) {
          voteCounts[vote.votedForTeamId] = (voteCounts[vote.votedForTeamId] || 0) + 1;
        }
      });

      return {
        votes: votes.map(v => ({
          userId: v.userId,
          username: v.user?.username,
          candidateId: v.votedForTeamId,
        })),
        voteCounts,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Assign teams (random, elo, or manual)
  fastify.patch('/:id/assign-teams', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      method: 'random' | 'elo' | 'manual';
      assignments?: Array<{ userId: string; teamId: string }>;
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const userRole = (request as any).user.role;
      const { id: matchId } = request.params;
      const { method, assignments } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      elo: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Get all players
      const allPlayers = match.teams.flatMap(team =>
        team.members.map(member => ({
          userId: member.userId,
          elo: member.user.elo,
        }))
      );

      if (allPlayers.length !== 10) {
        return reply.code(400).send({ error: 'Need exactly 10 players' });
      }

      // Ensure we have 2 teams
      let team1 = match.teams.find(t => t.name === 'Team Alpha');
      let team2 = match.teams.find(t => t.name === 'Team Bravo');

      if (!team1 || !team2) {
        // Create teams if needed
        if (!team1) {
          team1 = await prisma.team.create({
            data: {
              matchId,
              name: 'Team Alpha',
              side: 'ATTACKER',
            },
          }) as any;
        }
        if (!team2) {
          team2 = await prisma.team.create({
            data: {
              matchId,
              name: 'Team Bravo',
              side: 'DEFENDER',
            },
          }) as any;
        }
      }

      // Clear existing team members
      await prisma.teamMember.deleteMany({
        where: {
          teamId: { in: [team1.id, team2.id] },
        },
      });

      // Track assigned player IDs
      const assignedPlayerIds = new Set<string>();

      if (method === 'manual' && assignments) {
        // Manual assignment (admin or captain)
        const isAdmin = ['ADMIN', 'ROOT'].includes(userRole);
        if (!isAdmin) {
          // Check if user is captain
          const isCaptain = match.teams.some(team => team.captainId === userId);
          if (!isCaptain) {
            return reply.code(403).send({ error: 'Only captains or admins can manually assign' });
          }
        }

        for (const assignment of assignments) {
          await prisma.teamMember.create({
            data: {
              teamId: assignment.teamId,
              userId: assignment.userId,
            },
          });
          assignedPlayerIds.add(assignment.userId);
        }
      } else if (method === 'elo') {
        // Sort by Elo and split
        const sorted = [...allPlayers].sort((a, b) => b.elo - a.elo);
        // Snake draft: highest Elo to team1, 2nd to team2, 3rd to team1, etc.
        for (let i = 0; i < sorted.length; i++) {
          const teamId = i % 2 === 0 ? team1.id : team2.id;
          await prisma.teamMember.create({
            data: {
              teamId,
              userId: sorted[i].userId,
            },
          });
          assignedPlayerIds.add(sorted[i].userId);
        }
      } else {
        // Random assignment using Random.org
        const shuffled = await randomService.shuffleArray(allPlayers);
        for (let i = 0; i < shuffled.length; i++) {
          const teamId = i % 2 === 0 ? team1.id : team2.id;
          await prisma.teamMember.create({
            data: {
              teamId,
              userId: shuffled[i].userId,
            },
          });
          assignedPlayerIds.add(shuffled[i].userId);
        }
      }

      // Remove any players from teams that weren't assigned (cleanup any leftover members)
      const allTeamIds = [team1.id, team2.id];
      const unassignedMembers = await prisma.teamMember.findMany({
        where: {
          teamId: { in: allTeamIds },
          userId: { notIn: Array.from(assignedPlayerIds) },
        },
      });

      if (unassignedMembers.length > 0) {
        await prisma.teamMember.deleteMany({
          where: {
            id: { in: unassignedMembers.map(m => m.id) },
          },
        });
      }

      // Don't update status yet - let frontend show preview and finalize
      // Status stays as TEAM_SELECTION until user clicks "Finalize Teams"

      return { message: 'Teams assigned successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Captain picks a player
  fastify.post('/:id/captain-pick', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { playerId: string; teamId: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id: matchId } = request.params;
      const { playerId, teamId } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if user is captain of this team
      const team = match.teams.find(t => t.id === teamId);
      if (!team || team.captainId !== userId) {
        return reply.code(403).send({ error: 'Only team captain can pick players' });
      }

      // Check if player is already in a team
      const playerInTeam = match.teams.some(t =>
        t.members.some(m => m.userId === playerId)
      );

      if (playerInTeam) {
        return reply.code(400).send({ error: 'Player already in a team' });
      }

      // Check team size
      if (team.members.length >= 5) {
        return reply.code(400).send({ error: 'Team is full' });
      }

      // Add player to team
      await prisma.teamMember.create({
        data: {
          teamId,
          userId: playerId,
        },
      });

      return { message: 'Player picked successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Perform coinflip
  fastify.post('/:id/coinflip', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { purpose: string }; // e.g., 'captain_selection', 'map_side'
  }>, reply: FastifyReply) => {
    try {
      const { id: matchId } = request.params;
      const { purpose } = request.body;

      // Random coinflip using Random.org (0 or 1)
      const result = await randomService.coinFlip();
      const winner = result === 0 ? 'heads' : 'tails';

      // Log coinflip result (could store in match details or audit log)
      await prisma.auditLog.create({
        data: {
          action: 'ADMIN_OVERRIDE',
          entity: 'Match',
          entityId: matchId,
          details: {
            coinflip: {
              purpose,
              result: winner,
            },
          },
          matchId,
        },
      });

      return { result: winner, value: result };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add random players to match for testing (ROOT/ADMIN only)
  fastify.post('/:id/add-random-players', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      // Only ADMIN/ROOT can add random players
      if (!['ADMIN', 'ROOT'].includes(userRole)) {
        return reply.code(403).send({ error: 'Only admins can add random players' });
      }

      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if match is joinable
      if (!['DRAFT', 'CAPTAIN_VOTING', 'TEAM_SELECTION'].includes(match.status)) {
        return reply.code(400).send({ error: 'Match is not in a joinable state' });
      }

      // Get all real users (exclude test users with fake Discord IDs)
      const allUsers = await prisma.user.findMany({
        where: {
          isBanned: false,
          discordId: {
            not: {
            startsWith: '10000000000000000',
          },
        },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1000, // Get up to 1000 users
      });

      if (allUsers.length === 0) {
        return reply.code(404).send({ error: 'No users found in database' });
      }

      // Ensure both teams exist
      let teamAlpha = match.teams.find(t => t.name === 'Team Alpha');
      let teamBravo = match.teams.find(t => t.name === 'Team Bravo');

      if (!teamAlpha) {
        teamAlpha = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Alpha',
            side: 'ATTACKER',
          },
          include: {
            members: true,
          },
        });
      } else {
        teamAlpha = await prisma.team.findUnique({
          where: { id: teamAlpha.id },
          include: {
            members: true,
          },
        });
      }

      if (!teamBravo) {
        teamBravo = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Bravo',
            side: 'DEFENDER',
          },
          include: {
            members: true,
          },
        });
      } else {
        teamBravo = await prisma.team.findUnique({
          where: { id: teamBravo.id },
          include: {
            members: true,
          },
        });
      }

      if (!teamAlpha || !teamBravo) {
        return reply.code(500).send({ error: 'Failed to create teams' });
      }

      // Get all current members
      const currentMembers = match.teams.flatMap(team =>
        team.members.map(member => member.userId)
      );

      // Calculate how many users we can add (max 10 total)
      const maxPlayers = 10
      const currentPlayerCount = currentMembers.length
      const playersNeeded = maxPlayers - currentPlayerCount

      if (playersNeeded <= 0) {
        return reply.code(400).send({ error: 'Match is already full (10/10 players)' });
      }

      // Filter out users already in match
      const usersToAdd = allUsers.filter(user => !currentMembers.includes(user.id));

      if (usersToAdd.length === 0) {
        return reply.code(400).send({ error: 'All available users are already in the match' });
      }

      // Shuffle and select random users
      const shuffled = await randomService.shuffleArray(usersToAdd);
      const usersToActuallyAdd = shuffled.slice(0, playersNeeded);

      // Add users to teams (alternating between Alpha and Bravo)
      // HARD LIMIT: Max 5 players per team
      const addedUsers: Array<{ userId: string; username: string; teamId: string }> = [];
      
      for (let i = 0; i < usersToActuallyAdd.length; i++) {
        const user = usersToActuallyAdd[i];
        
        // Reload teams to get current member count
        const currentTeamAlpha = await prisma.team.findUnique({
          where: { id: teamAlpha!.id },
          include: { members: true },
        });
        const currentTeamBravo = await prisma.team.findUnique({
          where: { id: teamBravo!.id },
          include: { members: true },
        });

        if (!currentTeamAlpha || !currentTeamBravo) {
          break;
        }

        // Check which team has space (strict 5 limit)
        const alphaHasSpace = currentTeamAlpha.members.length < 5;
        const bravoHasSpace = currentTeamBravo.members.length < 5;

        // If both teams are full, stop
        if (!alphaHasSpace && !bravoHasSpace) {
          break;
        }

        // Determine target team (alternate, but respect limits)
        let targetTeam = null;
        if (i % 2 === 0) {
          // Prefer Alpha, but use Bravo if Alpha is full
          targetTeam = alphaHasSpace ? currentTeamAlpha : (bravoHasSpace ? currentTeamBravo : null);
        } else {
          // Prefer Bravo, but use Alpha if Bravo is full
          targetTeam = bravoHasSpace ? currentTeamBravo : (alphaHasSpace ? currentTeamAlpha : null);
        }

        if (!targetTeam || targetTeam.members.length >= 5) {
          // Skip if no team available or team is full
          break;
        }

        await prisma.teamMember.create({
          data: {
            teamId: targetTeam.id,
            userId: user.id,
          },
        });
        addedUsers.push({ userId: user.id, username: user.username, teamId: targetTeam.id });
      }

      if (fastify.discordBot) {
        const identities = usersToActuallyAdd
          .map((user) =>
            buildDiscordIdentity({
              discordId: user.discordId,
              username: user.username,
              avatar: user.avatar,
            }),
          )
          .filter((identity): identity is DiscordIdentity => Boolean(identity));

        if (identities.length) {
          fastify.discordBot
            .syncLobby({
              matchId,
              players: identities,
            })
            .catch((err) =>
              fastify.log.error(
                { err, matchId },
                'Failed to sync lobby after adding random players',
              ),
            );
        }
      }

      fastify.log.info(`Added ${addedUsers.length} random players to match ${matchId}`);

      if (addedUsers.length > 0) {
        broadcastMatchUpdate(matchId, 'team:random-added', {
          addedUsers,
        });
      }

      return {
        message: `Added ${addedUsers.length} random players to match (${currentMembers.length + addedUsers.length}/10 total)`,
        addedUsers,
        totalPlayers: currentMembers.length + addedUsers.length,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Manually add user to match by user ID - ROOT/ADMIN only
  fastify.post('/:id/add-user-manual', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      userId: string; // Changed from discordId to userId
    };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      // Only ADMIN/ROOT can manually add users
      if (!['ADMIN', 'ROOT'].includes(userRole)) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      const { id: matchId } = request.params;
      const { userId } = request.body;

      if (!userId) {
        return reply.code(400).send({ error: 'userId is required' });
      }

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if match is joinable
      if (!['DRAFT', 'CAPTAIN_VOTING', 'TEAM_SELECTION'].includes(match.status)) {
        return reply.code(400).send({ error: 'Match is not in a joinable state' });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Check if user is already in the match
      const existingMember = match.teams.some(team =>
        team.members.some(member => member.userId === user.id)
      );

      if (existingMember) {
        return reply.code(400).send({ error: 'User is already in this match' });
      }

      // Create a "pool" team for unassigned players if it doesn't exist
      let poolTeam = match.teams.find(t => t.name === 'Player Pool');
      
      if (!poolTeam) {
        poolTeam = await prisma.team.create({
          data: {
            matchId,
            name: 'Player Pool',
            side: 'ATTACKER', // Doesn't matter for pool
          },
        }) as any;
      }

      // Add user to player pool (not assigned to Alpha/Bravo yet)
      await prisma.teamMember.create({
        data: {
          teamId: poolTeam.id,
          userId: user.id,
        },
      });

      fastify.log.info(`Manually added user ${user.username} to player pool in match ${matchId}`);

      broadcastMatchUpdate(matchId, 'team:manual-add', {
        userId: user.id,
        teamId: poolTeam.id,
      });

      if (fastify.discordBot) {
        const identity = buildDiscordIdentity({
          discordId: user.discordId,
          username: user.username,
          avatar: user.avatar,
        });

        if (identity) {
          fastify.discordBot
            .syncLobby({
              matchId,
              players: [identity],
            })
            .catch((err) =>
              fastify.log.error(
                { err, matchId, userId: user.id },
                'Failed to sync lobby after manual user add',
              ),
            );
        }
      }

      return {
        message: `Added ${user.username} to player pool`,
        user: {
          id: user.id,
          username: user.username,
          discordId: user.discordId,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ROOT Override: Manually assign teams - ROOT only
  fastify.post('/:id/root-assign-teams', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      teamAlpha: Array<{ userId: string }>;
      teamBravo: Array<{ userId: string }>;
      alphaCaptainId?: string;
      bravoCaptainId?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      if (userRole !== 'ROOT') {
        return reply.code(403).send({ error: 'Only ROOT can use admin override' });
      }

      const { id: matchId } = request.params;
      const { teamAlpha, teamBravo, alphaCaptainId, bravoCaptainId } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Ensure teams exist
      let alphaTeam = match.teams.find(t => t.name === 'Team Alpha');
      let bravoTeam = match.teams.find(t => t.name === 'Team Bravo');
      let playerPool = match.teams.find(t => t.name === 'Player Pool');

      if (!alphaTeam) {
        alphaTeam = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Alpha',
            side: 'ATTACKER',
          },
        }) as any;
      }

      if (!bravoTeam) {
        bravoTeam = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Bravo',
            side: 'DEFENDER',
          },
        }) as any;
      }

      if (!playerPool) {
        playerPool = await prisma.team.create({
          data: {
            matchId,
            name: 'Player Pool',
            side: 'ATTACKER',
          },
        }) as any;
      }

      // Clear ONLY Team Alpha and Team Bravo assignments (keep Player Pool intact)
      await prisma.teamMember.deleteMany({
        where: { teamId: alphaTeam.id },
      });
      await prisma.teamMember.deleteMany({
        where: { teamId: bravoTeam.id },
      });

      // Get all users currently in the match
      const allMatchUserIds = match.teams.flatMap(t => t.members.map(m => m.userId));
      const assignedUserIds = [...teamAlpha.map(m => m.userId), ...teamBravo.map(m => m.userId)];
      const unassignedUserIds = allMatchUserIds.filter(id => !assignedUserIds.includes(id));

      // Assign Team Alpha (and remove from Player Pool)
      for (const member of teamAlpha) {
        // Remove from Player Pool if they're there
        await prisma.teamMember.deleteMany({
          where: {
            teamId: playerPool.id,
            userId: member.userId,
          },
        });
        // Add to Team Alpha
        await prisma.teamMember.create({
          data: {
            teamId: alphaTeam.id,
            userId: member.userId,
          },
        });
      }

      // Assign Team Bravo (and remove from Player Pool)
      for (const member of teamBravo) {
        // Remove from Player Pool if they're there
        await prisma.teamMember.deleteMany({
          where: {
            teamId: playerPool.id,
            userId: member.userId,
          },
        });
        // Add to Team Bravo
        await prisma.teamMember.create({
          data: {
            teamId: bravoTeam.id,
            userId: member.userId,
          },
        });
      }

      // Move unassigned players back to Player Pool
      for (const userId of unassignedUserIds) {
        // Remove from Player Pool first (in case they're already there)
        await prisma.teamMember.deleteMany({
          where: {
            teamId: playerPool.id,
            userId: userId,
          },
        });
        // Add to Player Pool
        await prisma.teamMember.create({
          data: {
            teamId: playerPool.id,
            userId: userId,
          },
        });
      }

      // Set captains
      if (alphaCaptainId) {
        await prisma.team.update({
          where: { id: alphaTeam.id },
          data: { captainId: alphaCaptainId },
        });
      }

      if (bravoCaptainId) {
        await prisma.team.update({
          where: { id: bravoTeam.id },
          data: { captainId: bravoCaptainId },
        });
      }

      fastify.log.info(`ROOT override: Teams assigned for match ${matchId}`);

      return {
        message: 'Teams assigned successfully',
        teamAlpha: teamAlpha.length,
        teamBravo: teamBravo.length,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ROOT Override: Set match status - ROOT only
  fastify.post('/:id/root-set-status', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      status: 'DRAFT' | 'CAPTAIN_VOTING' | 'TEAM_SELECTION' | 'MAP_PICK_BAN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      if (userRole !== 'ROOT') {
        return reply.code(403).send({ error: 'Only ROOT can use admin override' });
      }

      const { id: matchId } = request.params;
      const { status } = request.body;

      await prisma.match.update({
        where: { id: matchId },
        data: { status },
      });

      fastify.log.info(`ROOT override: Match ${matchId} status set to ${status}`);

      broadcastMatchUpdate(matchId, `status:${status}`, { status, source: 'root-override' });

      return {
        message: `Match status set to ${status}`,
        status,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ROOT Override: Set map selections - ROOT only
  fastify.post('/:id/root-set-maps', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      maps: Array<{
        mapName: string;
        action: 'PICK' | 'BAN';
        teamId?: string;
        wasPlayed?: boolean;
      }>;
    };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      if (userRole !== 'ROOT') {
        return reply.code(403).send({ error: 'Only ROOT can use admin override' });
      }

      const { id: matchId } = request.params;
      const { maps } = request.body;

      // Validate maps
      if (!maps || !Array.isArray(maps)) {
        return reply.code(400).send({ error: 'Maps must be an array' });
      }

      // Filter out invalid maps
      const validMaps = maps.filter(m => m.mapName && m.action);
      
      if (validMaps.length === 0) {
        return reply.code(400).send({ error: 'No valid maps provided' });
      }

      // Delete existing map selections
      await prisma.mapSelection.deleteMany({
        where: { matchId },
      });

      // Create new map selections
      for (const map of validMaps) {
        await prisma.mapSelection.create({
          data: {
            matchId,
            mapName: map.mapName,
            action: map.action,
            teamId: map.teamId || null,
            wasPlayed: map.wasPlayed || false,
            order: validMaps.indexOf(map),
          },
        });
      }

      fastify.log.info(`ROOT override: Maps set for match ${matchId}`);

      broadcastMatchUpdate(matchId, 'maps:updated', {
        source: 'root-override',
        count: validMaps.length,
      });

      return {
        message: 'Maps set successfully',
        mapsCount: maps.length,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Reset teams (clear all team members) - ROOT/ADMIN only
  fastify.post('/:id/reset-teams', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      // Only ADMIN/ROOT can reset teams
      if (!['ADMIN', 'ROOT'].includes(userRole)) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if match is in a state that allows reset
      if (!['DRAFT', 'CAPTAIN_VOTING', 'TEAM_SELECTION'].includes(match.status)) {
        return reply.code(400).send({ error: 'Can only reset teams in DRAFT, CAPTAIN_VOTING, or TEAM_SELECTION status' });
      }

      // Clear all team members
      const teamIds = match.teams.map(team => team.id);
      await prisma.teamMember.deleteMany({
        where: {
          teamId: { in: teamIds },
        },
      });

      // Reset captains
      await prisma.team.updateMany({
        where: {
          matchId,
        },
        data: {
          captainId: null,
        },
      });

      // Reset match status to DRAFT if it was in TEAM_SELECTION
      if (match.status === 'TEAM_SELECTION') {
        await prisma.match.update({
          where: { id: matchId },
          data: { status: 'DRAFT' },
        });
      }

      return { message: 'Teams reset successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Upload scoreboard image for OCR stats extraction
  fastify.post('/:id/stats/ocr', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const currentUser = (request as any).user;
    const userId = currentUser?.userId;
    const userRole = currentUser?.role;
    const matchId = request.params.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const file = await (request as any).file();
    if (!file) {
      return reply.code(400).send({ error: 'Scoreboard HTML file is required' });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teams: {
          include: { members: true },
        },
      },
    });

    if (!match) {
      return reply.code(404).send({ error: 'Match not found' });
    }

    const isParticipant = match.teams.some(team =>
      team.members.some(member => member.userId === userId)
    );
    const isAdmin = ['ADMIN', 'ROOT'].includes(userRole);
    if (!isParticipant && !isAdmin) {
      return reply.code(403).send({ error: 'Only match participants or admins can upload stats' });
    }

    try {
      const buffer = await file.toBuffer();
      const html = buffer.toString('utf-8');
      const parsed = parseScoreboardFromHtml(html);

      if (!parsed.rawPlayerCount) {
        return reply.code(400).send({ error: 'No scoreboard data detected in the uploaded file.' });
      }

      const submissionPayload = parsed as unknown as Prisma.JsonValue;

      const submission = await prisma.matchStatsSubmission.create({
        data: {
          matchId,
          uploaderId: userId,
          source: MatchStatsSource.OCR,
          status: MatchStatsReviewStatus.PENDING_REVIEW,
          payload: submissionPayload,
        },
      });

      await prisma.match.update({
        where: { id: matchId },
        data: { statsStatus: MatchStatsReviewStatus.PENDING_REVIEW },
      });

      await prisma.auditLog.create({
        data: {
          action: 'MATCH_STATS_SUBMITTED',
          entity: 'Match',
          entityId: matchId,
          matchId,
          userId,
          details: {
            submissionId: submission.id,
            source: MatchStatsSource.OCR,
            status: submission.status,
            rawPlayerCount: parsed.rawPlayerCount,
          },
        },
      });

      const alphaTeam = parsed.teams.find((team) => /team\\s*a/i.test(team.name)) || parsed.teams[0];
      const bravoTeam = parsed.teams.find((team) => /team\\s*b/i.test(team.name)) || parsed.teams[1] || {
        name: 'Team B',
        players: [],
      };

      const scoreboard = {
        alpha: (alphaTeam?.players || []).map((player, index) => ({
          team: 'alpha',
          position: index + 1,
          playerName: player.playerId,
          rank: player.rank,
          acs: player.acs,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          plusMinus: player.plusMinus,
          kd: player.kd,
          damageDelta: player.damageDelta,
          adr: player.adr,
          hsPercent: player.headshotPercent,
          kastPercent: player.kast,
          firstKills: player.firstKills,
          firstDeaths: player.firstDeaths,
          multiKills: player.multiKills,
        })),
        bravo: (bravoTeam?.players || []).map((player, index) => ({
          team: 'bravo',
          position: index + 1,
          playerName: player.playerId,
          rank: player.rank,
          acs: player.acs,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          plusMinus: player.plusMinus,
          kd: player.kd,
          damageDelta: player.damageDelta,
          adr: player.adr,
          hsPercent: player.headshotPercent,
          kastPercent: player.kast,
          firstKills: player.firstKills,
          firstDeaths: player.firstDeaths,
          multiKills: player.multiKills,
        })),
        teams: parsed.teams,
        mapName: parsed.mapName ?? null,
      };

      return {
        message: 'Scoreboard HTML submitted for review',
        submissionId: submission.id,
        statsStatus: submission.status,
        scoreboard,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to process scoreboard HTML file' });
    }
  });

  // Submit match stats and calculate Elo (Admin only)
  fastify.post('/:id/stats', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      maps: Array<{
        mapName: string;
        winnerTeamId: string;
        score: { alpha: number; bravo: number };
        playerStats: Array<{
          userId: string;
          teamId: string;
          kills: number;
          deaths: number;
          assists: number;
          acs: number;
          adr: number;
          headshotPercent: number;
          firstKills: number;
          firstDeaths: number;
          kast: number;
          multiKills: number;
          damageDelta?: number;
        }>;
      }>;
      winnerTeamId: string;
      adminOverride?: boolean;
      source?: MatchStatsSource;
      autoFinalize?: boolean;
      notes?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      const matchId = request.params.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || (user.role !== 'ROOT' && user.role !== 'ADMIN')) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const {
        maps,
        winnerTeamId,
        adminOverride,
        source,
        autoFinalize,
        notes,
      } = request.body;
      const statsSource = source ?? MatchStatsSource.MANUAL;
      const shouldAutoFinalize = autoFinalize !== false;

      // Get match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: {
                include: { user: true },
              },
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Validate all required players have stats
      const teamAlpha = match.teams.find(t => t.name === 'Team Alpha');
      const teamBravo = match.teams.find(t => t.name === 'Team Bravo');

      if (!teamAlpha || !teamBravo) {
        return reply.code(400).send({ error: 'Teams not found' });
      }

      const allPlayerIds = new Set([
        ...teamAlpha.members.map(m => m.userId),
        ...teamBravo.members.map(m => m.userId),
      ]);

      // Collect stats from all maps
      const aggregatedStats = new Map<string, AggregatedPlayerStats>();

      // Process each map's stats
      for (const mapData of maps) {
        // Update map selection with winner
        await prisma.mapSelection.updateMany({
          where: {
            matchId,
            mapName: mapData.mapName,
          },
          data: {
            wasPlayed: true,
            winnerTeamId: mapData.winnerTeamId,
          },
        });

        // Aggregate stats for each player
        for (const stat of mapData.playerStats) {
          const existing = aggregatedStats.get(stat.userId);
          if (existing) {
            // Aggregate stats across maps
            existing.kills += stat.kills;
            existing.deaths += stat.deaths;
            existing.assists += stat.assists;
            existing.acs = Math.round((existing.acs + stat.acs) / 2); // Average ACS
            existing.adr = Math.round((existing.adr + stat.adr) / 2); // Average ADR
            existing.headshotPercent = (existing.headshotPercent + stat.headshotPercent) / 2;
            existing.firstKills += stat.firstKills;
            existing.firstDeaths += stat.firstDeaths;
            existing.kast = (existing.kast + stat.kast) / 2;
            existing.multiKills += stat.multiKills;
            existing.damageDelta = (existing.damageDelta || 0) + (stat.damageDelta || 0);
          } else {
            aggregatedStats.set(stat.userId, {
              userId: stat.userId,
              teamId: stat.teamId,
              kills: stat.kills,
              deaths: stat.deaths,
              assists: stat.assists,
              acs: stat.acs,
              adr: stat.adr,
              headshotPercent: stat.headshotPercent,
              firstKills: stat.firstKills,
              firstDeaths: stat.firstDeaths,
              kast: stat.kast,
              multiKills: stat.multiKills,
              damageDelta: stat.damageDelta || 0,
            });
          }
        }
      }

      // Validate all players have stats
      for (const playerId of allPlayerIds) {
        if (!aggregatedStats.has(playerId)) {
          return reply.code(400).send({ error: `Missing stats for player ${playerId}` });
        }
      }

      const aggregatedStatsArray = Array.from(aggregatedStats.values());
      const submissionPayload: Prisma.JsonObject = {
        maps: maps as unknown as Prisma.JsonValue,
        winnerTeamId,
        aggregatedStats: aggregatedStatsArray as unknown as Prisma.JsonValue,
      };
      const submission = await prisma.matchStatsSubmission.create({
        data: {
          matchId,
          uploaderId: userId,
          source: statsSource,
          status: shouldAutoFinalize
            ? MatchStatsReviewStatus.CONFIRMED
            : MatchStatsReviewStatus.PENDING_REVIEW,
          payload: submissionPayload,
          notes: notes || null,
        },
      });

      if (!shouldAutoFinalize) {
        await prisma.match.update({
          where: { id: matchId },
          data: {
            statsStatus: MatchStatsReviewStatus.PENDING_REVIEW,
          },
        });

        await prisma.auditLog.create({
          data: {
            action: 'MATCH_STATS_SUBMITTED',
            entity: 'Match',
            entityId: matchId,
            matchId,
            userId,
            details: {
              submissionId: submission.id,
              source: statsSource,
              status: submission.status,
            },
          },
        });

        return {
          message: 'Match stats submitted for review',
          statsPending: true,
          submissionId: submission.id,
        };
      }

      // Update team scores
      const mapsWon = {
        alpha: maps.filter(m => {
          const team = m.winnerTeamId === teamAlpha.id ? teamAlpha : teamBravo;
          return team.name === 'Team Alpha';
        }).length,
        bravo: maps.filter(m => {
          const team = m.winnerTeamId === teamBravo.id ? teamBravo : teamAlpha;
          return team.name === 'Team Bravo';
        }).length,
      };

      const roundsWon = maps.reduce(
        (acc, map) => ({
          alpha: acc.alpha + (map.score?.alpha ?? 0),
          bravo: acc.bravo + (map.score?.bravo ?? 0),
        }),
        { alpha: 0, bravo: 0 },
      );

      await prisma.team.update({
        where: { id: teamAlpha.id },
        data: { mapsWon: mapsWon.alpha, roundsWon: roundsWon.alpha },
      });

      await prisma.team.update({
        where: { id: teamBravo.id },
        data: { mapsWon: mapsWon.bravo, roundsWon: roundsWon.bravo },
      });

      const { eloResults } = await applyEloAdjustments({
        fastify,
        match: {
          id: match.id,
          seriesType: match.seriesType,
          teams: match.teams as TeamWithMembers[],
        },
        aggregatedStats,
        winnerTeamId,
      });

      // Update match status
      const completedAt = new Date();
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          winnerTeamId,
          completedAt,
          statsStatus: MatchStatsReviewStatus.CONFIRMED,
        },
      });

      broadcastMatchUpdate(matchId, 'status:COMPLETED', {
        winnerTeamId,
        completedAt,
      });

      if (fastify.discordBot) {
        const payload = createMatchResultPayload({
          matchId,
          seriesType: match.seriesType,
          teams: match.teams as TeamWithMembers[],
          winnerTeamId,
          maps,
          stats: aggregatedStats,
          eloResults,
          completedAt,
        });

        fastify.discordBot
          .finalizeMatch(payload)
          .catch((err) =>
            fastify.log.error(
              { err, matchId },
              'Failed to synchronize match completion with Discord',
            ),
          );
      }

      // Log audit
      await prisma.auditLog.create({
        data: {
          action: 'MATCH_STATS_SUBMITTED',
          entity: 'Match',
          entityId: matchId,
          userId,
          matchId,
          details: {
            mapsCount: maps.length,
            winnerTeamId,
            adminOverride: adminOverride || false,
            submissionId: submission.id,
            source: statsSource,
            autoFinalize: shouldAutoFinalize,
          },
        },
      });

      return {
        message: 'Match stats submitted and Elo calculated',
        eloResults,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });

  // Direct match import - bypass all phases and import completed match (admin/root only)
  fastify.post('/:id/import-completed', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      teams: Array<{
        name: string;
        playerIds: string[];
        captainId?: string;
      }>;
      maps: Array<{
        mapName: string;
        winnerTeamName: string;
        score: { alpha: number; bravo: number };
        playerStats: Array<{
          userId: string;
          teamName: string;
          kills: number;
          deaths: number;
          assists: number;
          acs: number;
          adr: number;
          headshotPercent: number;
          firstKills: number;
          firstDeaths: number;
          kast: number;
          multiKills: number;
          damageDelta?: number;
        }>;
      }>;
      winnerTeamName: string;
      seriesType?: SeriesType;
    };
  }>, reply: FastifyReply) => {
    try {
      const currentUser = (request as any).user;
      const { id: matchId } = request.params;
      const { teams, maps, winnerTeamName, seriesType } = request.body;

      // Only ADMIN/ROOT can import matches
      if (!['ADMIN', 'ROOT'].includes(currentUser.role)) {
        return reply.code(403).send({ error: 'Only admins can import completed matches' });
      }

      // Get or create match
      let match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        // Create match if it doesn't exist
        match = await prisma.match.create({
          data: {
            id: matchId,
            seriesType: seriesType || 'BO1',
            status: 'COMPLETED',
            statsStatus: MatchStatsReviewStatus.CONFIRMED,
            startedAt: new Date(),
            completedAt: new Date(),
          },
          include: {
            teams: {
              include: {
                members: true,
              },
            },
          },
        }) as any;

        await invalidateMatchLists().catch(() => undefined);
      }

      // Clear existing teams
      await prisma.teamMember.deleteMany({
        where: {
          teamId: { in: match.teams.map(t => t.id) },
        },
      });
      await prisma.team.deleteMany({
        where: { matchId },
      });

      // Create teams and add players
      const createdTeams: Array<{ id: string; name: string }> = [];
      for (const teamData of teams) {
        const normalizedName = teamData.name.toLowerCase();
        const isAlpha = normalizedName.includes('alpha');
        const isBravo = normalizedName.includes('bravo');
        const roundsKey: 'alpha' | 'bravo' | null = isAlpha ? 'alpha' : isBravo ? 'bravo' : null;
        const totalRounds = roundsKey
          ? maps.reduce((sum, mapData) => sum + (mapData.score?.[roundsKey] ?? 0), 0)
          : 0;

        const team = await prisma.team.create({
          data: {
            matchId,
            name: teamData.name,
            side: teamData.name === 'Team Alpha' ? 'ATTACKER' : 'DEFENDER',
            captainId: teamData.captainId || null,
            mapsWon: maps.filter(m => m.winnerTeamName === teamData.name).length,
            roundsWon: totalRounds,
          },
        });
        createdTeams.push({ id: team.id, name: team.name });

        // Add players to team
        for (const playerId of teamData.playerIds) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              userId: playerId,
            },
          });
        }
      }

      // Find winner team
      const winnerTeam = createdTeams.find(t => t.name === winnerTeamName);
      if (!winnerTeam) {
        return reply.code(400).send({ error: 'Winner team not found' });
      }

      // Process maps and stats (reuse logic from stats submission)
      const teamAlpha = createdTeams.find(t => t.name === 'Team Alpha');
      const teamBravo = createdTeams.find(t => t.name === 'Team Bravo');
      if (!teamAlpha || !teamBravo) {
        return reply.code(400).send({ error: 'Both Team Alpha and Team Bravo must be provided' });
      }

      // Create map selections
      for (const mapData of maps) {
        await prisma.mapSelection.create({
          data: {
            matchId,
            mapName: mapData.mapName,
            action: 'PICK',
            order: maps.indexOf(mapData),
            wasPlayed: true,
            winnerTeamId: createdTeams.find(t => t.name === mapData.winnerTeamName)?.id,
          },
        });
      }

      // Aggregate stats
      const aggregatedStats = new Map<string, AggregatedPlayerStats>();
      for (const mapData of maps) {
        for (const stat of mapData.playerStats) {
          const teamId = createdTeams.find(t => t.name === stat.teamName)?.id;
          if (!teamId) continue;

          const existing = aggregatedStats.get(stat.userId);
          if (existing) {
            existing.kills += stat.kills;
            existing.deaths += stat.deaths;
            existing.assists += stat.assists;
            existing.acs = Math.round((existing.acs + stat.acs) / 2);
            existing.adr = Math.round((existing.adr + stat.adr) / 2);
            existing.headshotPercent = (existing.headshotPercent + stat.headshotPercent) / 2;
            existing.firstKills += stat.firstKills;
            existing.firstDeaths += stat.firstDeaths;
            existing.kast = (existing.kast + stat.kast) / 2;
            existing.multiKills += stat.multiKills;
            existing.damageDelta = (existing.damageDelta || 0) + (stat.damageDelta || 0);
          } else {
            aggregatedStats.set(stat.userId, {
              userId: stat.userId,
              teamId,
              kills: stat.kills,
              deaths: stat.deaths,
              assists: stat.assists,
              acs: stat.acs,
              adr: stat.adr,
              headshotPercent: stat.headshotPercent,
              firstKills: stat.firstKills,
              firstDeaths: stat.firstDeaths,
              kast: stat.kast,
              multiKills: stat.multiKills,
              damageDelta: stat.damageDelta || 0,
            });
          }
        }
      }

      const matchWithUsers = await prisma.match.findUnique({
        where: { id: matchId },
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
        },
      });

      if (!matchWithUsers) {
        return reply.code(404).send({ error: 'Match not found after import' });
      }

      const { eloResults } = await applyEloAdjustments({
        fastify,
        match: {
          id: matchWithUsers.id,
          seriesType: matchWithUsers.seriesType,
          teams: matchWithUsers.teams as TeamWithMembers[],
        },
        aggregatedStats,
        winnerTeamId: winnerTeam.id,
      });

      // Update match
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          winnerTeamId: winnerTeam.id,
          completedAt: new Date(),
          statsStatus: MatchStatsReviewStatus.CONFIRMED,
        },
      });

      broadcastMatchUpdate(matchId, 'status:COMPLETED', {
        winnerTeamId: winnerTeam.id,
        source: 'import',
      });

      fastify.log.info(`Imported completed match ${matchId} with ${maps.length} maps`);

      return {
        message: 'Match imported successfully',
        eloResults,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });

  // Submit stats for a single map (any player in match)
  fastify.post('/:id/stats/map', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      mapName: string;
      winnerTeamId: string;
      score: { alpha: number; bravo: number };
      playerStats: Array<{
        userId: string;
        teamId: string;
        kills: number;
        deaths: number;
        assists: number;
        acs: number;
        adr: number;
        headshotPercent: number;
        firstKills: number;
        firstDeaths: number;
        kast: number;
        multiKills: number;
        damageDelta?: number;
      }>;
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id;
      const matchId = request.params.id;
      const { mapName, winnerTeamId, score, playerStats } = request.body;

      // Get match with all necessary relations
      const match = await prisma.match.findUnique({
        where: { id: matchId },
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
          maps: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Verify user is in the match
      const userInMatch = match.teams.some(t => 
        t.members.some(m => m.userId === userId)
      );

      if (!userInMatch) {
        return reply.code(403).send({ error: 'You must be in the match to submit stats' });
      }

      if (match.status !== 'IN_PROGRESS') {
        return reply.code(400).send({ error: 'Match must be in progress to submit stats' });
      }

      // Find the map selection
      const mapSelection = match.maps.find(m => m.mapName === mapName && m.action === 'PICK');
      if (!mapSelection) {
        return reply.code(400).send({ error: 'Map not found in match' });
      }

      if (mapSelection.wasPlayed) {
        return reply.code(400).send({ error: 'Stats for this map have already been submitted' });
      }

      // Validate all players have stats
      const teamAlpha = match.teams.find(t => t.name === 'Team Alpha');
      const teamBravo = match.teams.find(t => t.name === 'Team Bravo');

      if (!teamAlpha || !teamBravo) {
        return reply.code(400).send({ error: 'Teams not found' });
      }

      const allPlayerIds = new Set([
        ...teamAlpha.members.map(m => m.userId),
        ...teamBravo.members.map(m => m.userId),
      ]);

      const submittedPlayerIds = new Set(playerStats.map(s => s.userId));
      for (const playerId of allPlayerIds) {
        if (!submittedPlayerIds.has(playerId)) {
          return reply.code(400).send({ error: `Missing stats for player ${playerId}` });
        }
      }

      // Update map selection with winner and mark as played
      await prisma.mapSelection.update({
        where: { id: mapSelection.id },
        data: {
          wasPlayed: true,
          winnerTeamId,
        },
      });

      broadcastMatchUpdate(matchId, 'map:completed', {
        mapSelectionId: mapSelection.id,
        mapName,
        score,
        winnerTeamId,
      });

      // Update team scores
      const winnerTeam = match.teams.find(t => t.id === winnerTeamId);
      if (winnerTeam) {
        await prisma.team.update({
          where: { id: winnerTeam.id },
          data: { mapsWon: { increment: 1 } },
        });
      }

      if (teamAlpha) {
        await prisma.team.update({
          where: { id: teamAlpha.id },
          data: {
            roundsWon: {
              increment: score.alpha,
            },
          },
        });
      }

      if (teamBravo) {
        await prisma.team.update({
          where: { id: teamBravo.id },
          data: {
            roundsWon: {
              increment: score.bravo,
            },
          },
        });
      }

      // Save player stats for this map (we'll aggregate later when match completes)
      for (const stat of playerStats) {
        // Calculate derived stats
        const kd = stat.deaths > 0 ? stat.kills / stat.deaths : stat.kills;
        const plusMinus = stat.kills - stat.deaths;

        // Check if stats already exist for this player in this match
        const existingStats = await prisma.playerMatchStats.findUnique({
          where: {
            matchId_userId: {
              matchId,
              userId: stat.userId,
            },
          },
        });

        if (existingStats) {
          // Aggregate with existing stats
          await prisma.playerMatchStats.update({
            where: { id: existingStats.id },
            data: {
              kills: { increment: stat.kills },
              deaths: { increment: stat.deaths },
              assists: { increment: stat.assists },
              acs: Math.round((existingStats.acs + stat.acs) / 2), // Average
              adr: Math.round((existingStats.adr + stat.adr) / 2), // Average
              headshotPercent: (existingStats.headshotPercent + stat.headshotPercent) / 2,
              firstKills: { increment: stat.firstKills },
              firstDeaths: { increment: stat.firstDeaths },
              kast: (existingStats.kast + stat.kast) / 2,
              multiKills: { increment: stat.multiKills },
              damageDelta: (existingStats.damageDelta || 0) + (stat.damageDelta || 0),
              kd: (existingStats.kd + kd) / 2,
              plusMinus: { increment: plusMinus },
            },
          });
        } else {
          // Create new stats entry
          await prisma.playerMatchStats.create({
            data: {
              matchId,
              userId: stat.userId,
              teamId: stat.teamId,
              kills: stat.kills,
              deaths: stat.deaths,
              assists: stat.assists,
              acs: stat.acs,
              adr: stat.adr,
              headshotPercent: stat.headshotPercent,
              firstKills: stat.firstKills,
              firstDeaths: stat.firstDeaths,
              kast: stat.kast,
              multiKills: stat.multiKills,
              damageDelta: stat.damageDelta || 0,
              kd,
              plusMinus,
            },
          });
        }
      }

      // Check if more maps are needed (after marking current map as played)
      // We need to reload match data to get accurate count, but for now we'll calculate it
      const pickedMaps = match.maps.filter(m => m.action === 'PICK');
      const playedMapsBeforeUpdate = match.maps.filter(m => m.action === 'PICK' && m.wasPlayed);
      const totalMapsForSeries = match.seriesType === 'BO5' ? 5 : match.seriesType === 'BO3' ? 3 : 1;
      const winsRequired = Math.floor(totalMapsForSeries / 2) + 1;
      
      // After we update, this map will be played, so total played = playedMapsBeforeUpdate.length + 1
      const totalPlayedAfterUpdate = playedMapsBeforeUpdate.length + 1;

      // Determine if match should continue or complete
      let nextStatus: 'MAP_PICK_BAN' | 'COMPLETED' = 'COMPLETED';
      let message = 'Map stats submitted successfully';

      const updatedMatch = await prisma.match.findUnique({
        where: { id: matchId },
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
        },
      });

      if (!updatedMatch) {
        return reply.code(404).send({ error: 'Match not found after update' });
      }

      const updatedTeamAlpha = updatedMatch.teams.find(
        (t) => t.name === 'Team Alpha',
      );
      const updatedTeamBravo = updatedMatch.teams.find(
        (t) => t.name === 'Team Bravo',
      );

      if (!updatedTeamAlpha || !updatedTeamBravo) {
        return reply.code(400).send({ error: 'Teams not found' });
      }

      const finalMapsWon = {
        alpha: updatedTeamAlpha.mapsWon || 0,
        bravo: updatedTeamBravo.mapsWon || 0,
      };

      const finalRoundsWon = {
        alpha: updatedTeamAlpha.roundsWon || 0,
        bravo: updatedTeamBravo.roundsWon || 0,
      };

      const alphaHasSeries = finalMapsWon.alpha >= winsRequired;
      const bravoHasSeries = finalMapsWon.bravo >= winsRequired;
      const allMapsPlayed = totalPlayedAfterUpdate >= totalMapsForSeries;
      const hasWinner = finalMapsWon.alpha !== finalMapsWon.bravo;

      const overallWinnerTeamId =
        alphaHasSeries || (hasWinner && finalMapsWon.alpha > finalMapsWon.bravo)
          ? updatedTeamAlpha.id
          : bravoHasSeries || (hasWinner && finalMapsWon.bravo > finalMapsWon.alpha)
          ? updatedTeamBravo.id
          : winnerTeamId;

      const matchShouldComplete =
        alphaHasSeries ||
        bravoHasSeries ||
        allMapsPlayed;

      if (matchShouldComplete) {
        const statsRecords = await prisma.playerMatchStats.findMany({
          where: { matchId },
          select: {
            userId: true,
            teamId: true,
            kills: true,
            deaths: true,
            assists: true,
            acs: true,
            adr: true,
            headshotPercent: true,
            firstKills: true,
            firstDeaths: true,
            kast: true,
            multiKills: true,
            damageDelta: true,
          },
        });

        const aggregatedFinalStats = new Map<string, AggregatedPlayerStats>();
        for (const record of statsRecords) {
          aggregatedFinalStats.set(record.userId, {
            userId: record.userId,
            teamId: record.teamId ?? undefined,
            kills: record.kills,
            deaths: record.deaths,
            assists: record.assists,
            acs: record.acs,
            adr: record.adr,
            headshotPercent: record.headshotPercent ?? 0,
            firstKills: record.firstKills ?? 0,
            firstDeaths: record.firstDeaths ?? 0,
            kast: record.kast ?? 0,
            multiKills: record.multiKills ?? 0,
            damageDelta: record.damageDelta ?? 0,
          });
        }

        const { eloResults } = await applyEloAdjustments({
          fastify,
          match: {
            id: updatedMatch.id,
            seriesType: updatedMatch.seriesType,
            teams: updatedMatch.teams as TeamWithMembers[],
          },
          aggregatedStats: aggregatedFinalStats,
          winnerTeamId: overallWinnerTeamId,
        });

        await prisma.match.update({
          where: { id: matchId },
          data: {
            status: 'COMPLETED',
            winnerTeamId: overallWinnerTeamId,
            completedAt: new Date(),
            statsStatus: MatchStatsReviewStatus.CONFIRMED,
          },
        });

        broadcastMatchUpdate(matchId, 'status:COMPLETED', {
          winnerTeamId: overallWinnerTeamId,
          mapsWon: finalMapsWon,
          roundsWon: finalRoundsWon,
        });

        return {
          message: 'Match completed! Elo calculated.',
          eloResults,
          matchCompleted: true,
          finalScore: {
            maps: finalMapsWon,
            rounds: finalRoundsWon,
          },
        };
      }

      if (!matchShouldComplete && totalPlayedAfterUpdate < totalMapsForSeries) {
        nextStatus = 'MAP_PICK_BAN';
        message = 'Map stats submitted. Moving to next map pick/ban phase.';
      }

      // Update match status if more maps needed
      if (nextStatus === 'MAP_PICK_BAN') {
        await prisma.match.update({
          where: { id: matchId },
          data: { status: 'MAP_PICK_BAN' },
        });
        broadcastMatchUpdate(matchId, 'status:MAP_PICK_BAN', {
          nextMapOrder: totalPlayedAfterUpdate,
        });
      }

      return {
        message,
        matchCompleted: false,
        mapsPlayed: totalPlayedAfterUpdate,
        mapsNeeded: totalMapsForSeries,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });
}

// Helper function to select captains
async function selectCaptains(
  matchId: string,
  method: 'voting' | 'elo' | 'random',
  isAdmin: boolean,
  adminUserId: string,
  fastify: FastifyInstance
) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teams: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  elo: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!match) return;

  const allPlayers = match.teams.flatMap(team =>
    team.members.map(member => member.user)
  );

  if (allPlayers.length < 2) return;

  let captain1: { id: string; username: string; elo: number } | null = null;
  let captain2: { id: string; username: string; elo: number } | null = null;

  if (method === 'elo') {
    // Select 2 highest Elo players
    const sorted = [...allPlayers].sort((a, b) => b.elo - a.elo);
    captain1 = sorted[0];
    captain2 = sorted[1];
  } else if (method === 'random') {
    // Random selection using Random.org
    const shuffled = await randomService.shuffleArray(allPlayers);
    captain1 = shuffled[0];
    captain2 = shuffled[1];
  } else {
    // Voting - will be handled by frontend voting system
    // For now, just return - captains will be set after voting
    return;
  }

  // Ensure teams exist
  let team1 = match.teams.find(t => t.name === 'Team Alpha');
  let team2 = match.teams.find(t => t.name === 'Team Bravo');

  if (!team1) {
    team1 = await prisma.team.create({
      data: {
        matchId,
        name: 'Team Alpha',
        side: 'ATTACKER',
        captainId: captain1.id,
      },
    }) as any;
  } else {
    await prisma.team.update({
      where: { id: team1.id },
      data: { captainId: captain1.id },
    });
  }

  if (!team2) {
    team2 = await prisma.team.create({
      data: {
        matchId,
        name: 'Team Bravo',
        side: 'DEFENDER',
        captainId: captain2.id,
      },
    }) as any;
  } else {
    await prisma.team.update({
      where: { id: team2.id },
      data: { captainId: captain2.id },
    });
  }
}

