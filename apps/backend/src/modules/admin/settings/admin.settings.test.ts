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
  createTestServer,
  closeTestServer,
} from "../../../tests/test-server.js";
import * as adminSettingsRoutes from "./routes.js";

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

describe("Admin settings module", () => {
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

  it("returns default system settings when none stored", async () => {
    vi.spyOn(adminSettingsRoutes, "fetchAdminSetting").mockResolvedValue(null);
    const response = await server.inject({
      method: "GET",
      url: "/admin/settings/system",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.maintenanceMode).toBe(false);
    expect(body.supportEmail).toBe("support@trayb.az");
  });

  it("upserts system settings", async () => {
    const saveSpy = vi
      .spyOn(adminSettingsRoutes, "saveAdminSetting")
      .mockResolvedValue(undefined);

    const payload = {
      maintenanceMode: true,
      supportEmail: "ops@trayb.az",
      discordInviteUrl: "https://discord.gg/custom",
      frontendUrl: "https://admin.trayb.az",
      announcements: {
        enabled: true,
        message: "Scheduled maintenance",
        severity: "warning",
      },
    };

    const response = await server.inject({
      method: "PUT",
      url: "/admin/settings/system",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(saveSpy).toHaveBeenCalledWith(
      "settings.system",
      payload,
      "admin-test-id"
    );
    expect(response.json()).toEqual(payload);
  });

  it("returns and updates maps settings", async () => {
    vi.spyOn(adminSettingsRoutes, "fetchAdminSetting").mockResolvedValueOnce({
      key: "settings.maps",
      value: {
        maps: [
          {
            id: "split",
            name: "Split",
            game: "valorant",
            enabled: true,
            rotationWeight: 12,
          },
        ],
      },
      updatedAt: new Date(),
      createdAt: new Date(),
      updatedBy: "admin",
    } as {
      key: string;
      value: unknown;
      updatedBy: string | null;
      createdAt: Date;
      updatedAt: Date;
    });

    const response = await server.inject({
      method: "GET",
      url: "/admin/settings/maps",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      maps: [
        {
          id: "split",
          name: "Split",
          game: "valorant",
          enabled: true,
          rotationWeight: 12,
        },
      ],
    });
  });
});
