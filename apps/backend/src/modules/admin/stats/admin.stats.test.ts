import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { SignJWT } from "jose";
import type { FastifyInstance } from "fastify";
import {
  closeTestServer,
  createTestServer,
} from "../../../tests/test-server.js";

const TEST_JWT_SECRET = "admin-stats-secret";
const encoder = new TextEncoder();

async function createAdminToken() {
  return new SignJWT({
    userId: "admin-analytics",
    email: "admin@trayb.az",
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(encoder.encode(TEST_JWT_SECRET));
}

describe("Admin stats module", () => {
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

  it("returns match analytics aggregated from Prisma rows", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/admin/stats/match-analytics?game=valorant",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.totals.matches).toBeGreaterThanOrEqual(0);
    expect(payload.outcomes).toHaveProperty("alpha");
    expect(Array.isArray(payload.maps)).toBe(true);
    if (payload.maps.length > 0) {
      expect(payload.maps[0]).toHaveProperty("map");
    }
    expect(Array.isArray(payload.topPerformers)).toBe(true);
  });

  it("returns ELO distribution buckets for latest player snapshots", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/admin/stats/elo-distribution?game=valorant",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.summary.totalPlayers).toBeGreaterThanOrEqual(0);
    expect(payload.summary.max).toBeGreaterThanOrEqual(
      payload.summary.min ?? 0
    );
    expect(Array.isArray(payload.buckets)).toBe(true);
  });

  it("returns overview KPIs combining player + match data", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/admin/stats/overview?game=valorant",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.players).toMatchObject({
      total: expect.any(Number),
      active: expect.any(Number),
      banned: expect.any(Number),
      newThisWeek: expect.any(Number),
    });
    expect(payload.matches).toHaveProperty("matches");
  });
});
