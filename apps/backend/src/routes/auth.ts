import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:4001/api/core-auth/discord/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export default async function authRoutes(fastify: FastifyInstance) {
  // Discord OAuth - Initiate
  fastify.get('/discord', async (request: FastifyRequest, reply: FastifyReply) => {
    const authUrl = new URL('https://discord.com/api/oauth2/authorize');
    authUrl.searchParams.set('client_id', DISCORD_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'identify email');

    reply.redirect(authUrl.toString());
  });

  // Discord OAuth - Callback
  fastify.get('/discord/callback', async (request: FastifyRequest<{
    Querystring: { code?: string; error?: string }
  }>, reply: FastifyReply) => {
    const { code, error } = request.query;

    if (error || !code) {
      return reply.redirect(`${FRONTEND_URL}/login?error=access_denied`);
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: DISCORD_REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json() as DiscordTokenResponse;

      // Fetch user info from Discord
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user info');
      }

      const discordUser = await userResponse.json() as DiscordUser;

      // Check if user is whitelisted (for now, allow all - you can add whitelist logic here)
      // const isWhitelisted = await checkWhitelist(discordUser.id);
      // if (!isWhitelisted) {
      //   return reply.redirect(`${FRONTEND_URL}/login?error=not_whitelisted`);
      // }

      // Create or update user in database
      const user = await prisma.user.upsert({
        where: { discordId: discordUser.id },
        update: {
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar,
          email: discordUser.email,
          lastLogin: new Date(),
        },
        create: {
          discordId: discordUser.id,
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar,
          email: discordUser.email,
          role: 'USER',
          isWhitelisted: true, // TODO: Implement proper whitelist check
          lastLogin: new Date(),
        },
      });

      // Check if user is banned
      if (user.isBanned) {
        return reply.redirect(`${FRONTEND_URL}/login?error=banned`);
      }

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        discordId: user.discordId,
        role: user.role,
      });

      // Set JWT as httpOnly cookie for security
      reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      // Also redirect with token in query for initial auth (frontend will save to localStorage as backup)
      reply.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      fastify.log.error(error);
      return reply.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
    }
  });

  // Get current user
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
  }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          discordId: true,
          username: true,
          discriminator: true,
          avatar: true,
          email: true,
          role: true,
          isWhitelisted: true,
          elo: true,
          peakElo: true,
          matchesPlayed: true,
          isCalibrating: true,
          totalKills: true,
          totalDeaths: true,
          totalAssists: true,
          totalACS: true,
          totalADR: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Build avatar URL from Discord avatar hash
      const avatarUrl = user.avatar 
        ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`;

      return {
        ...user,
        avatarUrl,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    // Clear the JWT cookie
    reply.clearCookie('token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return { message: 'Logged out successfully' };
  });
}

