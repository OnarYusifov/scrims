import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import dotenv from 'dotenv';
import cluster from 'node:cluster';
import os from 'node:os';
import underPressure from '@fastify/under-pressure';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { registerCacheInvalidationListeners } from './cache/invalidation-listener';
import { shutdownJobWorkers, startJobWorkers } from './queues/job-queue';
import { startRealtimeBus, stopRealtimeBus } from './events/realtime-bus';
import metricsPlugin from './plugins/metrics';
import healthRoutes from './routes/health';

dotenv.config();

registerCacheInvalidationListeners();

async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.PRETTY_LOGS === 'true' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
    trustProxy: process.env.TRUST_PROXY
      ? process.env.TRUST_PROXY === 'true'
      : true,
  });

  await fastify.register(metricsPlugin);

  // Register JWT plugin
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // Register cookie plugin (required by session)
  await fastify.register(cookie);

  // Register session plugin
  await fastify.register(session, {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  });

  await fastify.register((await import('@fastify/multipart')).default, {
    attachFieldsToBody: false,
    limits: { fileSize: 8 * 1024 * 1024 },
  });

  await fastify.register(import('./plugins/discord-bot'));

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Register Helmet
  await fastify.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });

  await fastify.register(underPressure, {
    maxEventLoopDelay: parseInt(process.env.UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY || '1000', 10),
    maxHeapUsedBytes: parseInt(
      process.env.UNDER_PRESSURE_MAX_HEAP_BYTES || `${200 * 1024 * 1024}`,
      10,
    ),
    retryAfter: 50,
    healthCheck: async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        await redis.ping();
        return true;
      } catch (error) {
        fastify.log.error({ err: error }, 'Under-pressure health check failed');
        return false;
      }
    },
    healthCheckInterval: 30000,
    exposeStatusRoute: '/status/under-pressure',
  });

  // Register rate limiting (will skip if Redis fails)
  try {
    await fastify.register(rateLimit, {
      max: parseInt(process.env.RATE_LIMIT_MAX || '600'),
      timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
      redis,
      skipOnError: true,
      continueExceeding: false,
      keyGenerator: (request) => {
        const headers = request.headers;
        const forwarded =
          (headers['cf-connecting-ip'] as string | undefined) ??
          (headers['x-real-ip'] as string | undefined) ??
          (headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();

        if (forwarded) {
          return forwarded;
        }

        const sessionId = (request as any).session?.sessionId;
        if (sessionId) {
          return sessionId;
        }

        const userId = (request as any).user?.userId;
        if (userId) {
          return userId;
        }

        return request.ip;
      },
    });
  } catch (error) {
    fastify.log.warn({ err: error }, 'Rate limiting disabled due to Redis error');
    // Continue without rate limiting if Redis fails
  }

  // Health check endpoint (accessible at /api/health)
  fastify.get('/api/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const redisStatus = redis.status;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          redis: redisStatus,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Register auth plugin
  await fastify.register(import('./plugins/auth'));

  // Register route modules
  await fastify.register(import('./routes/auth'), { prefix: '/api/core-auth' });
  await fastify.register(import('./routes/users'), { prefix: '/api/users' });
  await fastify.register(import('./routes/matches'), { prefix: '/api/matches' });
  await fastify.register(import('./routes/admin'), { prefix: '/api/admin' });
  await fastify.register(import('./routes/import'), { prefix: '/api/import' });
  await fastify.register(import('./routes/leaderboard'), { prefix: '/api/leaderboard' });
  await fastify.register(import('./routes/realtime'), { prefix: '/api/realtime' });
  await fastify.register(import('./routes/random'), { prefix: '/api' });
  await fastify.register(import('./plugins/frontend-auth-proxy'));
  await fastify.register(healthRoutes);

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    
    if (error.validation) {
      reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
      return;
    }

    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500,
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  return fastify;
}

let currentServer: FastifyInstance | null = null;
let runJobWorkerInstance = false;

async function start(runJobWorker: boolean) {
  try {
    const server = await buildServer();
    currentServer = server;
    await startRealtimeBus(server.log);
    if (runJobWorker) {
      await startJobWorkers(server.log, server.observability?.updateBullQueueMetrics);
      runJobWorkerInstance = true;
    }
    // Use PORT env var or default to 4001 for backend
    const port = parseInt(process.env.PORT || '4001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    
    server.log.info(`
╔════════════════════════════════════════╗
║   TRAYB Customs Backend API Server    ║
║                                        ║
║   Status: ✓ Running                    ║
║   Port: ${port}                         ║
║   Environment: ${process.env.NODE_ENV || 'development'}      ║
╚════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}, closing server gracefully...`);
  
  try {
    await prisma.$disconnect();
    await redis.quit();
    if (runJobWorkerInstance) {
      await shutdownJobWorkers();
    }
    await stopRealtimeBus();
    if (currentServer) {
      await currentServer.close();
    }
    console.log('Database and Redis connections closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
if (require.main === module) {
  const workerCount = parseInt(process.env.CLUSTER_WORKERS || '1', 10);

  if (cluster.isPrimary && workerCount > 1) {
    const cpus = os.cpus().length;
    const spawnCount = Math.min(workerCount, cpus);
    const workerRoles = new Map<number, string>();

    for (let i = 0; i < spawnCount; i += 1) {
      const role = i === 0 ? 'true' : 'false';
      const worker = cluster.fork({
        RUN_JOB_WORKER: role,
      });
      workerRoles.set(worker.id, role);
    }

    cluster.on('exit', (worker, code, signal) => {
      console.warn(
        `Worker ${worker.process?.pid} exited (code=${code}, signal=${signal}). Restarting...`,
      );
      const previousRole = workerRoles.get(worker.id) || 'false';
      workerRoles.delete(worker.id);
      const replacement = cluster.fork({
        RUN_JOB_WORKER: previousRole,
      });
      workerRoles.set(replacement.id, previousRole);
    });
  } else {
    const runJobWorker = process.env.RUN_JOB_WORKER === 'true' || workerCount <= 1;
    start(runJobWorker).catch((err) => {
      console.error('Failed to start worker', err);
      process.exit(1);
    });
  }
}

export { buildServer };
