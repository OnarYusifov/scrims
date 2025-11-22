import type { FastifyRequest } from "fastify";
import { createAdminStatsService } from "./service.js";

export function createAdminStatsController() {
  const service = createAdminStatsService();

  return {
    matchAnalytics: async (request: FastifyRequest) => {
      return service.getMatchAnalytics(request.query);
    },
    eloDistribution: async (request: FastifyRequest) => {
      return service.getEloDistribution(request.query);
    },
    overview: async (request: FastifyRequest) => {
      return service.getOverview(request.query);
    },
  };
}
