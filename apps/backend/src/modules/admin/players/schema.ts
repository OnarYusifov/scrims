import { z } from "zod";
import { games, matchTeams } from "@trayb/types";

export const adminPlayerRoleEnum = z.enum([
  "organizer",
  "admin",
  "moderator",
  "competitor",
  "viewer",
]);

export const adminPlayerStatusEnum = z.enum(["active", "banned", "suspended"]);

export const adminPlayerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  role: adminPlayerRoleEnum.optional(),
  status: adminPlayerStatusEnum.optional(),
  game: z.enum(games).optional(),
  hubId: z.string().optional(),
});

export const adminPlayerListResponseSchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  players: z.array(
    z.object({
      id: z.string(),
      username: z.string(),
      email: z.string().email(),
      discordId: z.string().nullable(),
      role: adminPlayerRoleEnum,
      status: adminPlayerStatusEnum,
      avatarUrl: z.string().nullable(),
      valorantElo: z.number().nullable(),
      cs2Rating: z.number().nullable(),
      matchesPlayed: z.number(),
      createdAt: z.string(),
    })
  ),
});

export const adminPlayerIdParamSchema = z.object({
  playerId: z.string(),
});

const playerGameStatsSchema = z.object({
  elo: z.number().nullable(),
  rating2: z.number().nullable(),
  matches: z.number().nullable(),
  winRate: z.number().nullable(),
  acs: z.number().nullable(),
  kd: z.number().nullable(),
  hsPercent: z.number().nullable(),
});

const playerRecentMatchSchema = z.object({
  matchId: z.string(),
  startedAt: z.string(),
  game: z.enum(games),
  map: z.string(),
  result: z.enum(["win", "loss", "draw"]),
  team: z.enum(matchTeams),
  ratingDelta: z.number().nullable(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  acs: z.number().nullable(),
});

const playerRatingHistorySchema = z.object({
  id: z.string(),
  date: z.string(),
  game: z.enum(games),
  rating: z.number(),
  delta: z.number(),
  matchId: z.string().nullable(),
});

export const adminPlayerDetailSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  discordId: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: adminPlayerRoleEnum,
  status: adminPlayerStatusEnum,
  createdAt: z.string(),
  lastLogin: z.string().nullable(),
  stats: z.object({
    valorant: playerGameStatsSchema.nullable(),
    cs2: playerGameStatsSchema.nullable(),
  }),
  recentMatches: z.array(playerRecentMatchSchema),
  ratingHistory: z.array(playerRatingHistorySchema),
  statsLookbackDays: z.number(),
  badges: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      variant: z.string(),
      icon: z.string().nullable(),
    })
  ),
  roles: z.array(
    z.object({
      id: z.string(),
      role: adminPlayerRoleEnum,
      isPrimary: z.boolean(),
      reason: z.string().nullable(),
      assignedBy: z
        .object({
          id: z.string(),
          username: z.string(),
        })
        .nullable(),
      assignedAt: z.string(),
    })
  ),
  activeBan: z
    .object({
      id: z.string(),
      type: z.enum(["temporary", "permanent"]),
      status: z.enum(["active", "lifted", "expired"]),
      reason: z.string(),
      durationDays: z.number().nullable(),
      banFromAllHubs: z.boolean(),
      banFromDiscord: z.boolean(),
      startsAt: z.string(),
      endsAt: z.string().nullable(),
    })
    .nullable(),
  auditLog: z.array(
    z.object({
      id: z.string(),
      action: z.enum(["role_change", "ban", "unban", "note"]),
      reason: z.string().nullable(),
      metadata: z.record(z.any()).nullable(),
      createdAt: z.string(),
      actor: z
        .object({
          id: z.string(),
          username: z.string(),
        })
        .nullable(),
    })
  ),
});

export const adminPlayerRoleUpdateSchema = z
  .object({
    roles: z.array(adminPlayerRoleEnum).min(1),
    primaryRole: adminPlayerRoleEnum,
    reason: z.string().min(5),
  })
  .refine((data) => data.roles.includes(data.primaryRole), {
    message: "Primary role must be included in roles list",
    path: ["primaryRole"],
  });

export const adminPlayerBanSchema = z.object({
  type: z.enum(["temporary", "permanent"]),
  durationDays: z.number().min(1).max(365).optional(),
  reason: z.string().min(5),
  banFromAllHubs: z.boolean().default(true),
  banFromDiscord: z.boolean().default(false),
});

export const adminPlayerUnbanSchema = z.object({
  reason: z.string().min(5),
});

export const adminPlayerRoleAssignmentSchema = z.object({
  id: z.string(),
  role: adminPlayerRoleEnum,
  isPrimary: z.boolean(),
  reason: z.string().nullable(),
  assignedBy: z
    .object({
      id: z.string(),
      username: z.string(),
    })
    .nullable(),
  assignedAt: z.string(),
});

export const adminPlayerRoleUpdateResponseSchema = z.object({
  playerId: z.string(),
  roles: z.array(adminPlayerRoleAssignmentSchema),
});

export const adminPlayerBanResponseSchema = z.object({
  playerId: z.string(),
  ban: z.object({
    id: z.string(),
    type: z.enum(["temporary", "permanent"]),
    status: z.enum(["active", "lifted", "expired"]),
    reason: z.string(),
    durationDays: z.number().nullable(),
    banFromAllHubs: z.boolean(),
    banFromDiscord: z.boolean(),
    startsAt: z.string(),
    endsAt: z.string().nullable(),
  }),
});

export const adminPlayerUnbanResponseSchema = z.object({
  playerId: z.string(),
  status: adminPlayerStatusEnum,
});

export type AdminPlayerRole = z.infer<typeof adminPlayerRoleEnum>;
export type AdminPlayerStatus = z.infer<typeof adminPlayerStatusEnum>;
export type AdminPlayerListQuery = z.infer<typeof adminPlayerListQuerySchema>;
export type AdminPlayerListResponse = z.infer<
  typeof adminPlayerListResponseSchema
>;
export type AdminPlayerDetail = z.infer<typeof adminPlayerDetailSchema>;
export type AdminPlayerRoleAssignment = z.infer<
  typeof adminPlayerRoleAssignmentSchema
>;
