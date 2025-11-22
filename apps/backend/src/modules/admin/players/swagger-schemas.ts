/**
 * Swagger/OpenAPI JSON Schemas for Admin Players Routes
 *
 * These schemas are used for Fastify route validation and Swagger documentation.
 * They mirror the Zod schemas in schema.ts but in JSON Schema format.
 */

import { games, matchTeams } from "@trayb/types";
import { adminPlayerRoleEnum, adminPlayerStatusEnum } from "./schema.js";

const ROLE_ENUM = adminPlayerRoleEnum.options;
const STATUS_ENUM = adminPlayerStatusEnum.options;

export const playerListQueryJson = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 25 },
    search: { type: "string" },
    role: { type: "string", enum: ROLE_ENUM },
    status: { type: "string", enum: STATUS_ENUM },
    game: { type: "string", enum: games },
    hubId: { type: "string" },
  },
};

export const playerSummaryJson = {
  type: "object",
  properties: {
    id: { type: "string" },
    username: { type: "string" },
    email: { type: "string" },
    discordId: { type: ["string", "null"] },
    role: { type: "string", enum: ROLE_ENUM },
    status: { type: "string", enum: STATUS_ENUM },
    avatarUrl: { type: ["string", "null"] },
    valorantElo: { type: ["number", "null"] },
    cs2Rating: { type: ["number", "null"] },
    matchesPlayed: { type: "integer" },
    createdAt: { type: "string" },
  },
};

const playerGameStatsJson = {
  type: "object",
  properties: {
    elo: { type: ["number", "null"] },
    rating2: { type: ["number", "null"] },
    matches: { type: ["number", "null"] },
    winRate: { type: ["number", "null"] },
    acs: { type: ["number", "null"] },
    kd: { type: ["number", "null"] },
    hsPercent: { type: ["number", "null"] },
  },
};

const playerStatsJson = {
  type: "object",
  properties: {
    valorant: { anyOf: [playerGameStatsJson, { type: "null" }] },
    cs2: { anyOf: [playerGameStatsJson, { type: "null" }] },
  },
};

const playerRecentMatchJson = {
  type: "object",
  properties: {
    matchId: { type: "string" },
    startedAt: { type: "string" },
    game: { type: "string", enum: games },
    map: { type: "string" },
    result: { type: "string", enum: ["win", "loss", "draw"] },
    team: { type: "string", enum: matchTeams },
    ratingDelta: { type: ["number", "null"] },
    kills: { type: "integer" },
    deaths: { type: "integer" },
    assists: { type: "integer" },
    acs: { type: ["number", "null"] },
  },
};

const playerRatingHistoryJson = {
  type: "object",
  properties: {
    id: { type: "string" },
    date: { type: "string" },
    game: { type: "string", enum: games },
    rating: { type: "number" },
    delta: { type: "number" },
    matchId: { type: ["string", "null"] },
  },
};

const playerBadgeJson = {
  type: "object",
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    variant: { type: "string" },
    icon: { type: ["string", "null"] },
  },
};

const playerRoleAssignmentJson = {
  type: "object",
  properties: {
    id: { type: "string" },
    role: { type: "string", enum: ROLE_ENUM },
    isPrimary: { type: "boolean" },
    reason: { type: ["string", "null"] },
    assignedBy: {
      type: ["object", "null"],
      properties: {
        id: { type: "string" },
        username: { type: "string" },
      },
    },
    assignedAt: { type: "string" },
  },
};

const playerBanJson = {
  type: "object",
  properties: {
    id: { type: "string" },
    type: { type: "string", enum: ["temporary", "permanent"] },
    status: { type: "string", enum: ["active", "lifted", "expired"] },
    reason: { type: "string" },
    durationDays: { type: ["number", "null"] },
    banFromAllHubs: { type: "boolean" },
    banFromDiscord: { type: "boolean" },
    startsAt: { type: "string" },
    endsAt: { type: ["string", "null"] },
  },
};

const playerAuditLogJson = {
  type: "object",
  properties: {
    id: { type: "string" },
    action: {
      type: "string",
      enum: ["role_change", "ban", "unban", "note"],
    },
    reason: { type: ["string", "null"] },
    metadata: { type: ["object", "null"] },
    createdAt: { type: "string" },
    actor: {
      type: ["object", "null"],
      properties: {
        id: { type: "string" },
        username: { type: "string" },
      },
    },
  },
};

export const playerDetailJson = {
  type: "object",
  properties: {
    id: { type: "string" },
    username: { type: "string" },
    email: { type: "string" },
    discordId: { type: ["string", "null"] },
    avatarUrl: { type: ["string", "null"] },
    role: { type: "string", enum: ROLE_ENUM },
    status: { type: "string", enum: STATUS_ENUM },
    createdAt: { type: "string" },
    lastLogin: { type: ["string", "null"] },
    stats: playerStatsJson,
    recentMatches: {
      type: "array",
      items: playerRecentMatchJson,
    },
    ratingHistory: {
      type: "array",
      items: playerRatingHistoryJson,
    },
    statsLookbackDays: { type: "integer" },
    badges: {
      type: "array",
      items: playerBadgeJson,
    },
    roles: {
      type: "array",
      items: playerRoleAssignmentJson,
    },
    activeBan: { anyOf: [playerBanJson, { type: "null" }] },
    auditLog: {
      type: "array",
      items: playerAuditLogJson,
    },
  },
};

export const playerListResponseJson = {
  type: "object",
  properties: {
    total: { type: "integer" },
    page: { type: "integer" },
    pageSize: { type: "integer" },
    players: {
      type: "array",
      items: playerSummaryJson,
    },
  },
};

export const playerIdParamsJson = {
  type: "object",
  properties: {
    playerId: { type: "string" },
  },
  required: ["playerId"],
};

export const roleUpdateJson = {
  type: "object",
  properties: {
    roles: {
      type: "array",
      items: { type: "string", enum: ROLE_ENUM },
      minItems: 1,
    },
    primaryRole: { type: "string", enum: ROLE_ENUM },
    reason: { type: "string", minLength: 5 },
  },
  required: ["roles", "primaryRole", "reason"],
};

export const roleUpdateResponseJson = {
  type: "object",
  properties: {
    playerId: { type: "string" },
    roles: {
      type: "array",
      items: playerRoleAssignmentJson,
    },
  },
};

export const banJson = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["temporary", "permanent"] },
    durationDays: { type: "integer", minimum: 1, maximum: 365 },
    reason: { type: "string", minLength: 5 },
    banFromAllHubs: { type: "boolean", default: true },
    banFromDiscord: { type: "boolean", default: false },
  },
  required: ["type", "reason"],
};

export const banResponseJson = {
  type: "object",
  properties: {
    playerId: { type: "string" },
    ban: playerBanJson,
  },
};

export const unbanJson = {
  type: "object",
  properties: {
    reason: { type: "string", minLength: 5 },
  },
  required: ["reason"],
};

export const unbanResponseJson = {
  type: "object",
  properties: {
    playerId: { type: "string" },
    status: { type: "string", enum: STATUS_ENUM },
  },
};

export const errorResponseJson = {
  type: "object",
  properties: {
    error: { type: "string" },
    code: { type: "string" },
    details: { type: "object" },
  },
};
