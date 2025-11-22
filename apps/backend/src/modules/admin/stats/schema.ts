import { z } from "zod";
import { games } from "@trayb/types";

export const adminStatsGameEnum = z.enum(games);

export const adminMatchAnalyticsQuerySchema = z.object({
  game: adminStatsGameEnum.default("valorant"),
  from: z.string().optional(),
  to: z.string().optional(),
  hubId: z.string().optional(),
});

export type AdminMatchAnalyticsQuery = z.infer<
  typeof adminMatchAnalyticsQuerySchema
>;

export const adminMatchAnalyticsResponseSchema = z.object({
  timeframe: z.object({
    from: z.string(),
    to: z.string(),
    days: z.number(),
  }),
  totals: z.object({
    matches: z.number(),
    avgDurationMinutes: z.number(),
    avgRounds: z.number(),
  }),
  outcomes: z.object({
    alpha: z.number(),
    bravo: z.number(),
    draw: z.number(),
  }),
  maps: z.array(
    z.object({
      map: z.string(),
      matches: z.number(),
      alphaWinRate: z.number(),
      bravoWinRate: z.number(),
      avgRounds: z.number(),
    })
  ),
  recentTrend: z.array(
    z.object({
      date: z.string(),
      matches: z.number(),
      avgRatingDelta: z.number(),
    })
  ),
  topPerformers: z.array(
    z.object({
      playerId: z.string(),
      username: z.string(),
      kills: z.number(),
      acs: z.number().nullable(),
      ratingDelta: z.number().nullable(),
    })
  ),
});

export const adminEloDistributionQuerySchema = z.object({
  game: adminStatsGameEnum.default("valorant"),
  hubId: z.string().optional(),
});

export type AdminEloDistributionQuery = z.infer<
  typeof adminEloDistributionQuerySchema
>;

export const adminEloDistributionResponseSchema = z.object({
  summary: z.object({
    totalPlayers: z.number(),
    average: z.number().nullable(),
    median: z.number().nullable(),
    percentile95: z.number().nullable(),
    min: z.number().nullable(),
    max: z.number().nullable(),
  }),
  buckets: z.array(
    z.object({
      label: z.string(),
      count: z.number(),
    })
  ),
});

export const adminStatsOverviewResponseSchema = z.object({
  timeframe: adminMatchAnalyticsResponseSchema.shape.timeframe,
  players: z.object({
    total: z.number(),
    active: z.number(),
    banned: z.number(),
    newThisWeek: z.number(),
  }),
  matches: adminMatchAnalyticsResponseSchema.shape.totals,
  outcomes: adminMatchAnalyticsResponseSchema.shape.outcomes,
});
