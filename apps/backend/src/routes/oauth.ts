import type { FastifyInstance } from "fastify";
import { prisma } from "@trayb/db";
import { z } from "zod";

// Schema for the OAuth callback body
const oauthCallbackSchema = z.object({
    user: z.object({
        email: z.string().email(),
        name: z.string().optional(),
        image: z.string().optional(),
    }),
    account: z.object({
        provider: z.string(),
        providerAccountId: z.string(),
        type: z.string(),
        access_token: z.string().optional().nullable(),
        refresh_token: z.string().optional().nullable(),
        expires_at: z.number().optional().nullable(),
        token_type: z.string().optional().nullable(),
        scope: z.string().optional().nullable(),
        id_token: z.string().optional().nullable(),
        session_state: z.string().optional().nullable(),
    }),
});

export async function oauthRoutes(fastify: FastifyInstance) {
    fastify.post("/auth/oauth-callback", {
        schema: {
            tags: ["auth"],
            summary: "Handle OAuth callback (create/link user)",
            body: {
                type: "object",
                properties: {
                    user: {
                        type: "object",
                        properties: {
                            email: { type: "string" },
                            name: { type: "string" },
                            image: { type: "string" },
                        },
                        required: ["email"],
                    },
                    account: {
                        type: "object",
                        properties: {
                            provider: { type: "string" },
                            providerAccountId: { type: "string" },
                            type: { type: "string" },
                            access_token: { type: "string", nullable: true },
                            refresh_token: { type: "string", nullable: true },
                            expires_at: { type: "number", nullable: true },
                            token_type: { type: "string", nullable: true },
                            scope: { type: "string", nullable: true },
                            id_token: { type: "string", nullable: true },
                            session_state: { type: "string", nullable: true },
                        },
                        required: ["provider", "providerAccountId", "type"],
                    },
                },
                required: ["user", "account"],
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        userId: { type: "string" },
                        isNewUser: { type: "boolean" },
                        user: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                username: { type: "string" },
                                email: { type: "string" },
                                role: { type: "string" },
                            },
                        },
                        token: { type: "string" },
                    },
                },
                400: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { user, account } = oauthCallbackSchema.parse(request.body);

            // Log OAuth attempt
            fastify.log.info(`[auth] OAuth callback: provider=${account.provider}, email=${user.email}`);

            // Try to find an existing user by email
            const existingUser = await prisma.user.findUnique({
                where: { email: user.email },
            });

            // If user with this email already exists, link the account
            if (existingUser) {
                // Ensure email is verified
                if (!existingUser.emailVerified) {
                    await prisma.user.update({
                        where: { id: existingUser.id },
                        data: { emailVerified: new Date() },
                    });
                }

                // Check if account already exists
                const existingAccount = await prisma.account.findFirst({
                    where: {
                        provider: account.provider,
                        providerAccountId: account.providerAccountId,
                    },
                });

                if (existingAccount) {
                    // Account exists - check if linked to correct user
                    if (existingAccount.userId !== existingUser.id) {
                        // Reassign to correct user
                        await prisma.account.update({
                            where: { id: existingAccount.id },
                            data: { userId: existingUser.id },
                        });
                    }
                } else {
                    // Create account linked to existing user
                    await prisma.account.create({
                        data: {
                            userId: existingUser.id,
                            type: account.type,
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                            access_token: account.access_token,
                            refresh_token: account.refresh_token,
                            expires_at: account.expires_at,
                            token_type: account.token_type,
                            scope: account.scope,
                            id_token: account.id_token,
                            session_state: account.session_state,
                        },
                    });
                }


                // Fetch complete user data for response
                const completeUser = await prisma.user.findUnique({
                    where: { id: existingUser.id },
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        role: true,
                    },
                });

                // Generate JWT token for backend API calls
                const { SignJWT } = await import("jose");
                const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
                const token = await new SignJWT({
                    userId: existingUser.id,
                    email: existingUser.email,
                    role: existingUser.role,
                })
                    .setProtectedHeader({ alg: "HS256" })
                    .setExpirationTime("7d")
                    .sign(secret);

                return {
                    success: true,
                    userId: existingUser.id,
                    isNewUser: false,
                    user: completeUser,
                    token,
                };
            }

            // No existing user - create new user
            // Generate username
            const emailPrefix = user.email.split("@")[0] || "user";
            let username = (user.name || emailPrefix)
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "")
                .substring(0, 20);

            if (!username || username.length < 3) {
                username = emailPrefix.substring(0, 20);
            }

            // Ensure username is unique
            let finalUsername = username;
            let counter = 0;
            while (counter < 100) {
                const existing = await prisma.user.findUnique({
                    where: { username: finalUsername },
                });
                if (!existing) break;
                finalUsername = `${username}${Math.floor(Math.random() * 1000)}`;
                counter++;
            }

            // Create user
            const newUser = await prisma.user.create({
                data: {
                    username: finalUsername,
                    email: user.email,
                    emailVerified: new Date(),
                    role: "user",
                    discord: account.provider === "discord" ? user.name : undefined,
                },
            });

            // Create account
            await prisma.account.create({
                data: {
                    userId: newUser.id,
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                    session_state: account.session_state,
                },
            });

            // Generate JWT token for new user
            const { SignJWT } = await import("jose");
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
            const token = await new SignJWT({
                userId: newUser.id,
                email: newUser.email,
                role: newUser.role,
            })
                .setProtectedHeader({ alg: "HS256" })
                .setExpirationTime("7d")
                .sign(secret);

            return {
                success: true,
                userId: newUser.id,
                isNewUser: true,
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    role: newUser.role,
                },
                token,
            };

        } catch (error) {
            fastify.log.error(error);
            return reply.code(400).send({ error: "OAuth callback failed" });
        }
    });
}
