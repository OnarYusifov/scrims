import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { queue } from '../queues/job-queue';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/healthz', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  fastify.get('/readyz', async (_request, reply: FastifyReply) => {
    const checks = {
      database: false,
      redis: false,
      bullmq: false,
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      fastify.log.error({ err: error }, 'Database readiness check failed');
    }

    try {
      const ping = await redis.ping();
      checks.redis = ping === 'PONG';
    } catch (error) {
      fastify.log.error({ err: error }, 'Redis readiness check failed');
    }

    try {
      const counts = await queue.getJobCounts('waiting', 'active', 'failed');
      checks.bullmq = typeof counts.waiting === 'number';
    } catch (error) {
      fastify.log.error({ err: error }, 'BullMQ readiness check failed');
    }

    const allPassing = Object.values(checks).every(Boolean);

    if (!allPassing) {
      reply.status(503);
    }

    return {
      status: allPassing ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  });
}
