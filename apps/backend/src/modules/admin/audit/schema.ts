import { z } from "zod";

export const adminAuditLogActionEnum = z.enum([
  "role_change",
  "ban",
  "unban",
  "note",
]);

export const adminAuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  userId: z.string().optional(),
  actorId: z.string().optional(),
  action: adminAuditLogActionEnum.optional(),
  search: z.string().optional(),
});

const adminAuditLogUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
});

export const adminAuditLogEntrySchema = z.object({
  id: z.string(),
  action: adminAuditLogActionEnum,
  reason: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
  createdAt: z.string(),
  user: adminAuditLogUserSchema.nullable(),
  actor: adminAuditLogUserSchema.nullable(),
});

export const adminAuditLogListResponseSchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  logs: z.array(adminAuditLogEntrySchema),
});

export type AdminAuditLogAction = z.infer<typeof adminAuditLogActionEnum>;
export type AdminAuditLogQuery = z.infer<typeof adminAuditLogQuerySchema>;
