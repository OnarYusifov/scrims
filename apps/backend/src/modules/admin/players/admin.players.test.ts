import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { SignJWT } from "jose";
import type { Prisma } from "@trayb/db";
import {
  closeTestServer,
  createTestServer,
} from "../../../tests/test-server.js";
import type { PlayerStatsSnapshot } from "./stats.js";
import * as playerStats from "./stats.js";
import {
  defaultPlayerRepository,
  type PlayerRoleRow,
  type PlayerBanRow,
} from "./repository.js";

const mockStatsSnapshot: PlayerStatsSnapshot = {
  gameStats: {
    valorant: {
      matches: 12,
      wins: 7,
      winRate: 58.3,
      averageAcs: 210.5,
      averageKd: 1.25,
      averageHsPercent: 22.4,
      averageRatingDelta: 9.5,
      latestRating: 2125,
    },
  },
  recentMatches: [
    {
      matchId: "match-1",
      startedAt: "2025-01-01T00:00:00.000Z",
      game: "valorant",
      map: "Ascent",
      result: "win",
      team: "alpha",
      ratingDelta: 15,
      kills: 24,
      deaths: 16,
      assists: 8,
      acs: 230,
    },
  ],
  ratingHistory: [
    {
      id: "history-1",
      date: "2025-01-01T00:00:00.000Z",
      game: "valorant",
      rating: 2125,
      delta: 15,
      matchId: "match-1",
    },
  ],
  lookbackDays: 30,
};

const TEST_JWT_SECRET = "admin-test-secret";
const encoder = new TextEncoder();

