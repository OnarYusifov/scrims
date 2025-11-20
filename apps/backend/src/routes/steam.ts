import type { FastifyInstance } from "fastify";
import { prisma } from "@trayb/db";
import { verifySteamOpenId, getSteamProfile } from "../utils/steam.js";
import { SignJWT } from "jose";
import openid from "openid";

export async function steamRoutes(fastify: FastifyInstance) {
    // Initiate Steam OpenID authentication
    fastify.get("/auth/steam", {
        schema: {
            tags: ["auth"],
            summary: "Initiate Steam OpenID authentication",
            querystring: {
                type: "object",
                properties: {
                    returnUrl: { type: "string" },
                    userId: { type: "string" },
                },
                required: ["returnUrl"],
            },
        },
    }, async (request, reply) => {
        try {
            const params = request.query as { returnUrl: string; userId?: string };
            const { returnUrl } = params;

            if (!returnUrl) {
                return reply.code(400).send({ error: "returnUrl is required" });
            }

            fastify.log.info(`[Steam Init] Starting Steam OpenID flow with returnUrl: ${returnUrl}`);

            // Create relying party for Steam OpenID
            // The returnUrl is where Steam will redirect after authentication
            const relyingParty = new openid.RelyingParty(
                returnUrl, // Return URL (where Steam redirects after auth)
                null, // Realm (optional, inferred from returnUrl)
                true, // Stateless
                false, // Strict
                [] // Extensions
            );

            // Get Steam OpenID provider URL
            const steamProvider = "https://steamcommunity.com/openid";

            // Authenticate with Steam - this generates the redirect URL to Steam
            return new Promise<void>((resolve, reject) => {
                relyingParty.authenticate(steamProvider, false, (error, authUrl) => {
                    if (error) {
                        fastify.log.error("Steam OpenID authentication error:", error);
                        reply.code(500).send({ error: "Failed to initiate Steam authentication" });
                        return reject(error);
                    }

                    if (!authUrl) {
                        fastify.log.error("No auth URL returned from Steam OpenID");
                        reply.code(500).send({ error: "Failed to get Steam authentication URL" });
                        return reject(new Error("No auth URL returned"));
                    }

                    fastify.log.info(`[Steam Init] Redirecting to Steam: ${authUrl}`);
                    // Redirect user to Steam's OpenID login page
                    reply.redirect(authUrl);
                    resolve();
                });
            });
        } catch (error) {
            fastify.log.error("Steam auth initiation error:", error);
            return reply.code(500).send({ error: "Failed to initiate Steam authentication" });
        }
    });

    // Handle Steam OpenID callback
    fastify.get("/auth/steam/callback", {
        schema: {
            tags: ["auth"],
            summary: "Handle Steam OpenID callback",
            querystring: {
                type: "object",
                additionalProperties: true, // Allow all OpenID params
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        userId: { type: "string" },
                        isNewUser: { type: "boolean" },
                        token: { type: "string" },
                    },
                },
                400: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
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
        try {
            const params = request.query as Record<string, string>;
            const userId = params.userId; // Optional: passed if user is already logged in and linking account

            let steamId: string | null = null;

            // Development mode: Skip OpenID verification if manual Steam ID is provided
            // Check for dev=true parameter (works regardless of NODE_ENV)
            const isDev = params.dev === "true";
            const manualSteamId = params.steamId;

            fastify.log.info(`[Steam Callback] isDev=${isDev}, manualSteamId=${manualSteamId}, NODE_ENV=${process.env.NODE_ENV}`);

            if (isDev && manualSteamId) {
                // Validate Steam ID format (should be 17 digits)
                if (!/^\d{17}$/.test(manualSteamId)) {
                    return reply.code(400).send({ error: "Invalid Steam ID format. Steam ID should be 17 digits." });
                }
                steamId = manualSteamId;
                fastify.log.info(`[Dev Mode] Using manual Steam ID: ${steamId}`);
            } else {
                // Production mode: Verify OpenID assertion
                fastify.log.info(`[Production Mode] Verifying OpenID assertion`);
                steamId = await verifySteamOpenId(params);
            }

            if (!steamId) {
                return reply.code(400).send({ error: "Steam authentication failed" });
            }

            // Check if Steam account is already linked
            const existingAccount = await prisma.account.findFirst({
                where: {
                    provider: "steam",
                    providerAccountId: steamId,
                },
                include: {
                    user: true,
                },
            });

            // Scenario 1: User is already logged in (Linking account)
            if (userId) {
                const user = await prisma.user.findUnique({ where: { id: userId } });
                if (!user) {
                    return reply.code(404).send({ error: "User not found" });
                }

                if (existingAccount) {
                    if (existingAccount.userId === userId) {
                        return { success: true, userId, isNewUser: false };
                    }
                    return reply.code(400).send({ error: "Steam account already linked to another user" });
                }

                // Link Steam account
                await prisma.account.create({
                    data: {
                        userId,
                        type: "openid",
                        provider: "steam",
                        providerAccountId: steamId,
                    },
                });

                return { success: true, userId, isNewUser: false };
            }

            // Scenario 2: Login with Steam
            if (existingAccount) {
                const user = existingAccount.user;

                // Generate JWT
                const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
                const token = await new SignJWT({
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                })
                    .setProtectedHeader({ alg: "HS256" })
                    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
                    .sign(secret);

                return {
                    success: true,
                    userId: user.id,
                    isNewUser: false,
                    token,
                };
            }

            // Scenario 3: New user (Registration via Steam)
            // We need to fetch profile to get name/avatar
            const profile = await getSteamProfile(steamId);
            if (!profile) {
                return reply.code(400).send({ error: "Failed to fetch Steam profile" });
            }

            // Create new user
            // Note: Steam doesn't provide email, so we might need to ask for it later
            // For now, we'll generate a placeholder email or require email input
            // But the schema requires email. 
            // Strategy: Create user with placeholder email and require update?
            // Or return specific code to frontend to prompt for email?

            // For now, let's generate a unique placeholder email
            const placeholderEmail = `${steamId}@steam.placeholder`;

            const newUser = await prisma.user.create({
                data: {
                    username: profile.personaname,
                    email: placeholderEmail,
                    emailVerified: new Date(), // Trusted provider
                    image: profile.avatarfull,
                    role: "user",
                },
            });

            await prisma.account.create({
                data: {
                    userId: newUser.id,
                    type: "openid",
                    provider: "steam",
                    providerAccountId: steamId,
                },
            });

            // Generate JWT
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
            const token = await new SignJWT({
                userId: newUser.id,
                email: newUser.email,
                role: newUser.role,
            })
                .setProtectedHeader({ alg: "HS256" })
                .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
                .sign(secret);

            return {
                success: true,
                userId: newUser.id,
                isNewUser: true,
                token,
            };

        } catch (error) {
            fastify.log.error(error);
            return reply.code(400).send({ error: "Steam authentication error" });
        }
    });
}
