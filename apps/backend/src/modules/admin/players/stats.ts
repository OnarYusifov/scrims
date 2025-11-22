import { prisma, type Prisma } from "@trayb/db";
import { games, matchTeams, type GameId, type MatchTeam } from "@trayb/types";

const DAY_IN_MS = 86_400_000;
export const PLAYER_STATS_LOOKBACK_DAYS = 30;
const RECENT_MATCH_LIMIT = 20;
const RATING_HISTORY_LIMIT = 15;

const matchPlayerStatsSelect = {
  id: true,
  matchId: true,
  userId: true,
  team: true,
  ratingBefore: true,
  ratingAfter: true,
  ratingDelta: true,
  kills: true,
  deaths: true,
  assists: true,
  acs: true,
  hsPercentage: true,
  createdAt: true,
  match: {
    select: {
      id: true,
      map: true,
      game: true,
      winner: true,
      startedAt: true,
      endedAt: true,
      status: true,
    },
  },
} satisfies Prisma.MatchPlayerSelect;

type MatchPlayerStatsRow = Prisma.MatchPlayerGetPayload<{
  select: typeof matchPlayerStatsSelect;
}>;

type RatingHistoryRow = Prisma.PlayerEloHistoryGetPayload<{
  select: {
    id: true;
    game: true;
    rating: true;
    ratingDelta: true;
    recordedAt: true;
    sourceMatchId: true;
  };
}>;

export type PlayerGameSummary = {
  matches: number;
  wins: number;
  winRate: number | null;
  averageAcs: number | null;
  averageKd: number | null;
  averageHsPercent: number | null;
  averageRatingDelta: number | null;
  latestRating: number | null;
};

export type PlayerRecentMatch = {
  matchId: string;
  startedAt: string;
  game: GameId;
  map: string;
  result: "win" | "loss" | "draw";
  team: MatchTeam;
  ratingDelta: number | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number | null;
};

export type PlayerRatingHistoryPoint = {
  id: string;
  date: string;
  game: GameId;
  rating: number;
  delta: number;
  matchId: string | null;
};

export interface PlayerStatsSnapshot {
  gameStats: Partial<Record<GameId, PlayerGameSummary>>;
  recentMatches: PlayerRecentMatch[];
  ratingHistory: PlayerRatingHistoryPoint[];
  lookbackDays: number;
}

const EMPTY_SNAPSHOT: PlayerStatsSnapshot = {
  gameStats: {},
  recentMatches: [],
  ratingHistory: [],
  lookbackDays: PLAYER_STATS_LOOKBACK_DAYS,
};

export async function getPlayerStatsSnapshot(
  userId: string
): Promise<PlayerStatsSnapshot> {
  const since = new Date(Date.now() - PLAYER_STATS_LOOKBACK_DAYS * DAY_IN_MS);

  const [matches, ratingHistory] = await Promise.all([
    prisma.matchPlayer.findMany({
      where: {
        userId,
        match: {
          status: "completed",
          startedAt: { gte: since },
        },
      },
      select: matchPlayerStatsSelect,
      orderBy: { createdAt: "desc" },
      take: RECENT_MATCH_LIMIT,
    }),
    prisma.playerEloHistory.findMany({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      take: RATING_HISTORY_LIMIT,
      select: {
        id: true,
        game: true,
        rating: true,
        ratingDelta: true,
        recordedAt: true,
        sourceMatchId: true,
      },
    }),
  ]);

  if (matches.length === 0 && ratingHistory.length === 0) {
    return { ...EMPTY_SNAPSHOT };
  }

  return buildSnapshot(matches, ratingHistory);
}

type MutableGameAccumulator = {
  matches: number;
  wins: number;
  acsSum: number;
  acsCount: number;
  kdKills: number;
  kdDeaths: number;
  hsSum: number;
  hsCount: number;
  ratingDeltaSum: number;
  ratingDeltaCount: number;
  latestRating: number | null;
};

