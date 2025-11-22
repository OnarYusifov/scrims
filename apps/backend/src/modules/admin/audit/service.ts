import type { Prisma } from "@trayb/db";
import {
  adminAuditLogEntrySchema,
  adminAuditLogListResponseSchema,
  adminAuditLogQuerySchema,
} from "./schema.js";
import {
  auditRepository,
  type AuditRepository,
  type AuditLogRow,
} from "./repository.js";

export interface AdminAuditServiceDeps {
  repository?: AuditRepository;
}

const DEFAULT_DEPS: Required<AdminAuditServiceDeps> = {
  repository: auditRepository,
};

export function createAdminAuditService(
  deps: AdminAuditServiceDeps = DEFAULT_DEPS
) {
  const repository = deps.repository ?? DEFAULT_DEPS.repository;

  async function listLogs(rawQuery: unknown) {
    const query = adminAuditLogQuerySchema.parse(rawQuery);
    const where = buildWhere(query);

    const [total, logs] = await Promise.all([
      repository.count(where),
      repository.list(where, {
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return adminAuditLogListResponseSchema.parse({
      total,
      page: query.page,
      pageSize: query.pageSize,
      logs: logs.map(mapAuditLogEntry),
    });
  }

  return {
    listLogs,
  };
}

function buildWhere(query: {
  userId?: string;
  actorId?: string;
  action?: string;
  search?: string;
}): Prisma.PlayerAuditLogWhereInput {
  const where: Prisma.PlayerAuditLogWhereInput = {};

  if (query.userId) {
    where.userId = query.userId;
  }
  if (query.actorId) {
    where.actorId = query.actorId;
  }
  if (query.action) {
    where.action = query.action;
  }
  if (query.search) {
    const search = query.search.trim();
    where.OR = [
      { reason: { contains: search, mode: "insensitive" } },
      { user: { username: { contains: search, mode: "insensitive" } } },
      { actor: { username: { contains: search, mode: "insensitive" } } },
    ];
  }

  return where;
}

function mapAuditLogEntry(entry: AuditLogRow) {
  return adminAuditLogEntrySchema.parse({
    id: entry.id,
    action: entry.action,
    reason: entry.reason ?? null,
    metadata: toPlainMetadata(entry.metadata),
    createdAt: entry.createdAt.toISOString(),
    user: entry.user
      ? {
          id: entry.user.id,
          username: entry.user.username,
          email: entry.user.email,
        }
      : null,
    actor: entry.actor
      ? {
          id: entry.actor.id,
          username: entry.actor.username,
          email: entry.actor.email,
        }
      : null,
  });
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
