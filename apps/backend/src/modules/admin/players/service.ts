import type { Prisma } from "@trayb/db";
import type { GameId } from "@trayb/types";
import { HttpError } from "../../../errors/http-error.js";
import {
  adminPlayerDetailSchema,
  adminPlayerListResponseSchema,
  adminPlayerRoleAssignmentSchema,
  adminPlayerRoleEnum,
  adminPlayerRoleUpdateResponseSchema,
  adminPlayerStatusEnum,
  adminPlayerBanResponseSchema,
  adminPlayerUnbanResponseSchema,
  type AdminPlayerListQuery,
  type AdminPlayerRole,
  type AdminPlayerStatus,
  type AdminPlayerDetail,
  type AdminPlayerListResponse,
} from "./schema.js";
import {
  defaultPlayerRepository,
  type PlayerRepository,
  type PlayerSummaryRow,
  type PlayerDetailRow,
  type PlayerRoleRow,
  type PlayerBanRow,
  type PlayerAuditRow,
} from "./repository.js";
import type { PlayerStatsSnapshot } from "./stats.js";
import { getPlayerStatsSnapshot } from "./stats.js";

const ROLE_ENUM = adminPlayerRoleEnum.options;
const STATUS_ENUM = adminPlayerStatusEnum.options;
const DEFAULT_STATUS: AdminPlayerStatus = "active";

export class PlayerNotFoundError extends HttpError {
  constructor(playerId: string) {
    super(404, `Player ${playerId} not found`, "PLAYER_NOT_FOUND", {
      playerId,
    });
    this.name = "PlayerNotFoundError";
  }
}

export class NoActiveBanError extends HttpError {
  constructor(playerId: string) {
    super(400, `Player ${playerId} has no active ban`, "NO_ACTIVE_BAN", {
      playerId,
    });
    this.name = "NoActiveBanError";
  }
}

interface StatsService {
  getPlayerStatsSnapshot(playerId: string): Promise<PlayerStatsSnapshot>;
}

interface AdminPlayersServiceDeps {
  repository?: PlayerRepository;
  statsService?: StatsService;
}

