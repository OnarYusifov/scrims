import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "@trayb/db";
import { z } from "zod";
import { jwtVerify } from "jose";

/**
 * Extended FastifyRequest with user payload from JWT
 */
interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
    [key: string]: unknown;
  };
}

const unlinkSchema = z.object({
  provider: z.enum(["google", "discord", "steam"]),
});

const badgesQuerySchema = z.object({
  userId: z.string().optional(),
});

const byEmailQuerySchema = z.object({
  email: z.string().email(),
});

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
}

export async function registerUserModule(fastify: FastifyInstance) {
  fastify.addHook("preHandler", async (request, reply) => {
    if (
      request.url.includes("/user/badges") &&
      !request.headers.authorization
    ) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const secret = getJwtSecret();

    try {
      const decoded = await jwtVerify(token, secret);
      (request as AuthenticatedRequest).user = decoded.payload as {
        userId: string;
        email: string;
        [key: string]: unknown;
      };
    } catch {
      return reply.code(401).send({ error: "Invalid token" });
    }
  });

  fastify.get("/user/me/linked-accounts", async (request) => {
    const userId = (request as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const [accounts, user] = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        select: { provider: true, providerAccountId: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      }),
    ]);

    return {
      accounts,
      hasPassword: !!user?.password,
    };
  });

  fastify.post("/user/me/unlink", async (request, reply) => {
    const userId = (request as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    const { provider } = unlinkSchema.parse(request.body);

    const account = await prisma.account.findFirst({
      where: { userId, provider },
    });

    if (!account) {
      return reply.code(400).send({ error: "Account not linked" });
    }

    const [otherAccounts, user] = await Promise.all([
      prisma.account.count({
        where: {
          userId,
          NOT: { provider },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, discord: true },
      }),
    ]);

    const hasPassword = !!user?.password;
    const hasAnotherProvider = otherAccounts > 0;

    if (!hasPassword && !hasAnotherProvider) {
      return reply.code(400).send({
        error:
          "Cannot unlink the only sign-in method. Add a password or link another provider first.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.account.delete({ where: { id: account.id } });
      if (provider === "discord" && user?.discord) {
        await tx.user.update({
          where: { id: userId },
          data: { discord: null },
        });
      }
    });

    return { success: true };
  });

  fastify.get("/user/badges", async (request, reply) => {
    const query = badgesQuerySchema.parse(request.query);
    const currentUserId = (request as AuthenticatedRequest).user?.userId;
    const targetUserId = query.userId || currentUserId;

    if (!targetUserId) {
      return { badges: [] };
    }

    if (query.userId && currentUserId && query.userId !== currentUserId) {
      return reply.code(403).send({ error: "Unauthorized" });
    }

    const userBadges = await prisma.userBadge.findMany({
      where: { userId: targetUserId },
      include: {
        badge: {
          select: {
            id: true,
            label: true,
            variant: true,
            icon: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 3,
    });

    const badges = userBadges.map((ub) => ({
      id: ub.badge.id,
      label: ub.badge.label,
      variant: ub.badge.variant,
      icon: ub.badge.icon,
    }));

    return { badges };
  });

  fastify.get("/user/by-email", async (request, reply) => {
    const { email } = byEmailQuerySchema.parse(request.query);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    return user;
  });
}
