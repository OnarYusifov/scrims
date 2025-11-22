import { prisma } from "@trayb/db";
import type { Prisma, PrismaClient } from "@trayb/db";
import type { AdminPlayerRole, AdminPlayerStatus } from "./schema.js";
import {
  userSelectors,
  auditSelectors,
  roleSelectors,
  banSelectors,
  badgeSelectors,
} from "../../../utils/prisma-selectors.js";

// Use shared selectors from utilities
const playerSummarySelect = userSelectors.summary;
const playerRoleSelect = roleSelectors.withAssigner;
const playerBanSelect = banSelectors.active;
const playerAuditSelect = auditSelectors.basic;

const playerDetailSelect = {
  id: true,
  username: true,
  email: true,
  discord: true,
  role: true,
  image: true,
  createdAt: true,
  updatedAt: true,
  emailVerified: true,
  status: true,
  userBadges: {
    select: {
      badge: {
        select: badgeSelectors.display,
      },
    },
    orderBy: { createdAt: "asc" },
    take: 24,
  },
  sessions: {
    select: { expires: true },
    orderBy: { expires: "desc" },
    take: 1,
  },
  playerRoles: {
    select: playerRoleSelect,
    orderBy: { createdAt: "desc" },
  },
  playerBans: {
    select: playerBanSelect,
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  auditLogs: {
    select: playerAuditSelect,
    orderBy: { createdAt: "desc" },
    take: 20,
  },
} satisfies Prisma.UserSelect;

export type PlayerSummaryRow = Prisma.UserGetPayload<{
  select: typeof playerSummarySelect;
}>;

export type PlayerDetailRow = Prisma.UserGetPayload<{
  select: typeof playerDetailSelect;
}>;

export type PlayerRoleRow = Prisma.PlayerRoleGetPayload<{
  select: typeof playerRoleSelect;
}>;

export type PlayerBanRow = Prisma.PlayerBanGetPayload<{
  select: typeof playerBanSelect;
}>;

export type PlayerAuditRow = Prisma.PlayerAuditLogGetPayload<{
  select: typeof playerAuditSelect;
}>;

export interface PlayerRepository {
  countPlayers(where: Prisma.UserWhereInput): Promise<number>;
  listPlayers(
    where: Prisma.UserWhereInput,
    pagination: { skip: number; take: number }
  ): Promise<PlayerSummaryRow[]>;
  findPlayerDetail(playerId: string): Promise<PlayerDetailRow | null>;
  listRoles(playerId: string): Promise<PlayerRoleRow[]>;
  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  replaceRoles(
    tx: Prisma.TransactionClient,
    args: {
      playerId: string;
      roles: AdminPlayerRole[];
      primaryRole: AdminPlayerRole;
      reason: string;
      actorId: string;
    }
  ): Promise<void>;
  expireActiveBans(
    tx: Prisma.TransactionClient,
    playerId: string,
    timestamp: Date
  ): Promise<void>;
  createBan(
    tx: Prisma.TransactionClient,
    args: {
      playerId: string;
      payload: {
        type: "temporary" | "permanent";
        reason: string;
        durationDays: number | null;
        banFromAllHubs: boolean;
        banFromDiscord: boolean;
      };
      actorId: string;
      startsAt: Date;
      endsAt: Date | null;
    }
  ): Promise<PlayerBanRow>;
  updateUserStatus(
    tx: Prisma.TransactionClient,
    playerId: string,
    status: AdminPlayerStatus
  ): Promise<void>;
  logAudit(
    tx: Prisma.TransactionClient,
    args: {
      playerId: string;
      actorId: string;
      action: "role_change" | "ban" | "unban" | "note";
      reason: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void>;
  findActiveBan(playerId: string): Promise<PlayerBanRow | null>;
  liftBan(
    tx: Prisma.TransactionClient,
    banId: string,
    timestamp: Date,
    endsAt: Date
  ): Promise<void>;
}

export function createPlayerRepository(
  client: PrismaClient = prisma
): PlayerRepository {
  return {
    countPlayers(where) {
      return client.user.count({ where });
    },
    listPlayers(where, pagination) {
      return client.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
        select: playerSummarySelect,
      });
    },
    findPlayerDetail(playerId) {
      return client.user.findUnique({
        where: { id: playerId },
        select: playerDetailSelect,
      });
    },
    listRoles(playerId) {
      return client.playerRole.findMany({
        where: { userId: playerId },
        select: playerRoleSelect,
        orderBy: { createdAt: "desc" },
      });
    },
    transaction(fn) {
      return client.$transaction(fn);
    },
    async replaceRoles(tx, { playerId, roles, primaryRole, reason, actorId }) {
      await tx.playerRole.deleteMany({ where: { userId: playerId } });
      await tx.playerRole.createMany({
        data: roles.map((role) => ({
          userId: playerId,
          role,
          isPrimary: role === primaryRole,
          assignedBy: actorId,
          reason,
        })),
      });
      await tx.user.update({
        where: { id: playerId },
        data: { role: primaryRole },
      });
    },
    expireActiveBans(tx, playerId, timestamp) {
      return tx.playerBan.updateMany({
        where: { userId: playerId, status: "active" },
        data: { status: "expired", endsAt: timestamp },
      });
    },
    createBan(tx, { playerId, payload, actorId, startsAt, endsAt }) {
      return tx.playerBan.create({
        data: {
          userId: playerId,
          status: "active",
          type: payload.type,
          reason: payload.reason,
          durationDays: payload.durationDays,
          banFromAllHubs: payload.banFromAllHubs,
          banFromDiscord: payload.banFromDiscord,
          bannedBy: actorId,
          startsAt,
          endsAt,
        },
        select: playerBanSelect,
      });
    },
    updateUserStatus(tx, playerId, status) {
      return tx.user.update({
        where: { id: playerId },
        data: { status },
      });
    },
    logAudit(tx, { playerId, actorId, action, reason, metadata }) {
      return tx.playerAuditLog.create({
        data: {
          userId: playerId,
          actorId,
          action,
          reason,
          metadata: metadata ?? {},
        },
      });
    },
    findActiveBan(playerId) {
      return client.playerBan.findFirst({
        where: { userId: playerId, status: "active" },
        orderBy: { createdAt: "desc" },
        select: playerBanSelect,
      });
    },
    liftBan(tx, banId, timestamp, endsAt) {
      return tx.playerBan.update({
        where: { id: banId },
        data: {
          status: "lifted",
          liftedAt: timestamp,
          endsAt,
        },
      });
    },
  };
}

export const defaultPlayerRepository = createPlayerRepository();
