import { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../index';

export default async function leaderboardRoutes(fastify: FastifyInstance) {
  // Get leaderboard (top 100 players by Elo)
  fastify.get('/', async (_, reply: FastifyReply) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          matchesPlayed: {
            gt: 0, // Only show players with at least 1 match
          },
        },
        select: {
          id: true,
          username: true,
          discordId: true,
          avatar: true,
          elo: true,
          peakElo: true,
          matchesPlayed: true,
          isCalibrating: true,
          totalKills: true,
          totalDeaths: true,
          totalAssists: true,
          totalACS: true,
          totalADR: true,
        },
        orderBy: {
          elo: 'desc',
        },
        take: 100,
      });

      const leaderboard = users.map((user, index) => {
        const avgKD = user.totalDeaths > 0 ? user.totalKills / user.totalDeaths : 0;
        const avgACS = user.matchesPlayed > 0 ? user.totalACS / user.matchesPlayed : 0;
        const avgADR = user.matchesPlayed > 0 ? user.totalADR / user.matchesPlayed : 0;

        return {
          rank: index + 1,
          id: user.id,
          username: user.username,
          discordId: user.discordId,
          avatar: user.avatar,
          elo: user.elo,
          peakElo: user.peakElo,
          matchesPlayed: user.matchesPlayed,
          isCalibrating: user.isCalibrating,
          avgKD,
          avgACS,
          avgADR,
        };
      });

      return { leaderboard };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