export function createAdminPlayersService(deps: AdminPlayersServiceDeps = {}) {
  const repository = deps.repository ?? defaultPlayerRepository;

  async function listPlayers(
    query: AdminPlayerListQuery
  ): Promise<AdminPlayerListResponse> {
    const where = buildListWhere(query);
    const [total, users] = await Promise.all([
      repository.countPlayers(where),
      repository.listPlayers(where, {
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return adminPlayerListResponseSchema.parse({
      total,
      page: query.page,
      pageSize: query.pageSize,
      players: users.map(mapUserToPlayerSummary),
    });
  }

  async function getPlayerDetail(playerId: string): Promise<AdminPlayerDetail> {
    const user = await repository.findPlayerDetail(playerId);
    if (!user) {
      throw new PlayerNotFoundError(playerId);
    }
    const statsSnapshot =
      deps.statsService?.getPlayerStatsSnapshot ?? getPlayerStatsSnapshot;
    const stats = await statsSnapshot(playerId);
    return adminPlayerDetailSchema.parse(mapUserToPlayerDetail(user, stats));
  }

  async function updatePlayerRoles(
    playerId: string,
    payload: {
      roles: AdminPlayerRole[];
      primaryRole: AdminPlayerRole;
      reason: string;
      actorId: string;
    }
  ) {
    await repository.transaction(async (tx) => {
      await repository.replaceRoles(tx, {
        playerId,
        roles: payload.roles,
        primaryRole: payload.primaryRole,
        reason: payload.reason,
        actorId: payload.actorId,
      });

      await repository.logAudit(tx, {
        playerId,
        actorId: payload.actorId,
        action: "role_change",
        reason: payload.reason,
        metadata: {
          roles: payload.roles,
          primaryRole: payload.primaryRole,
        },
      });
    });

    const roles = await repository.listRoles(playerId);
    return adminPlayerRoleUpdateResponseSchema.parse({
      playerId,
      roles: mapPlayerRoles(roles),
    });
  }

  async function banPlayer(
    playerId: string,
    payload: {
      type: "temporary" | "permanent";
      durationDays: number | null;
      reason: string;
      banFromAllHubs: boolean;
      banFromDiscord: boolean;
      actorId: string;
    }
  ) {
    const now = new Date();
    const endsAt =
      payload.type === "temporary" && payload.durationDays
        ? new Date(now.getTime() + payload.durationDays * 24 * 60 * 60 * 1000)
        : null;

    const ban = await repository.transaction(async (tx) => {
      await repository.expireActiveBans(tx, playerId, now);
      const created = await repository.createBan(tx, {
        playerId,
        payload: {
          type: payload.type,
          reason: payload.reason,
          durationDays:
            payload.type === "temporary"
              ? (payload.durationDays ?? null)
              : null,
          banFromAllHubs: payload.banFromAllHubs,
          banFromDiscord: payload.banFromDiscord,
        },
        actorId: payload.actorId,
        startsAt: now,
        endsAt,
      });
      await repository.updateUserStatus(tx, playerId, "banned");
      await repository.logAudit(tx, {
        playerId,
        actorId: payload.actorId,
        action: "ban",
        reason: payload.reason,
        metadata: {
          type: payload.type,
          durationDays: payload.durationDays ?? null,
          banFromAllHubs: payload.banFromAllHubs,
          banFromDiscord: payload.banFromDiscord,
        },
      });
      return created;
    });

    return adminPlayerBanResponseSchema.parse({
      playerId,
      ban: mapPlayerBan(ban),
    });
  }

  async function unbanPlayer(
    playerId: string,
    payload: { reason: string; actorId: string }
  ) {
    const activeBan = await repository.findActiveBan(playerId);
    if (!activeBan) {
      throw new NoActiveBanError(playerId);
    }

    const now = new Date();
    await repository.transaction(async (tx) => {
      await repository.liftBan(tx, activeBan.id, now, activeBan.endsAt ?? now);
      await repository.updateUserStatus(tx, playerId, "active");
      await repository.logAudit(tx, {
        playerId,
        actorId: payload.actorId,
        action: "unban",
        reason: payload.reason,
        metadata: { banId: activeBan.id },
      });
    });

    return adminPlayerUnbanResponseSchema.parse({
      playerId,
      status: "active",
    });
  }

  return {
    listPlayers,
    getPlayerDetail,
    updatePlayerRoles,
    banPlayer,
    unbanPlayer,
  };
}

function buildListWhere(query: AdminPlayerListQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }

  if (query.status) {
    where.status = query.status;
  }

  const searchTerm = query.search?.trim();
  if (searchTerm) {
    where.OR = [
      { username: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
      { discord: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  return where;
}

function mapUserToPlayerSummary(user: PlayerSummaryRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    discordId: user.discord ?? null,
    role: normalizeRole(user.role),
    status: normalizeStatus(user.status),
    avatarUrl: user.image ?? null,
    valorantElo: null,
    cs2Rating: null,
    matchesPlayed: 0,
    createdAt: user.createdAt.toISOString(),
  };
}

function mapUserToPlayerDetail(
  user: PlayerDetailRow,
  stats: PlayerStatsSnapshot
): AdminPlayerDetail {
  const lastLogin = user.sessions[0]?.expires ?? null;
  const activeBanRow = user.playerBans[0] ?? null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    discordId: user.discord ?? null,
    avatarUrl: user.image ?? null,
    role: normalizeRole(user.role),
    status: normalizeStatus(user.status),
    createdAt: user.createdAt.toISOString(),
    lastLogin: lastLogin ? lastLogin.toISOString() : null,
    stats: {
      valorant: toGameStats(stats, "valorant"),
      cs2: toGameStats(stats, "cs2"),
    },
    recentMatches: stats.recentMatches,
    ratingHistory: stats.ratingHistory,
    statsLookbackDays: stats.lookbackDays,
    badges: user.userBadges.map((ub) => ({
      id: ub.badge.id,
      label: ub.badge.label,
      variant: ub.badge.variant,
      icon: ub.badge.icon ?? null,
    })),
    roles: mapPlayerRoles(user.playerRoles),
    activeBan: activeBanRow ? mapPlayerBan(activeBanRow) : null,
    auditLog: mapAuditLog(user.auditLogs),
  };
}

function toGameStats(
  stats: PlayerStatsSnapshot,
  game: GameId
): AdminPlayerDetail["stats"]["valorant"] {
  const summary = stats.gameStats[game];
  if (!summary) return null;
  return {
    elo: summary.latestRating ?? null,
    rating2: summary.averageRatingDelta ?? null,
    matches: summary.matches,
    winRate: summary.winRate,
    acs: summary.averageAcs,
    kd: summary.averageKd,
    hsPercent: summary.averageHsPercent,
  };
}

function mapPlayerRoles(rows: PlayerRoleRow[]) {
  return rows.map((role) =>
    adminPlayerRoleAssignmentSchema.parse({
      id: role.id,
      role: role.role,
      isPrimary: role.isPrimary,
      reason: role.reason ?? null,
      assignedBy: role.assignedByUser
        ? {
            id: role.assignedByUser.id,
            username: role.assignedByUser.username,
          }
        : null,
      assignedAt: role.createdAt.toISOString(),
    })
  );
}

function mapPlayerBan(ban: PlayerBanRow) {
  return {
    id: ban.id,
    type: ban.type,
    status: ban.status,
    reason: ban.reason,
    durationDays: ban.durationDays ?? null,
    banFromAllHubs: ban.banFromAllHubs,
    banFromDiscord: ban.banFromDiscord,
    startsAt: ban.startsAt.toISOString(),
    endsAt: ban.endsAt ? ban.endsAt.toISOString() : null,
  };
}

function mapAuditLog(rows: PlayerAuditRow[]) {
  return rows.map((entry) => ({
    id: entry.id,
    action: entry.action,
    reason: entry.reason ?? null,
    metadata: toPlainMetadata(entry.metadata),
    createdAt: entry.createdAt.toISOString(),
    actor: entry.actor
      ? { id: entry.actor.id, username: entry.actor.username }
      : null,
  }));
}

function toPlainMetadata(
  metadata: Prisma.JsonValue | null | undefined
): Record<string, unknown> | null {
  if (metadata === null || metadata === undefined) return null;
  if (typeof metadata === "object" && metadata !== null) {
    return { ...(metadata as Record<string, unknown>) };
  }
  return { value: metadata as unknown };
}

function normalizeRole(role?: string | null): AdminPlayerRole {
  return ROLE_ENUM.includes(role as AdminPlayerRole)
    ? (role as AdminPlayerRole)
    : "competitor";
}

function normalizeStatus(status?: string | null): AdminPlayerStatus {
  return STATUS_ENUM.includes(status as AdminPlayerStatus)
    ? (status as AdminPlayerStatus)
    : DEFAULT_STATUS;
}
