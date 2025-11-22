import { prisma } from "@trayb/db";
import type { Prisma } from "@trayb/db";
import { auditSelectors } from "../../../utils/prisma-selectors.js";

// Use shared selector from utilities
const auditLogSelect = auditSelectors.detailed;

export type AuditLogRow = Prisma.PlayerAuditLogGetPayload<{
  select: typeof auditLogSelect;
}>;

export interface AuditRepository {
  count(where: Prisma.PlayerAuditLogWhereInput): Promise<number>;
  list(
    where: Prisma.PlayerAuditLogWhereInput,
    options: { skip: number; take: number }
  ): Promise<AuditLogRow[]>;
}

export const auditRepository: AuditRepository = {
  count(where) {
    return prisma.playerAuditLog.count({ where });
  },
  list(where, options) {
    return prisma.playerAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
      select: auditLogSelect,
    });
  },
};
