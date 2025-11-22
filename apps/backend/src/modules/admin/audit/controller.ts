import type { FastifyRequest } from "fastify";
import { createAdminAuditService } from "./service.js";

export function createAdminAuditController() {
  const service = createAdminAuditService();

  return {
    listAuditLogs: async (request: FastifyRequest) => {
      return service.listLogs(request.query);
    },
  };
}
