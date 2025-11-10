import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { getProfileSummaryFromCache, setProfileSummaryCache } from '../cache/profile-cache';
import { buildProfileResponse, fetchProfileUser, fetchProfileUserByDiscordId } from '../services/profile.service';

export default async function userRoutes(fastify: FastifyInstance) {
  // Get user profile with stats and Elo history
  fastify.get('/profile', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Querystring: { fullHistory?: string } }> & { user: any }, reply: FastifyReply) => {
    try {
      const userId = request.user.userId;
      const includeFullHistory =
        request.query?.fullHistory === 'true' || request.query?.fullHistory === '1';

      // Get user with stats
      const cached = await getProfileSummaryFromCache<any>(userId, includeFullHistory);
      if (cached) {
        return cached;
      }

      const user = await fetchProfileUser(userId);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const payload = await buildProfileResponse(user, { includeFullHistory });
      await setProfileSummaryCache(user.id, includeFullHistory, payload);
      return payload;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user profile by discordId
  fastify.get('/discord/:discordId', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { discordId: string }; Querystring: { fullHistory?: string } }>, reply: FastifyReply) => {
    try {
      const { discordId } = request.params;
      const includeFullHistory =
        request.query?.fullHistory === 'true' || request.query?.fullHistory === '1';

      const user = await fetchProfileUserByDiscordId(discordId);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const cached = await getProfileSummaryFromCache<any>(user.id, includeFullHistory);
      if (cached) {
        return cached;
      }

      const payload = await buildProfileResponse(user, { includeFullHistory });
      await setProfileSummaryCache(user.id, includeFullHistory, payload);
      return payload;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get any user's profile (for viewing other profiles)
  fastify.get('/:userId', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { userId: string }; Querystring: { fullHistory?: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      const includeFullHistory =
        request.query?.fullHistory === 'true' || request.query?.fullHistory === '1';

      const cached = await getProfileSummaryFromCache<any>(userId, includeFullHistory);
      if (cached) {
        return cached;
      }

      const user = await fetchProfileUser(userId);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const payload = await buildProfileResponse(user, { includeFullHistory });
      await setProfileSummaryCache(user.id, includeFullHistory, payload);
      return payload;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

