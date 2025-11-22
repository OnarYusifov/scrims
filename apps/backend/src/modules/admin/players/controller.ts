import type { FastifyRequest } from "fastify";
import {
  adminPlayerBanSchema,
  adminPlayerIdParamSchema,
  adminPlayerListQuerySchema,
  adminPlayerRoleUpdateSchema,
  adminPlayerUnbanSchema,
} from "./schema.js";
import { createAdminPlayersService } from "./service.js";
import type {
  AdminFastifyRequest,
  AdminJwtPayload,
} from "../../../plugins/admin-auth.js";

export function createAdminPlayersController() {
  const service = createAdminPlayersService();

  return {
    listPlayers: async (request: FastifyRequest) => {
      const query = adminPlayerListQuerySchema.parse(request.query);
      return service.listPlayers(query);
    },
    getPlayerDetail: async (request: FastifyRequest) => {
      const { playerId } = adminPlayerIdParamSchema.parse(request.params);
      return service.getPlayerDetail(playerId);
    },
    updatePlayerRoles: async (request: AdminFastifyRequest) => {
      const { playerId } = adminPlayerIdParamSchema.parse(request.params);
      const payload = adminPlayerRoleUpdateSchema.parse(request.body);
      const actorId = getAdminActorId(request);
      return service.updatePlayerRoles(playerId, {
        roles: payload.roles,
        primaryRole: payload.primaryRole,
        reason: payload.reason,
        actorId,
      });
    },
    banPlayer: async (request: AdminFastifyRequest) => {
      const { playerId } = adminPlayerIdParamSchema.parse(request.params);
      const payload = adminPlayerBanSchema.parse(request.body);
      const actorId = getAdminActorId(request);
      return service.banPlayer(playerId, {
        type: payload.type,
        durationDays: payload.durationDays ?? null,
        reason: payload.reason,
        banFromAllHubs: payload.banFromAllHubs,
        banFromDiscord: payload.banFromDiscord,
        actorId,
      });
    },
    unbanPlayer: async (request: AdminFastifyRequest) => {
      const { playerId } = adminPlayerIdParamSchema.parse(request.params);
      const payload = adminPlayerUnbanSchema.parse(request.body);
      const actorId = getAdminActorId(request);
      return service.unbanPlayer(playerId, {
        reason: payload.reason,
        actorId,
      });
    },
  };
}

function getAdminActorId(request: FastifyRequest): string {
  const admin = (request as AdminFastifyRequest).admin as
    | AdminJwtPayload
    | undefined;
  if (admin?.userId) return admin.userId;
  throw new Error("Missing admin context in request");
}
