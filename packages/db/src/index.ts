import { PrismaClient } from "./generated/prisma";
import type { Prisma } from "./generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7: URL is now configured via prisma.config.ts for migrations
// For runtime, we pass datasourceUrl explicitly (runtime supports it even if types don't)
const prismaOptions = {
  datasourceUrl: process.env.DATABASE_URL,
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
} as const;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaOptions as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Export Prisma types explicitly to avoid CommonJS export * issues
export type { Prisma };

