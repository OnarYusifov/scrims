import type { FastifyInstance } from "fastify";
import { adminAuditLogActionEnum } from "./schema.js";
import adminAuthPlugin from "../../../plugins/admin-auth.js";
import { createAdminAuditController } from "./controller.js";

export async function registerAdminAuditModule(fastify: FastifyInstance) {
  await fastify.register(adminAuthPlugin);
  const controller = createAdminAuditController();

  fastify.get(
    "/admin/audit-logs",
    {
      schema: {
        tags: ["admin-audit"],
        security: [{ BearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            pageSize: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 25,
            },
            userId: { type: "string" },
            actorId: { type: "string" },
            action: { type: "string", enum: adminAuditLogActionEnum.options },
            search: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              total: { type: "integer" },
              page: { type: "integer" },
              pageSize: { type: "integer" },
              logs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    action: {
                      type: "string",
                      enum: adminAuditLogActionEnum.options,
                    },
                    reason: { type: ["string", "null"] },
                    metadata: {
                      anyOf: [
                        { type: "object", additionalProperties: true },
                        { type: "null" },
                      ],
                    },
                    createdAt: { type: "string" },
                    user: {
                      type: ["object", "null"],
                      properties: {
                        id: { type: "string" },
                        username: { type: "string" },
                        email: { type: "string" },
                      },
                    },
                    actor: {
                      type: ["object", "null"],
                      properties: {
                        id: { type: "string" },
                        username: { type: "string" },
                        email: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    controller.listAuditLogs
  );
}
