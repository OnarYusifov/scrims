import type { FastifyInstance } from "fastify";
import { prisma } from "@trayb/db";
import { games } from "@trayb/types";
import {
  adminSettingsSystemSchema,
  adminSettingsMapsSchema,
  adminSettingsWeightProfilesSchema,
  adminMapSchema,
} from "./schema.js";
import adminAuthPlugin from "../../../plugins/admin-auth.js";

type SettingsKey =
  | "settings.system"
  | "settings.maps"
  | "settings.weightProfiles";

const defaultSystemSettings = {
  maintenanceMode: false,
  supportEmail: "support@trayb.az",
  discordInviteUrl: "https://discord.gg/traybaz",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  announcements: {
    enabled: false,
    message: "",
    severity: "info" as const,
  },
};

const defaultMapsSettings = {
  maps: [
    {
      id: "split",
      name: "Split",
      game: "valorant",
      enabled: true,
      rotationWeight: 10,
    },
    {
      id: "ascent",
      name: "Ascent",
      game: "valorant",
      enabled: true,
      rotationWeight: 10,
    },
  ],
};

const defaultWeightProfilesSettings = {
  profiles: [
    {
      id: "default",
      name: "Default Balance",
      isDefault: true,
      weights: {
        aim: 0.4,
        teamplay: 0.3,
        mapControl: 0.3,
      },
    },
  ],
};

export async function registerAdminSettingsModule(fastify: FastifyInstance) {
  await fastify.register(adminAuthPlugin);

  fastify.get(
    "/admin/settings/system",
    {
      schema: {
        tags: ["admin-settings"],
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              maintenanceMode: { type: "boolean" },
              supportEmail: { type: "string" },
              discordInviteUrl: { type: "string" },
              frontendUrl: { type: "string" },
              announcements: {
                type: "object",
                properties: {
                  enabled: { type: "boolean" },
                  message: { type: "string" },
                  severity: {
                    type: "string",
                    enum: ["info", "warning", "critical"],
                  },
                },
              },
            },
          },
        },
      },
    },
    async () => {
      const settings = await getSettings(
        "settings.system",
        defaultSystemSettings
      );
      return adminSettingsSystemSchema.parse(settings);
    }
  );

  fastify.put(
    "/admin/settings/system",
    {
      schema: {
        tags: ["admin-settings"],
        security: [{ BearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            maintenanceMode: { type: "boolean" },
            supportEmail: { type: "string" },
            discordInviteUrl: { type: "string" },
            frontendUrl: { type: "string" },
            announcements: {
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                message: { type: "string" },
                severity: {
                  type: "string",
                  enum: ["info", "warning", "critical"],
                },
              },
            },
          },
        },
        response: {
          200: { $ref: "systemSettingsResponse#" },
        },
      },
    },
    async (request) => {
      const payload = adminSettingsSystemSchema.parse(request.body);
      await upsertSettings(
        "settings.system",
        payload,
        request.admin?.userId ?? "system"
      );
      return payload;
    }
  );

  fastify.addSchema({
    $id: "systemSettingsResponse",
    type: "object",
    properties: {
      maintenanceMode: { type: "boolean" },
      supportEmail: { type: "string" },
      discordInviteUrl: { type: "string" },
      frontendUrl: { type: "string" },
      announcements: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          message: { type: "string" },
          severity: { type: "string", enum: ["info", "warning", "critical"] },
        },
      },
    },
  });

  fastify.get(
    "/admin/settings/maps",
    {
      schema: {
        tags: ["admin-settings"],
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              maps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    game: { type: "string", enum: games },
                    enabled: { type: "boolean" },
                    rotationWeight: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async () => {
      const settings = await getSettings("settings.maps", defaultMapsSettings);
      return adminSettingsMapsSchema.parse(settings);
    }
  );

  fastify.put(
    "/admin/settings/maps",
    {
      schema: {
        tags: ["admin-settings"],
        security: [{ BearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            maps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  game: { type: "string", enum: games },
                  enabled: { type: "boolean" },
                  rotationWeight: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const payload = adminSettingsMapsSchema.parse(request.body);
      // Ensure unique IDs and positive rotation weights
      payload.maps.forEach((map) => adminMapSchema.parse(map));
      await upsertSettings(
        "settings.maps",
        payload,
        request.admin?.userId ?? "system"
      );
      return payload;
    }
  );

  fastify.get(
    "/admin/settings/weight-profiles",
    {
      schema: {
        tags: ["admin-settings"],
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              profiles: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    isDefault: { type: "boolean" },
                    weights: {
                      type: "object",
                      additionalProperties: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async () => {
      const settings = await getSettings(
        "settings.weightProfiles",
        defaultWeightProfilesSettings
      );
      return adminSettingsWeightProfilesSchema.parse(settings);
    }
  );

  fastify.put(
    "/admin/settings/weight-profiles",
    {
      schema: {
        tags: ["admin-settings"],
        security: [{ BearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            profiles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  isDefault: { type: "boolean" },
                  weights: {
                    type: "object",
                    additionalProperties: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const payload = adminSettingsWeightProfilesSchema.parse(request.body);
      await upsertSettings(
        "settings.weightProfiles",
        payload,
        request.admin?.userId ?? "system"
      );
      return payload;
    }
  );
}

export async function fetchAdminSetting(key: SettingsKey) {
  return prisma.adminSetting.findUnique({ where: { key } });
}

export async function saveAdminSetting(
  key: SettingsKey,
  value: unknown,
  adminId: string
) {
  return prisma.adminSetting.upsert({
    where: { key },
    create: {
      key,
      value,
      updatedBy: adminId,
    },
    update: {
      value,
      updatedBy: adminId,
    },
  });
}

async function getSettings<T>(key: SettingsKey, defaults: T): Promise<T> {
  const record = await fetchAdminSetting(key);
  if (!record) return defaults;
  return (record.value as T) ?? defaults;
}

async function upsertSettings(
  key: SettingsKey,
  value: unknown,
  adminId: string
) {
  await saveAdminSetting(key, value, adminId);
}
