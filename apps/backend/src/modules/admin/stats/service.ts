import type { Prisma } from "@trayb/db";
import type { GameId } from "@trayb/types";
import {
  adminMatchAnalyticsQuerySchema,
  adminMatchAnalyticsResponseSchema,
  adminEloDistributionQuerySchema,
  adminEloDistributionResponseSchema,
  adminStatsOverviewResponseSchema,
  type AdminMatchAnalyticsQuery,
} from "./schema.js";
import {
  adminStatsRepository,
  type AdminStatsRepository,
  type MatchAnalyticsRow,
} from "./repository.js";

const DEFAULT_WINDOW_DAYS = 14;
const DAY_IN_MS = 86_400_000;

export interface AdminStatsServiceDeps {
  repository?: AdminStatsRepository;
}

const DEFAULT_DEPS: Required<AdminStatsServiceDeps> = {
  repository: adminStatsRepository,
};

export function createAdminStatsService(
  deps: AdminStatsServiceDeps = DEFAULT_DEPS
) {
  const repository = deps.repository ?? DEFAULT_DEPS.repository;

  async function getMatchAnalytics(rawQuery: unknown) {
    const query = adminMatchAnalyticsQuerySchema.parse(rawQuery);
    const range = resolveDateRange(query);
    const where = buildMatchWhere(query, range);
    const rows = await repository.findMatches(where);
    return adminMatchAnalyticsResponseSchema.parse(
      buildMatchAnalytics(rows, range)
    );
  }

  async function getEloDistribution(rawQuery: unknown) {
    const query = adminEloDistributionQuerySchema.parse(rawQuery);
    let userIdFilter: string[] | undefined;
    if (query.hubId) {
      const players = await repository.findMatchPlayers({
        match: { hubId: query.hubId },
      });
      if (players.length === 0) {
        return adminEloDistributionResponseSchema.parse(
          buildEloDistribution([])
        );
      }
      userIdFilter = players.map((player) => player.userId);
    }

    const snapshots = await repository.findEloSnapshots({
      game: query.game as GameId,
      ...(userIdFilter ? { userId: { in: userIdFilter } } : {}),
    });

    return adminEloDistributionResponseSchema.parse(
      buildEloDistribution(snapshots.map((snapshot) => snapshot.rating))
    );
  }

  async function getOverview(rawQuery: unknown) {
    const query = adminMatchAnalyticsQuerySchema.parse(rawQuery);
    const _range = resolveDateRange(query);
    const [
      totalPlayers,
      activePlayers,
      bannedPlayers,
      newThisWeek,
      matchStats,
    ] = await Promise.all([
      repository.countUsers(),
      repository.countUsers({ status: "active" }),
      repository.countPlayerBans({ status: "active" }),
      repository.countUsers({
        createdAt: { gte: new Date(Date.now() - 7 * DAY_IN_MS) },
      }),
      getMatchAnalytics(query),
    ]);

    return adminStatsOverviewResponseSchema.parse({
      timeframe: matchStats.timeframe,
      players: {
        total: totalPlayers,
        active: activePlayers,
        banned: bannedPlayers,
        newThisWeek,
      },
      matches: matchStats.totals,
      outcomes: matchStats.outcomes,
    });
  }

  return {
    getMatchAnalytics,
    getEloDistribution,
    getOverview,
  };
}

function resolveDateRange(query: AdminMatchAnalyticsQuery): DateRange {
  const to = parseDate(query.to) ?? new Date();
  const from =
    parseDate(query.from) ??
    new Date(to.getTime() - DEFAULT_WINDOW_DAYS * DAY_IN_MS);
  if (from > to) {
    const recalculatedFrom = new Date(
      to.getTime() - DEFAULT_WINDOW_DAYS * DAY_IN_MS
    );
    return {
      from: recalculatedFrom,
      to,
      days: Math.max(
        1,
        Math.ceil((to.getTime() - recalculatedFrom.getTime()) / DAY_IN_MS)
      ),
    };
  }
  return {
    from,
    to,
    days: Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / DAY_IN_MS) || 1
    ),
  };
}

function buildMatchWhere(
  query: AdminMatchAnalyticsQuery,
  range: DateRange
): Prisma.MatchWhereInput {
  return {
    game: query.game as GameId,
    status: "completed",
    ...(query.hubId ? { hubId: query.hubId } : {}),
    ...(range.from ? { startedAt: { gte: range.from } } : {}),
    ...(range.to ? { startedAt: { lte: range.to } } : {}),
  };
}

