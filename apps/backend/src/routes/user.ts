import type { FastifyInstance } from "fastify";
import { prisma } from "@trayb/db";
import { z } from "zod";
import { jwtVerify } from "jose";

export async function userRoutes(fastify: FastifyInstance) {
    // Middleware to verify JWT
    fastify.addHook("preHandler", async (request, reply) => {
        // Skip for public routes if any (badges might be public?)
        if (request.url.includes("/user/badges") && !request.headers.authorization) {
            return;
        }

        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return reply.code(401).send({ error: "Unauthorized" });
        }

        const token = authHeader.substring(7);
        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || "your-secret-key"
        );

        try {
            const decoded = await jwtVerify(token, secret);
            (request as any).user = decoded.payload;
        } catch (err) {
            return reply.code(401).send({ error: "Invalid token" });
        }
    });

    // Get linked accounts
    fastify.get("/user/me/linked-accounts", {
        schema: {
            tags: ["user"],
            summary: "Get linked accounts for current user",
            response: {
                200: {
                    type: "object",
                    properties: {
                        accounts: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    provider: { type: "string" },
                                    providerAccountId: { type: "string" },
                                },
                            },
                        },
                        hasPassword: { type: "boolean" },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const userId = (request as any).user.userId;

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

    // Unlink account
    fastify.post("/user/me/unlink", {
        schema: {
            tags: ["user"],
            summary: "Unlink an account provider",
            body: {
                type: "object",
                properties: {
                    provider: { type: "string", enum: ["google", "discord", "steam"] },
                },
                required: ["provider"],
            },
            response: {
                200: {
                    type: "object",
                    properties: { success: { type: "boolean" } },
                },
                400: {
                    type: "object",
                    properties: { error: { type: "string" } },
                },
            },
        },
    }, async (request, reply) => {
        const userId = (request as any).user.userId;
        const { provider } = request.body as { provider: string };

        const account = await prisma.account.findFirst({
            where: { userId, provider },
        });

        if (!account) {
            return reply.code(400).send({ error: "Account not linked" });
        }

        // Ensure user is not left without any auth method
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
                error: "Cannot unlink the only sign-in method. Add a password or link another provider first.",
            });
        }

        // Delete the provider account
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

    // Get user badges
    fastify.get("/user/badges", {
        schema: {
            tags: ["user"],
            summary: "Get user badges",
            querystring: {
                type: "object",
                properties: {
                    userId: { type: "string" },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        badges: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    label: { type: "string" },
                                    variant: { type: "string" },
                                    icon: { type: "string", nullable: true },
                                },
                            },
                        },
                    },
                },
                403: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const query = request.query as { userId?: string };
        const currentUserId = (request as any).user?.userId;
        const targetUserId = query.userId || currentUserId;

        if (!targetUserId) {
            return { badges: [] };
        }

        // If userId is provided, check if user is authorized to view (currently only own badges)
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

    // Get user by email (for OAuth session population)
    fastify.get("/user/by-email", {
        schema: {
            tags: ["user"],
            summary: "Get user by email",
            querystring: {
                type: "object",
                properties: {
                    email: { type: "string", format: "email" },
                },
                required: ["email"],
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        username: { type: "string" },
                        email: { type: "string" },
                        role: { type: "string" },
                    },
                },
                404: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const query = request.query as { email: string };

        const user = await prisma.user.findUnique({
            where: { email: query.email },
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
