import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import fastifyHttpProxy from '@fastify/http-proxy';

const FRONTEND_INTERNAL_URL = process.env.FRONTEND_INTERNAL_URL || '';

export default fp(async (fastify: FastifyInstance) => {
  if (!FRONTEND_INTERNAL_URL) {
    fastify.log.warn(
      'FRONTEND_INTERNAL_URL not set. /api/auth proxy will not be enabled.',
    );
    return;
  }

  const upstream = FRONTEND_INTERNAL_URL.replace(/\/$/, '');

  await fastify.register(fastifyHttpProxy, {
    prefix: '/api/auth',
    upstream: upstream,
    rewritePrefix: '/api/auth',
    proxyPayloads: true,
  });

  fastify.log.info(
    { upstream },
    'Auth proxy enabled: forwarding /api/auth/* to frontend service',
  );
});


