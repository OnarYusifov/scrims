import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const prisma = new PrismaClient();
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Connection timeout settings to prevent long delays
  connectTimeout: 5000,
  retryStrategy: (times) => {
    // Don't retry too many times
    if (times > 3) {
      return null; // Stop retrying
    }
    return Math.min(times * 200, 1000); // Exponential backoff, max 1s
  },
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false, // Don't queue commands if disconnected
  lazyConnect: false, // Connect immediately
});

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
  });

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

  // Register rate limiting (will skip if Redis fails)
  try {
    await fastify.register(rateLimit, {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
      redis: redis,
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
  await fastify.register(import('./routes/auth'), { prefix: '/api/auth' });
  await fastify.register(import('./routes/users'), { prefix: '/api/users' });
  await fastify.register(import('./routes/matches'), { prefix: '/api/matches' });
  await fastify.register(import('./routes/admin'), { prefix: '/api/admin' });
  await fastify.register(import('./routes/import'), { prefix: '/api/import' });
  await fastify.register(import('./routes/random'), { prefix: '/api' });

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

async function start() {
  try {
    const server = await buildServer();
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
  start();
}

export { buildServer };
