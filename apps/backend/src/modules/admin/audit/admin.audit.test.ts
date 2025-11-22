import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { SignJWT } from "jose";
import {
  closeTestServer,
  createTestServer,
} from "../../../tests/test-server.js";
import { auditRepository } from "./repository.js";

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

describe("Admin audit logs module", () => {
  let server: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    adminToken = await createAdminToken();
    server = await createTestServer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  it("returns paginated audit logs with filters applied", async () => {
    const countSpy = vi.spyOn(auditRepository, "count").mockResolvedValue(1);
    const listSpy = vi.spyOn(auditRepository, "list").mockResolvedValue([
      {
        id: "audit1",
        action: "ban",
        reason: "Cheating",
        metadata: { foo: "bar" },
        createdAt: new Date("2024-03-05T00:00:00.000Z"),
        user: {
          id: "player-1",
          username: "PlayerOne",
          email: "player1@example.com",
        },
        actor: {
          id: "admin-1",
          username: "AdminOne",
          email: "admin1@example.com",
        },
      },
    ]);

    const response = await server.inject({
      method: "GET",
      url: "/admin/audit-logs?page=2&pageSize=10&action=ban&userId=player-1",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(countSpy).toHaveBeenCalledWith({
      action: "ban",
      userId: "player-1",
    });
    expect(listSpy).toHaveBeenCalledWith(
      { action: "ban", userId: "player-1" },
      { skip: 10, take: 10 }
    );
    expect(response.json()).toEqual({
      total: 1,
      page: 2,
      pageSize: 10,
      logs: [
        {
          id: "audit1",
          action: "ban",
          reason: "Cheating",
          metadata: { foo: "bar" },
          createdAt: "2024-03-05T00:00:00.000Z",
          user: {
            id: "player-1",
            username: "PlayerOne",
            email: "player1@example.com",
          },
          actor: {
            id: "admin-1",
            username: "AdminOne",
            email: "admin1@example.com",
          },
        },
      ],
    });
  });

  it("supports search by reason or usernames", async () => {
    vi.spyOn(auditRepository, "count").mockResolvedValue(0);
    const listSpy = vi.spyOn(auditRepository, "list").mockResolvedValue([]);

    const response = await server.inject({
      method: "GET",
      url: "/admin/audit-logs?search=promo&actorId=admin-1",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(listSpy).toHaveBeenCalledWith(
      {
        actorId: "admin-1",
        OR: [
          { reason: { contains: "promo", mode: "insensitive" } },
          { user: { username: { contains: "promo", mode: "insensitive" } } },
          { actor: { username: { contains: "promo", mode: "insensitive" } } },
        ],
      },
      { skip: 0, take: 25 }
    );
    expect(response.json()).toEqual({
      total: 0,
      page: 1,
      pageSize: 25,
      logs: [],
    });
  });
});