function parseDate(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

interface DateRange {
  from: Date;
  to: Date;
  days: number;
}

function buildMatchAnalytics(rows: MatchAnalyticsRow[], range: DateRange) {
  const totals = {
    matches: rows.length,
    avgDurationMinutes: 0,
    avgRounds: 0,
  };
  let durationSum = 0;
  let durationSamples = 0;
  let roundSum = 0;

  const outcomes = {
    alpha: 0,
    bravo: 0,
    draw: 0,
  };

  const mapStats = new Map<
    string,
    { matches: number; rounds: number; alphaWins: number; bravoWins: number }
  >();
  const trend = new Map<
    string,
    { matches: number; ratingDeltaTotal: number; ratingDeltaSamples: number }
  >();
  const performers = new Map<
    string,
    {
      playerId: string;
      username: string;
      kills: number;
      acsTotal: number;
      acsSamples: number;
      deltaTotal: number;
      deltaSamples: number;
    }
  >();

  for (const match of rows) {
    if (typeof match.durationSeconds === "number") {
      durationSum += match.durationSeconds;
      durationSamples += 1;
    }
    roundSum += match.roundsPlayed ?? 0;
    if (match.winner && outcomes[match.winner] !== undefined) {
      outcomes[match.winner] += 1;
    }

    const mapEntry = mapStats.get(match.map) ?? {
      matches: 0,
      rounds: 0,
      alphaWins: 0,
      bravoWins: 0,
    };
    mapEntry.matches += 1;
    mapEntry.rounds += match.roundsPlayed ?? 0;
    if (match.winner === "alpha") {
      mapEntry.alphaWins += 1;
    } else if (match.winner === "bravo") {
      mapEntry.bravoWins += 1;
    }
    mapStats.set(match.map, mapEntry);

    const trendDateSource =
      match.startedAt ?? match.endedAt ?? match.createdAt ?? new Date();
    const trendKey = trendDateSource.toISOString().slice(0, 10);
    let ratingDeltaTotal = 0;
    let ratingDeltaSamples = 0;
    for (const player of match.players) {
      if (typeof player.ratingDelta === "number") {
        ratingDeltaTotal += player.ratingDelta;
        ratingDeltaSamples += 1;
      }
      const existing = performers.get(player.userId) ?? {
        playerId: player.userId,
        username: player.user?.username ?? "Unknown",
        kills: 0,
        acsTotal: 0,
        acsSamples: 0,
        deltaTotal: 0,
        deltaSamples: 0,
      };
      existing.kills += player.kills ?? 0;
      if (typeof player.acs === "number") {
        existing.acsTotal += player.acs;
        existing.acsSamples += 1;
      }
      if (typeof player.ratingDelta === "number") {
        existing.deltaTotal += player.ratingDelta;
        existing.deltaSamples += 1;
      }
      performers.set(player.userId, existing);
    }

    const trendEntry = trend.get(trendKey) ?? {
      matches: 0,
      ratingDeltaTotal: 0,
      ratingDeltaSamples: 0,
    };
    trendEntry.matches += 1;
    trendEntry.ratingDeltaTotal += ratingDeltaTotal;
    trendEntry.ratingDeltaSamples += ratingDeltaSamples;
    trend.set(trendKey, trendEntry);
  }

  totals.avgDurationMinutes =
    durationSamples > 0
      ? formatNumber(durationSum / durationSamples / 60, 1)
      : 0;
  totals.avgRounds =
    rows.length > 0 ? formatNumber(roundSum / rows.length, 1) : 0;

  const maps = Array.from(mapStats.entries())
    .map(([map, detail]) => ({
      map,
      matches: detail.matches,
      alphaWinRate:
        detail.matches > 0
          ? formatNumber((detail.alphaWins / detail.matches) * 100, 1)
          : 0,
      bravoWinRate:
        detail.matches > 0
          ? formatNumber((detail.bravoWins / detail.matches) * 100, 1)
          : 0,
      avgRounds:
        detail.matches > 0
          ? formatNumber(detail.rounds / detail.matches, 1)
          : 0,
    }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 10);

  const recentTrend = Array.from(trend.entries())
    .map(([date, detail]) => ({
      date,
      matches: detail.matches,
      avgRatingDelta:
        detail.ratingDeltaSamples > 0
          ? formatNumber(detail.ratingDeltaTotal / detail.ratingDeltaSamples, 1)
          : 0,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const topPerformers = Array.from(performers.values())
    .map((record) => ({
      playerId: record.playerId,
      username: record.username,
      kills: record.kills,
      acs:
        record.acsSamples > 0
          ? formatNumber(record.acsTotal / record.acsSamples, 1)
          : null,
      ratingDelta:
        record.deltaSamples > 0
          ? formatNumber(record.deltaTotal / record.deltaSamples, 1)
          : null,
    }))
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5);

  return {
    timeframe: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      days: range.days,
    },
    totals,
    outcomes,
    maps,
    recentTrend,
    topPerformers,
  };
}

function formatNumber(value: number, precision = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(precision)) : 0;
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentileValue / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function buildEloDistribution(ratings: number[]) {
  if (ratings.length === 0) {
    return {
      summary: {
        totalPlayers: 0,
        average: null,
        median: null,
        percentile95: null,
        min: null,
        max: null,
      },
      buckets: [],
    };
  }

  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const average =
    ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
  const median = percentile(ratings, 50);
  const percentile95 = percentile(ratings, 95);

  const bucketsMap = new Map<string, number>();
  for (const rating of ratings) {
    const bucketFloor = Math.floor(rating / 100) * 100;
    const bucketLabel = `${bucketFloor}-${bucketFloor + 99}`;
    bucketsMap.set(bucketLabel, (bucketsMap.get(bucketLabel) ?? 0) + 1);
  }

  const bucketEntries = Array.from(bucketsMap.entries()).sort((a, b) =>
    a[0] < b[0] ? -1 : 1
  );

  return {
    summary: {
      totalPlayers: ratings.length,
      average: formatNumber(average, 1),
      median: median !== null ? formatNumber(median, 1) : null,
      percentile95:
        percentile95 !== null ? formatNumber(percentile95, 1) : null,
      min,
      max,
    },
    buckets: bucketEntries.map(([label, count]) => ({ label, count })),
  };
}
