import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

export default async function adminRoutes(fastify: FastifyInstance) {
  // Middleware to check admin role
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = (request as any).user?.role;
    if (!['ADMIN', 'ROOT'].includes(userRole)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
  };

  const requireRoot = async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = (request as any).user?.role;
    if (userRole !== 'ROOT') {
      return reply.code(403).send({ error: 'Root permissions required' });
    }
  };

  // Get all users (admin only)
  fastify.get('/users', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const page = parseInt(request.query.page || '1');
      const limit = Math.min(parseInt(request.query.limit || '50'), 100);
      const skip = (page - 1) * limit;
      const search = request.query.search;

      const where: any = {};
      if (search) {
        where.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { discordId: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            discordId: true,
            username: true,
            discriminator: true,
            avatar: true,
            email: true,
            role: true,
            isWhitelisted: true,
            isBanned: true,
            elo: true,
            peakElo: true,
            matchesPlayed: true,
            isCalibrating: true,
            createdAt: true,
            lastLogin: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/reset', {
    onRequest: [fastify.authenticate, requireRoot],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const adminUserId = (request as any).user.userId;

      const result = await prisma.$transaction(async (tx) => {
        const [
          matchCount,
          playerStatsCount,
          submissionCount,
          eloCount,
          voteCount,
          mapCount,
          teamCount,
          teamMemberCount,
        ] = await Promise.all([
          tx.match.count(),
          tx.playerMatchStats.count(),
          tx.matchStatsSubmission.count(),
          tx.eloHistory.count(),
          tx.matchVote.count(),
          tx.mapSelection.count(),
          tx.team.count(),
          tx.teamMember.count(),
        ]);

        await tx.matchStatsSubmission.deleteMany({});
        await tx.matchVote.deleteMany({});
        await tx.playerMatchStats.deleteMany({});
        await tx.mapSelection.deleteMany({});
        await tx.teamMember.deleteMany({});
        await tx.team.deleteMany({});
        await tx.eloHistory.deleteMany({});
        await tx.match.deleteMany({});

        const usersUpdated = await tx.user.updateMany({
          data: {
            elo: 800,
            peakElo: 800,
            matchesPlayed: 0,
            isCalibrating: true,
            totalKills: 0,
            totalDeaths: 0,
            totalAssists: 0,
            totalACS: 0,
            totalADR: 0,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'APP_DATA_RESET',
            entity: 'System',
            entityId: 'global',
            details: {
              matchCount,
              playerStatsCount,
              submissionCount,
              eloCount,
              voteCount,
              mapCount,
              teamCount,
              teamMemberCount,
              usersUpdated: usersUpdated.count,
            },
          },
        });

        return {
          matchCount,
          playerStatsCount,
          submissionCount,
          eloCount,
          voteCount,
          mapCount,
          teamCount,
          teamMemberCount,
          usersUpdated: usersUpdated.count,
        };
      });

      return {
        message: 'Application data has been reset to baseline.',
        ...result,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to reset application data' });
    }
  });

  // Update user role
  fastify.patch('/users/:id/role', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { role: 'USER' | 'MODERATOR' | 'ADMIN' | 'ROOT' };
  }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const { role } = request.body;
      const adminUserId = (request as any).user.userId;

      // Prevent non-ROOT from assigning ROOT role
      const adminRole = (request as any).user.role;
      if (role === 'ROOT' && adminRole !== 'ROOT') {
        return reply.code(403).send({ error: 'Only ROOT can assign ROOT role' });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          username: true,
          role: true,
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'USER_ROLE_CHANGED',
          entity: 'User',
          entityId: id,
          details: {
            oldRole: user.role,
            newRole: role,
          },
        },
      });

      return user;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Ban/unban user
  fastify.patch('/users/:id/ban', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { banned: boolean };
  }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const { banned } = request.body;
      const adminUserId = (request as any).user.userId;

      const user = await prisma.user.update({
        where: { id },
        data: { isBanned: banned },
        select: {
          id: true,
          username: true,
          isBanned: true,
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: banned ? 'USER_BANNED' : 'USER_UNBANNED',
          entity: 'User',
          entityId: id,
        },
      });

      return user;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add to whitelist
  fastify.post('/whitelist', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request: FastifyRequest<{
    Body: { discordId: string };
  }>, reply: FastifyReply) => {
    try {
      const { discordId } = request.body;
      const adminUserId = (request as any).user.userId;

      const user = await prisma.user.update({
        where: { discordId },
        data: { isWhitelisted: true },
        select: {
          id: true,
          username: true,
          isWhitelisted: true,
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'USER_UPDATED',
          entity: 'User',
          entityId: user.id,
          details: { action: 'whitelisted' },
        },
      });

      return user;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Remove from whitelist
  fastify.delete('/whitelist/:id', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const adminUserId = (request as any).user.userId;

      const user = await prisma.user.update({
        where: { id },
        data: { isWhitelisted: false },
        select: {
          id: true,
          username: true,
          isWhitelisted: true,
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'USER_UPDATED',
          entity: 'User',
          entityId: id,
          details: { action: 'unwhitelisted' },
        },
      });

      return user;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get audit logs
  fastify.get('/audit-logs', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      action?: string;
      entity?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const page = parseInt(request.query.page || '1');
      const limit = Math.min(parseInt(request.query.limit || '50'), 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (request.query.action) {
        where.action = request.query.action;
      }
      if (request.query.entity) {
        where.entity = request.query.entity;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                discordId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get weight profiles
  fastify.get('/weight-profiles', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const profiles = await prisma.weightProfile.findMany({
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      });

      return profiles;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create weight profile
  fastify.post('/weight-profiles', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request: FastifyRequest<{
    Body: {
      name: string;
      killWeight?: number;
      deathWeight?: number;
      assistWeight?: number;
      acsWeight?: number;
      adrWeight?: number;
      kastWeight?: number;
      firstKillWeight?: number;
      clutchWeight?: number;
    };
  }>, reply: FastifyReply) => {
    try {
      const profile = await prisma.weightProfile.create({
        data: {
          name: request.body.name,
          killWeight: request.body.killWeight || 0.25,
          deathWeight: request.body.deathWeight || 0.15,
          assistWeight: request.body.assistWeight || 0.10,
          acsWeight: request.body.acsWeight || 0.20,
          adrWeight: request.body.adrWeight || 0.10,
          kastWeight: request.body.kastWeight || 0.10,
          firstKillWeight: request.body.firstKillWeight || 0.05,
          clutchWeight: request.body.clutchWeight || 0.05,
        },
      });

      return profile;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update weight profile
  fastify.patch('/weight-profiles/:id', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      name?: string;
      killWeight?: number;
      deathWeight?: number;
      assistWeight?: number;
      acsWeight?: number;
      adrWeight?: number;
      kastWeight?: number;
      firstKillWeight?: number;
      clutchWeight?: number;
    };
  }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const profile = await prisma.weightProfile.update({
        where: { id },
        data: request.body,
      });

      return profile;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Activate weight profile
  fastify.patch('/weight-profiles/:id/activate', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      // Deactivate all profiles
      await prisma.weightProfile.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Activate the selected one
      const profile = await prisma.weightProfile.update({
        where: { id },
        data: { isActive: true },
      });

      return profile;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

