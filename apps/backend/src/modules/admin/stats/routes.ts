import type { FastifyInstance } from "fastify";
import adminAuthPlugin from "../../../plugins/admin-auth.js";
import { createAdminStatsController } from "./controller.js";
import { games } from "@trayb/types";

const statsQueryJson = {
  type: "object",
  properties: {
    game: { type: "string", enum: games, default: "valorant" },
    from: { type: "string", format: "date-time" },
    to: { type: "string", format: "date-time" },
    hubId: { type: "string" },
  },
};

const matchAnalyticsResponseJson = {
  type: "object",
  properties: {
    timeframe: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" },
        days: { type: "integer" },
      },
    },
    totals: {
      type: "object",
      properties: {
        matches: { type: "integer" },
        avgDurationMinutes: { type: "number" },
        avgRounds: { type: "number" },
      },
    },
    outcomes: {
      type: "object",
      properties: {
        alpha: { type: "integer" },
        bravo: { type: "integer" },
        draw: { type: "integer" },
      },
    },
    maps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          map: { type: "string" },
          matches: { type: "integer" },
          alphaWinRate: { type: "number" },
          bravoWinRate: { type: "number" },
          avgRounds: { type: "number" },
        },
      },
    },
    recentTrend: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          matches: { type: "integer" },
          avgRatingDelta: { type: "number" },
        },
      },
    },
    topPerformers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          playerId: { type: "string" },
          username: { type: "string" },
          kills: { type: "integer" },
          acs: { type: ["number", "null"] },
          ratingDelta: { type: ["number", "null"] },
        },
      },
    },
  },
};

const eloDistributionResponseJson = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        totalPlayers: { type: "integer" },
        average: { type: ["number", "null"] },
        median: { type: ["number", "null"] },
        percentile95: { type: ["number", "null"] },
        min: { type: ["number", "null"] },
        max: { type: ["number", "null"] },
      },
    },
    buckets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          count: { type: "integer" },
        },
      },
    },
  },
};

const overviewResponseJson = {
  type: "object",
  properties: {
    timeframe: matchAnalyticsResponseJson.properties.timeframe,
    players: {
      type: "object",
      properties: {
        total: { type: "integer" },
        active: { type: "integer" },
        banned: { type: "integer" },
        newThisWeek: { type: "integer" },
      },
    },
    matches: matchAnalyticsResponseJson.properties.totals,
    outcomes: matchAnalyticsResponseJson.properties.outcomes,
  },
};

/**
 * Admin Stats Module Routes
 *
 * Provides statistical endpoints for the admin dashboard.
 * All routes require admin authentication.
 *
 * @module admin/stats
 */

/**
 * Registers all admin statistics routes
 *
 * Routes:
 * - GET /admin/stats/overview - Platform-wide overview
 * - GET /admin/stats/match-analytics - Detailed match analytics
 * - GET /admin/stats/elo-distribution - ELO distribution histogram
 *
 * @param fastify - Fastify instance
 */
export async function registerAdminStatsModule(fastify: FastifyInstance) {
  await fastify.register(adminAuthPlugin);
  const controller = createAdminStatsController();

  /**
   * Get detailed match analytics
   *
   * Returns match statistics including:
   * - Total matches, average duration, average rounds
   * - Outcome distribution (alpha/bravo/draw)
   * - Per-map statistics with win rates
   * - Recent trend (matches per day, avg rating delta)
   * - Top performers (kills, ACS, rating delta)
   *
   * @route GET /admin/stats/match-analytics
   * @requires AdminAuth
   * @query { game?: string, from?: string, to?: string, hubId?: string }
   */
  fastify.get("/admin/stats/match-analytics", {
    schema: {
      tags: ["admin-stats"],
      security: [{ BearerAuth: [] }],
      querystring: statsQueryJson,
      response: {
        200: matchAnalyticsResponseJson,
      },
    },
    handler: controller.matchAnalytics,
  });

  /**
   * Get ELO distribution histogram
   *
   * Returns ELO distribution data for generating histograms:
   * - Summary statistics (total, average, median, percentiles, min, max)
   * - Histogram buckets with player counts per ELO range
   *
   * @route GET /admin/stats/elo-distribution
   * @requires AdminAuth
   * @query { game: string, hubId?: string }
   */
  fastify.get("/admin/stats/elo-distribution", {
    schema: {
      tags: ["admin-stats"],
      security: [{ BearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          game: { type: "string", enum: games, default: "valorant" },
          hubId: { type: "string" },
        },
      },
      response: {
        200: eloDistributionResponseJson,
      },
    },
    handler: controller.eloDistribution,
  });

  /**
   * Get platform overview statistics
   *
   * Returns high-level platform metrics:
   * - Player counts (total, active, banned, new this week)
   * - Match totals (count, avg duration, avg rounds)
   * - Outcome distribution
   *
   * @route GET /admin/stats/overview
   * @requires AdminAuth
   * @query { game?: string, from?: string, to?: string, hubId?: string }
   */
  fastify.get("/admin/stats/overview", {
    schema: {
      tags: ["admin-stats"],
      security: [{ BearerAuth: [] }],
      querystring: statsQueryJson,
      response: {
        200: overviewResponseJson,
      },
    },
    handler: controller.overview,
  });
}