async function createAdminToken() {
  return new SignJWT({
    userId: "admin-test-id",
    email: "admin@example.com",
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(encoder.encode(TEST_JWT_SECRET));
}

describe("Admin players module", () => {
  let server: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    adminToken = await createAdminToken();
    server = await createTestServer();
  });

  beforeEach(() => {
    vi.spyOn(playerStats, "getPlayerStatsSnapshot").mockResolvedValue(
      mockStatsSnapshot
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  it("returns paginated player data from Prisma", async () => {
    const countSpy = vi
      .spyOn(defaultPlayerRepository, "countPlayers")
      .mockResolvedValue(1);
    const listSpy = vi
      .spyOn(defaultPlayerRepository, "listPlayers")
      .mockResolvedValue([
        {
          id: "player-1",
          username: "playerOne",
          email: "player1@example.com",
          discord: "discord#0001",
          role: "competitor",
          image: "https://cdn.example.com/avatars/1.png",
          status: "active",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
        } as PlayerSummaryRow,
      ]);

    const response = await server.inject({
      method: "GET",
      url: "/admin/players?page=1&pageSize=10",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(countSpy).toHaveBeenCalledWith({});
    expect(listSpy).toHaveBeenCalledWith({}, { skip: 0, take: 10 });
    expect(response.json()).toEqual({
      total: 1,
      page: 1,
      pageSize: 10,
      players: [
        {
          id: "player-1",
          username: "playerOne",
          email: "player1@example.com",
          discordId: "discord#0001",
          role: "competitor",
          status: "active",
          avatarUrl: "https://cdn.example.com/avatars/1.png",
          valorantElo: null,
          cs2Rating: null,
          matchesPlayed: 0,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("filters players by status when provided", async () => {
    const countSpy = vi
      .spyOn(defaultPlayerRepository, "countPlayers")
      .mockResolvedValue(0);
    const listSpy = vi
      .spyOn(defaultPlayerRepository, "listPlayers")
      .mockResolvedValue([]);

    const response = await server.inject({
      method: "GET",
      url: "/admin/players?status=banned",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(countSpy).toHaveBeenCalledWith({ status: "banned" });
    expect(listSpy).toHaveBeenCalledWith(
      { status: "banned" },
      { skip: 0, take: 25 }
    );
    expect(response.json()).toEqual({
      total: 0,
      page: 1,
      pageSize: 25,
      players: [],
    });
  });

  it("returns detailed player profile from Prisma", async () => {
    const mockUser = {
      id: "player-42",
      username: "detailPlayer",
      email: "player42@example.com",
      discord: "discord#0042",
      role: "moderator",
      image: "https://cdn.example.com/avatar42.png",
      createdAt: new Date("2024-01-05T00:00:00.000Z"),
      updatedAt: new Date("2024-01-05T00:00:00.000Z"),
      emailVerified: new Date("2024-01-06T00:00:00.000Z"),
      status: "banned",
      userBadges: [
        {
          badge: {
            id: "badge123",
            label: "Founder",
            variant: "default",
            icon: "star",
          },
        },
      ],
      sessions: [
        {
          expires: new Date("2024-02-01T10:00:00.000Z"),
        },
      ],
      playerRoles: [
        {
          id: "role1",
          role: "moderator",
          isPrimary: true,
          reason: "Promotion",
          assignedBy: "admin-test-id",
          createdAt: new Date("2024-01-10T00:00:00.000Z"),
          assignedByUser: {
            id: "admin-test-id",
            username: "AdminUser",
          },
        },
      ],
      playerBans: [
        {
          id: "ban1",
          type: "temporary",
          status: "active",
          reason: "Toxicity",
          durationDays: 7,
          banFromAllHubs: true,
          banFromDiscord: false,
          startsAt: new Date("2024-02-10T00:00:00.000Z"),
          endsAt: new Date("2024-02-17T00:00:00.000Z"),
        },
      ],
      auditLogs: [
        {
          id: "audit1",
          action: "role_change",
          reason: "RBAC adjustment",
          metadata: { foo: "bar" },
          createdAt: new Date("2024-02-02T00:00:00.000Z"),
          actor: {
            id: "admin-test-id",
            username: "AdminUser",
          },
        },
      ],
    };
    const findDetailSpy = vi
      .spyOn(defaultPlayerRepository, "findPlayerDetail")
      .mockResolvedValue(mockUser as PlayerDetailRow);

    const response = await server.inject({
      method: "GET",
      url: "/admin/players/player-42",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(findDetailSpy).toHaveBeenCalledWith("player-42");
    expect(response.json()).toEqual({
      id: "player-42",
      username: "detailPlayer",
      email: "player42@example.com",
      discordId: "discord#0042",
      role: "moderator",
      status: "banned",
      avatarUrl: "https://cdn.example.com/avatar42.png",
      createdAt: "2024-01-05T00:00:00.000Z",
      lastLogin: "2024-02-01T10:00:00.000Z",
      stats: {
        valorant: {
          elo: 2125,
          rating2: 9.5,
          matches: 12,
          winRate: 58.3,
          acs: 210.5,
          kd: 1.25,
          hsPercent: 22.4,
        },
        cs2: null,
      },
      recentMatches: [
        {
          matchId: "match-1",
          startedAt: "2025-01-01T00:00:00.000Z",
          game: "valorant",
          map: "Ascent",
          result: "win",
          team: "alpha",
          ratingDelta: 15,
          kills: 24,
          deaths: 16,
          assists: 8,
          acs: 230,
        },
      ],
      ratingHistory: [
        {
          id: "history-1",
          date: "2025-01-01T00:00:00.000Z",
          game: "valorant",
          rating: 2125,
          delta: 15,
          matchId: "match-1",
        },
      ],
      statsLookbackDays: 30,
      badges: [
        {
          id: "badge123",
          label: "Founder",
          variant: "default",
          icon: "star",
        },
      ],
      roles: [
        {
          id: "role1",
          role: "moderator",
          isPrimary: true,
          reason: "Promotion",
          assignedBy: {
            id: "admin-test-id",
            username: "AdminUser",
          },
          assignedAt: "2024-01-10T00:00:00.000Z",
        },
      ],
      activeBan: {
        id: "ban1",
        type: "temporary",
        status: "active",
        reason: "Toxicity",
        durationDays: 7,
        banFromAllHubs: true,
        banFromDiscord: false,
        startsAt: "2024-02-10T00:00:00.000Z",
        endsAt: "2024-02-17T00:00:00.000Z",
      },
      auditLog: [
        {
          id: "audit1",
          action: "role_change",
          reason: "RBAC adjustment",
          metadata: { foo: "bar" },
          createdAt: "2024-02-02T00:00:00.000Z",
          actor: {
            id: "admin-test-id",
            username: "AdminUser",
          },
        },
      ],
    });
    expect(playerStats.getPlayerStatsSnapshot).toHaveBeenCalledWith(
      "player-42"
    );
  });

  it("returns 404 when player detail is missing", async () => {
    vi.spyOn(defaultPlayerRepository, "findPlayerDetail").mockResolvedValue(
      null
    );

    const response = await server.inject({
      method: "GET",
      url: "/admin/players/missing-player",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Player missing-player not found",
      code: "PLAYER_NOT_FOUND",
      details: { playerId: "missing-player" },
    });
  });

  it("updates player roles and logs audit", async () => {
    const transactionSpy = vi
      .spyOn(defaultPlayerRepository, "transaction")
      .mockImplementation(
        async (cb: (tx: Prisma.TransactionClient) => Promise<void>) => {
          await cb({} as Prisma.TransactionClient);
        }
      );
    const replaceRolesSpy = vi
      .spyOn(defaultPlayerRepository, "replaceRoles")
      .mockResolvedValue();
    const logAuditSpy = vi
      .spyOn(defaultPlayerRepository, "logAudit")
      .mockResolvedValue();
    vi.spyOn(defaultPlayerRepository, "listRoles").mockResolvedValue([
      {
        id: "role-primary",
        role: "organizer",
        isPrimary: true,
        reason: "Needed for tournament ops",
        assignedBy: "admin-test-id",
        createdAt: new Date("2024-03-01T00:00:00.000Z"),
        assignedByUser: {
          id: "admin-test-id",
          username: "AdminUser",
        },
      },
    ] as PlayerRoleRow[]);

    const response = await server.inject({
      method: "PUT",
      url: "/admin/players/player-77/roles",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        roles: ["organizer"],
        primaryRole: "organizer",
        reason: "Needed for tournament ops",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      playerId: "player-77",
      roles: [
        {
          id: "role-primary",
          role: "organizer",
          isPrimary: true,
          reason: "Needed for tournament ops",
          assignedBy: {
            id: "admin-test-id",
            username: "AdminUser",
          },
          assignedAt: "2024-03-01T00:00:00.000Z",
        },
      ],
    });
    expect(transactionSpy).toHaveBeenCalled();
    expect(replaceRolesSpy).toHaveBeenCalledWith(expect.any(Object), {
      playerId: "player-77",
      roles: ["organizer"],
      primaryRole: "organizer",
      reason: "Needed for tournament ops",
      actorId: "admin-test-id",
    });
    expect(logAuditSpy).toHaveBeenCalled();
  });

  it("creates a ban and updates user status", async () => {
    const banCreatedAt = new Date("2024-03-05T00:00:00.000Z");
    const banEndsAt = new Date("2024-03-12T00:00:00.000Z");
    vi.spyOn(defaultPlayerRepository, "transaction").mockImplementation(
      async (cb: (tx: Prisma.TransactionClient) => Promise<void>) =>
        cb({} as Prisma.TransactionClient)
    );
    const expireSpy = vi
      .spyOn(defaultPlayerRepository, "expireActiveBans")
      .mockResolvedValue();
    const createBanSpy = vi
      .spyOn(defaultPlayerRepository, "createBan")
      .mockResolvedValue({
        id: "ban-new",
        type: "temporary",
        status: "active",
        reason: "Cheating",
        durationDays: 7,
        banFromAllHubs: true,
        banFromDiscord: false,
        startsAt: banCreatedAt,
        endsAt: banEndsAt,
      } as PlayerBanRow);
    const updateStatusSpy = vi
      .spyOn(defaultPlayerRepository, "updateUserStatus")
      .mockResolvedValue();
    const logAuditSpy = vi
      .spyOn(defaultPlayerRepository, "logAudit")
      .mockResolvedValue();

    const response = await server.inject({
      method: "POST",
      url: "/admin/players/player-88/ban",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        type: "temporary",
        durationDays: 7,
        reason: "Cheating",
        banFromAllHubs: true,
        banFromDiscord: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      playerId: "player-88",
      ban: {
        id: "ban-new",
        type: "temporary",
        status: "active",
        reason: "Cheating",
        durationDays: 7,
        banFromAllHubs: true,
        banFromDiscord: false,
        startsAt: "2024-03-05T00:00:00.000Z",
        endsAt: "2024-03-12T00:00:00.000Z",
      },
    });
    expect(expireSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "player-88",
      expect.any(Date)
    );
    expect(createBanSpy).toHaveBeenCalled();
    expect(updateStatusSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "player-88",
      "banned"
    );
    expect(logAuditSpy).toHaveBeenCalled();
  });

  it("lifts an active ban", async () => {
    vi.spyOn(defaultPlayerRepository, "findActiveBan").mockResolvedValue({
      id: "ban-active",
      type: "permanent",
      status: "active",
      reason: "Toxicity",
      durationDays: null,
      banFromAllHubs: true,
      banFromDiscord: true,
      startsAt: new Date("2024-03-01T00:00:00.000Z"),
      endsAt: null,
    } as PlayerBanRow);
    vi.spyOn(defaultPlayerRepository, "transaction").mockImplementation(
      async (cb: (tx: Prisma.TransactionClient) => Promise<void>) =>
        cb({} as Prisma.TransactionClient)
    );
    const liftBanSpy = vi
      .spyOn(defaultPlayerRepository, "liftBan")
      .mockResolvedValue();
    const updateStatusSpy = vi
      .spyOn(defaultPlayerRepository, "updateUserStatus")
      .mockResolvedValue();
    const logAuditSpy = vi
      .spyOn(defaultPlayerRepository, "logAudit")
      .mockResolvedValue();

    const response = await server.inject({
      method: "POST",
      url: "/admin/players/player-99/unban",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        reason: "Appeal approved",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      playerId: "player-99",
      status: "active",
    });
    expect(liftBanSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "ban-active",
      expect.any(Date),
      expect.any(Date)
    );
    expect(updateStatusSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "player-99",
      "active"
    );
    expect(logAuditSpy).toHaveBeenCalled();
  });

  it("returns 400 when no active ban exists to lift", async () => {
    vi.spyOn(defaultPlayerRepository, "findActiveBan").mockResolvedValue(null);

    const response = await server.inject({
      method: "POST",
      url: "/admin/players/player-100/unban",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        reason: "No-op",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "Player player-100 has no active ban",
      code: "NO_ACTIVE_BAN",
      details: { playerId: "player-100" },
    });
  });
});
