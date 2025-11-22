import type { FastifyInstance } from "fastify";
import { prisma } from "@trayb/db";
import { verifySteamOpenId, getSteamProfile } from "../../utils/steam.js";
import { SignJWT } from "jose";
import openid from "openid";

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
}

export async function registerSteamModule(fastify: FastifyInstance) {
  fastify.get("/auth/steam", async (request, reply) => {
    try {
      const params = request.query as { returnUrl: string; userId?: string };
      const { returnUrl } = params;

      if (!returnUrl) {
        return reply.code(400).send({ error: "returnUrl is required" });
      }

      fastify.log.info(
        `[Steam Init] Starting Steam OpenID flow with returnUrl: ${returnUrl}`
      );

      const relyingParty = new openid.RelyingParty(
        returnUrl,
        null,
        true,
        false,
        []
      );

      const steamProvider = "https://steamcommunity.com/openid";

      return new Promise<void>((resolve, reject) => {
        relyingParty.authenticate(
          steamProvider,
          false,
          (error: Error | null, authUrl?: string) => {
            if (error) {
              fastify.log.error(
                { err: error },
                "Steam OpenID authentication error"
              );
              reply
                .code(500)
                .send({ error: "Failed to initiate Steam authentication" });
              return reject(error);
            }

            if (!authUrl) {
              fastify.log.error("No auth URL returned from Steam OpenID");
              reply
                .code(500)
                .send({ error: "Failed to get Steam authentication URL" });
              return reject(new Error("No auth URL returned"));
            }

            fastify.log.info(`[Steam Init] Redirecting to Steam: ${authUrl}`);
            reply.redirect(authUrl);
            resolve();
          }
        );
      });
    } catch (error) {
      fastify.log.error({ err: error }, "Steam auth initiation error");
      return reply
        .code(500)
        .send({ error: "Failed to initiate Steam authentication" });
    }
  });

  fastify.get("/auth/steam/callback", async (request, reply) => {
    try {
      const params = request.query as Record<string, string>;
      const userId = params.userId;

      let steamId: string | null = null;
      const isDev = params.dev === "true";
      const manualSteamId = params.steamId;

      fastify.log.info(
        `[Steam Callback] isDev=${isDev}, manualSteamId=${manualSteamId}, NODE_ENV=${process.env.NODE_ENV}`
      );

      if (isDev && manualSteamId) {
        if (!/^\d{17}$/.test(manualSteamId)) {
          return reply.code(400).send({
            error: "Invalid Steam ID format. Steam ID should be 17 digits.",
          });
        }
        steamId = manualSteamId;
        fastify.log.info(`[Dev Mode] Using manual Steam ID: ${steamId}`);
      } else {
        const protocol =
          request.headers["x-forwarded-proto"] ||
          ((request.socket as { encrypted?: boolean }).encrypted
            ? "https"
            : "http");
        const host = request.headers.host || "api.trayb.az";
        const requestUrl = `${protocol}://${host}${request.url}`;

        fastify.log.info(
          `[Production Mode] Verifying OpenID assertion with requestUrl: ${requestUrl}`
        );
        steamId = await verifySteamOpenId(params, requestUrl);
      }

      if (!steamId) {
        return reply.code(400).send({ error: "Steam authentication failed" });
      }

      const existingAccount = await prisma.account.findFirst({
        where: {
          provider: "steam",
          providerAccountId: steamId,
        },
        include: {
          user: true,
        },
      });

      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          return reply.code(404).send({ error: "User not found" });
        }

        if (existingAccount) {
          if (existingAccount.userId === userId) {
            return { success: true, userId, isNewUser: false };
          }
          return reply
            .code(400)
            .send({ error: "Steam account already linked to another user" });
        }

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

      if (existingAccount) {
        const user = existingAccount.user;
        const secret = getJwtSecret();
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

      const profile = await getSteamProfile(steamId);
      if (!profile) {
        return reply.code(400).send({ error: "Failed to fetch Steam profile" });
      }

      const placeholderEmail = `${steamId}@steam.placeholder`;

      const newUser = await prisma.user.create({
        data: {
          username: profile.personaname,
          email: placeholderEmail,
          emailVerified: new Date(),
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

      const secret = getJwtSecret();
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
