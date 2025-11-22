import type { FastifyInstance } from "fastify";
import { prisma } from "@trayb/db";
import { z } from "zod";
import { SignJWT } from "jose";

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

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
}

export async function registerOauthModule(fastify: FastifyInstance) {
  fastify.post("/auth/oauth-callback", async (request, reply) => {
    try {
      const { user, account } = oauthCallbackSchema.parse(request.body);
      fastify.log.info(
        `[auth] OAuth callback: provider=${account.provider}, email=${user.email}`
      );

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        if (!existingUser.emailVerified) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: new Date() },
          });
        }

        const existingAccount = await prisma.account.findFirst({
          where: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        });

        if (existingAccount) {
          if (existingAccount.userId !== existingUser.id) {
            await prisma.account.update({
              where: { id: existingAccount.id },
              data: { userId: existingUser.id },
            });
          }
        } else {
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

        const completeUser = await prisma.user.findUnique({
          where: { id: existingUser.id },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        });

        const secret = getJwtSecret();
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

      const emailPrefix = user.email.split("@")[0] || "user";
      let username = (user.name || emailPrefix)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .substring(0, 20);

      if (!username || username.length < 3) {
        username = emailPrefix.substring(0, 20);
      }

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

      const newUser = await prisma.user.create({
        data: {
          username: finalUsername,
          email: user.email,
          emailVerified: new Date(),
          role: "user",
          discord: account.provider === "discord" ? user.name : undefined,
        },
      });

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

      const secret = getJwtSecret();
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
