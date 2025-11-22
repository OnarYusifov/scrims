/**
 * Admin Players Module Routes
 *
 * Provides endpoints for managing players (users) in the admin dashboard.
 * All routes require admin authentication (organizer, admin, or moderator role).
 *
 * @module admin/players
 */

import type { FastifyInstance } from "fastify";
import { createAdminPlayersController } from "./controller.js";
import adminAuthPlugin from "../../../plugins/admin-auth.js";
import {
  playerListQueryJson,
  playerListResponseJson,
  playerIdParamsJson,
  playerDetailJson,
  roleUpdateJson,
  roleUpdateResponseJson,
  banJson,
  banResponseJson,
  unbanJson,
  unbanResponseJson,
  errorResponseJson,
} from "./swagger-schemas.js";

/**
 * Registers all admin player management routes
 *
 * Routes:
 * - GET /admin/players - List players with pagination and filters
 * - GET /admin/players/:playerId - Get player details
 * - PUT /admin/players/:playerId/roles - Update player roles
 * - POST /admin/players/:playerId/ban - Ban a player
 * - POST /admin/players/:playerId/unban - Lift a player ban
 *
 * @param fastify - Fastify instance
 */
export async function registerAdminPlayersModule(fastify: FastifyInstance) {
  await fastify.register(adminAuthPlugin);
  const controller = createAdminPlayersController();

  /**
   * List players with pagination and filtering
   *
   * Supports filtering by:
   * - Role (organizer, admin, moderator, competitor, viewer)
   * - Status (active, banned, suspended)
   * - Game (valorant, cs2)
   * - Hub membership
   * - Search by username, email, or Discord ID
   *
   * @route GET /admin/players
   * @requires AdminAuth (organizer, admin, moderator)
   */
  fastify.get("/admin/players", {
    schema: {
      tags: ["admin-players"],
      security: [{ BearerAuth: [] }],
      querystring: playerListQueryJson,
      response: {
        200: playerListResponseJson,
      },
    },
    handler: controller.listPlayers,
  });

  /**
   * Get detailed player information
   *
   * Returns complete player profile including:
   * - Basic profile information
   * - Game statistics (Valorant, CS2)
   * - Recent matches
   * - Rating history
   * - Badges
   * - Roles (RBAC)
   * - Active ban (if any)
   * - Audit log entries
   *
   * @route GET /admin/players/:playerId
   * @requires AdminAuth (organizer, admin, moderator)
   * @returns 404 if player not found
   */
  fastify.get("/admin/players/:playerId", {
    schema: {
      tags: ["admin-players"],
      security: [{ BearerAuth: [] }],
      params: playerIdParamsJson,
      response: {
        200: playerDetailJson,
        404: errorResponseJson,
      },
    },
    handler: controller.getPlayerDetail,
  });

  /**
   * Update player roles (RBAC system)
   *
   * Replaces all existing roles with the provided roles.
   * One role must be marked as primary, which updates User.role field.
   * All role changes are logged to audit log.
   *
   * @route PUT /admin/players/:playerId/roles
   * @requires AdminAuth (organizer, admin, moderator)
   * @body { roles: string[], primaryRole: string, reason: string }
   */
  fastify.put("/admin/players/:playerId/roles", {
    schema: {
      tags: ["admin-players"],
      security: [{ BearerAuth: [] }],
      params: playerIdParamsJson,
      body: roleUpdateJson,
      response: {
        200: roleUpdateResponseJson,
      },
    },
    handler: controller.updatePlayerRoles,
  });

  /**
   * Ban a player
   *
   * Creates a ban record (temporary or permanent) and updates user status.
   * Temporary bans automatically expire when endsAt is reached.
   * All bans are logged to audit log.
   *
   * @route POST /admin/players/:playerId/ban
   * @requires AdminAuth (organizer, admin, moderator)
   * @body { type: "temporary" | "permanent", durationDays?: number, reason: string, banFromAllHubs: boolean, banFromDiscord: boolean }
   */
  fastify.post("/admin/players/:playerId/ban", {
    schema: {
      tags: ["admin-players"],
      security: [{ BearerAuth: [] }],
      params: playerIdParamsJson,
      body: banJson,
      response: {
        200: banResponseJson,
      },
    },
    handler: controller.banPlayer,
  });

  /**
   * Lift an active player ban
   *
   * Marks the most recent active ban as lifted and restores user status to active.
   * The ban action is logged to audit log.
   *
   * @route POST /admin/players/:playerId/unban
   * @requires AdminAuth (organizer, admin, moderator)
   * @body { reason: string }
   * @returns 400 if no active ban exists
   */
  fastify.post("/admin/players/:playerId/unban", {
    schema: {
      tags: ["admin-players"],
      security: [{ BearerAuth: [] }],
      params: playerIdParamsJson,
      body: unbanJson,
      response: {
        200: unbanResponseJson,
        400: errorResponseJson,
      },
    },
    handler: controller.unbanPlayer,
  });
}