function buildSnapshot(
  matches: MatchPlayerStatsRow[],
  ratingHistory: RatingHistoryRow[]
): PlayerStatsSnapshot {
  const gameAccumulators = new Map<GameId, MutableGameAccumulator>();

  const getAccumulator = (game: GameId) => {
    if (!gameAccumulators.has(game)) {
      gameAccumulators.set(game, {
        matches: 0,
        wins: 0,
        acsSum: 0,
        acsCount: 0,
        kdKills: 0,
        kdDeaths: 0,
        hsSum: 0,
        hsCount: 0,
        ratingDeltaSum: 0,
        ratingDeltaCount: 0,
        latestRating: null,
      });
    }
    return gameAccumulators.get(game)!;
  };

  const recentMatches: PlayerRecentMatch[] = matches.map((row) => {
    const match = row.match;
    const game = (match?.game as GameId | undefined) ?? games[0];
    const summary = getAccumulator(game);
    summary.matches += 1;
    const kills = row.kills ?? 0;
    const deaths = row.deaths ?? 0;
    const assists = row.assists ?? 0;
    const acs = row.acs ?? null;
    const hs = row.hsPercentage ?? null;
    const ratingDelta = row.ratingDelta ?? null;
    if (acs !== null) {
      summary.acsSum += acs;
      summary.acsCount += 1;
    }
    if (ratingDelta !== null) {
      summary.ratingDeltaSum += ratingDelta;
      summary.ratingDeltaCount += 1;
    }
    if (hs !== null) {
      summary.hsSum += hs;
      summary.hsCount += 1;
    }
    summary.kdKills += kills;
    summary.kdDeaths += deaths;
    const matchWinner = match?.winner ?? null;
    const result: PlayerRecentMatch["result"] =
      matchWinner === null ? "draw" : matchWinner === row.team ? "win" : "loss";
    if (result === "win") {
      summary.wins += 1;
    }

    return {
      matchId: row.matchId,
      startedAt: (match?.startedAt ?? row.createdAt).toISOString(),
      game,
      map: match?.map ?? "Unknown",
      result,
      team: (row.team as MatchTeam | undefined) ?? matchTeams[0],
      ratingDelta,
      kills,
      deaths,
      assists,
      acs,
    };
  });

  const processedRatingHistory: PlayerRatingHistoryPoint[] = ratingHistory
    .map((entry) => ({
      id: entry.id,
      date: entry.recordedAt.toISOString(),
      game: entry.game,
      rating: entry.rating,
      delta: entry.ratingDelta,
      matchId: entry.sourceMatchId ?? null,
    }))
    .reverse(); // chronological order

  // Update latest rating per game from rating history (newest entry)
  const latestByGame = new Map<GameId, number>();
  for (const entry of ratingHistory) {
    if (!latestByGame.has(entry.game)) {
      latestByGame.set(entry.game, entry.rating);
    }
  }

  latestByGame.forEach((rating, game) => {
    const acc = getAccumulator(game);
    acc.latestRating = rating;
  });

  const gameStats: PlayerStatsSnapshot["gameStats"] = {};
  gameAccumulators.forEach((acc, game) => {
    const winRate =
      acc.matches > 0
        ? Number(((acc.wins / acc.matches) * 100).toFixed(1))
        : null;
    const averageAcs =
      acc.acsCount > 0 ? Number((acc.acsSum / acc.acsCount).toFixed(2)) : null;
    const averageHsPercent =
      acc.hsCount > 0 ? Number((acc.hsSum / acc.hsCount).toFixed(2)) : null;
    const averageRatingDelta =
      acc.ratingDeltaCount > 0
        ? Number((acc.ratingDeltaSum / acc.ratingDeltaCount).toFixed(2))
        : null;
    const averageKd =
      acc.kdKills === 0 && acc.kdDeaths === 0
        ? null
        : acc.kdDeaths > 0
          ? Number((acc.kdKills / acc.kdDeaths).toFixed(2))
          : Number(acc.kdKills.toFixed(2));

    gameStats[game] = {
      matches: acc.matches,
      wins: acc.wins,
      winRate,
      averageAcs,
      averageKd,
      averageHsPercent,
      averageRatingDelta,
      latestRating: acc.latestRating,
    };
  });

  return {
    gameStats,
    recentMatches,
    ratingHistory: processedRatingHistory,
    lookbackDays: PLAYER_STATS_LOOKBACK_DAYS,
  };
}
