import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index';

export default async function userRoutes(fastify: FastifyInstance) {
  // Get user profile with stats and Elo history
  fastify.get('/profile', {
    onRequest: [fastify.authenticate],
  }, async (request: any, reply: FastifyReply) => {
    try {
      const userId = request.user.userId;

      // Get user with stats
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

      // Get Elo history (last 50 matches)
      const eloHistory = await prisma.eloHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          oldElo: true,
          newElo: true,
          change: true,
          won: true,
          seriesType: true,
          createdAt: true,
        },
      });

      // Get recent match stats for radar chart
      const recentStats = await prisma.playerMatchStats.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          acs: true,
          adr: true,
          kast: true,
          headshotPercent: true,
          kd: true,
          wpr: true,
        },
      });

      // Calculate averages for radar chart
      const avgStats = recentStats.length > 0
        ? {
            acs: recentStats.reduce((sum, s) => sum + s.acs, 0) / recentStats.length,
            adr: recentStats.reduce((sum, s) => sum + s.adr, 0) / recentStats.length,
            kast: recentStats.reduce((sum, s) => sum + s.kast, 0) / recentStats.length,
            headshotPercent: recentStats.reduce((sum, s) => sum + s.headshotPercent, 0) / recentStats.length,
            kd: recentStats.reduce((sum, s) => sum + s.kd, 0) / recentStats.length,
            wpr: recentStats.reduce((sum, s) => sum + s.wpr, 0) / recentStats.length,
          }
        : {
            acs: 0,
            adr: 0,
            kast: 0,
            headshotPercent: 0,
            kd: 0,
            wpr: 0,
          };

      // Build avatar URL
      const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`;

      // Calculate overall stats
      const avgKD = user.totalDeaths > 0 ? user.totalKills / user.totalDeaths : 0;
      const avgACS = user.matchesPlayed > 0 ? user.totalACS / user.matchesPlayed : 0;
      const avgADR = user.matchesPlayed > 0 ? user.totalADR / user.matchesPlayed : 0;

      return {
        user: {
          ...user,
          avatarUrl,
          avgKD,
          avgACS,
          avgADR,
        },
        eloHistory: eloHistory.reverse(), // Reverse to show chronological order
        recentStats: avgStats,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get any user's profile (for viewing other profiles)
  fastify.get('/:userId', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          discordId: true,
          username: true,
          discriminator: true,
          avatar: true,
          role: true,
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
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Get Elo history
      const eloHistory = await prisma.eloHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          oldElo: true,
          newElo: true,
          change: true,
          won: true,
          seriesType: true,
          createdAt: true,
        },
      });

      // Get recent stats
      const recentStats = await prisma.playerMatchStats.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          acs: true,
          adr: true,
          kast: true,
          headshotPercent: true,
          kd: true,
          wpr: true,
        },
      });

      const avgStats = recentStats.length > 0
        ? {
            acs: recentStats.reduce((sum, s) => sum + s.acs, 0) / recentStats.length,
            adr: recentStats.reduce((sum, s) => sum + s.adr, 0) / recentStats.length,
            kast: recentStats.reduce((sum, s) => sum + s.kast, 0) / recentStats.length,
            headshotPercent: recentStats.reduce((sum, s) => sum + s.headshotPercent, 0) / recentStats.length,
            kd: recentStats.reduce((sum, s) => sum + s.kd, 0) / recentStats.length,
            wpr: recentStats.reduce((sum, s) => sum + s.wpr, 0) / recentStats.length,
          }
        : {
            acs: 0,
            adr: 0,
            kast: 0,
            headshotPercent: 0,
            kd: 0,
            wpr: 0,
          };

      const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`;

      const avgKD = user.totalDeaths > 0 ? user.totalKills / user.totalDeaths : 0;
      const avgACS = user.matchesPlayed > 0 ? user.totalACS / user.matchesPlayed : 0;
      const avgADR = user.matchesPlayed > 0 ? user.totalADR / user.matchesPlayed : 0;

      return {
        user: {
          ...user,
          avatarUrl,
          avgKD,
          avgACS,
          avgADR,
        },
        eloHistory: eloHistory.reverse(),
        recentStats: avgStats,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

