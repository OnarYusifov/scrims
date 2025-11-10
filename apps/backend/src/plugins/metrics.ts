import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { collectDefaultMetrics, Counter, Gauge, Registry } from 'prom-client';

type BullQueueCounts = {
  waiting?: number;
  active?: number;
  delayed?: number;
  failed?: number;
  completed?: number;
};

export interface ObservabilityMetrics {
  registry: Registry;
  sseConnections: Gauge<string>;
  sseQueueDepth: Gauge<string>;
  sseDrops: Counter<string>;
  bullQueueWaiting: Gauge<string>;
  bullQueueFailed: Gauge<string>;
  updateBullQueueMetrics: (counts: BullQueueCounts) => void;
}

declare module 'fastify' {
  interface FastifyInstance {
    observability: ObservabilityMetrics;
  }
}

const METRIC_PREFIX = process.env.METRIC_PREFIX || 'trayb_';

export default fp(async (fastify: FastifyInstance) => {
  const registry = new Registry();

  collectDefaultMetrics({
    register: registry,
    prefix: METRIC_PREFIX,
  });

  const sseConnections = new Gauge({
    name: `${METRIC_PREFIX}sse_active_connections`,
    help: 'Number of active SSE client connections',
    registers: [registry],
  });

  const sseQueueDepth = new Gauge({
    name: `${METRIC_PREFIX}sse_queue_depth`,
    help: 'Events buffered per SSE client (latest observed depth)',
    registers: [registry],
  });

  const sseDrops = new Counter({
    name: `${METRIC_PREFIX}sse_events_dropped_total`,
    help: 'Total SSE events dropped due to full client queues',
    registers: [registry],
  });

  const bullQueueWaiting = new Gauge({
    name: `${METRIC_PREFIX}bullmq_waiting_jobs`,
    help: 'BullMQ waiting jobs',
    registers: [registry],
  });

  const bullQueueFailed = new Gauge({
    name: `${METRIC_PREFIX}bullmq_failed_jobs`,
    help: 'BullMQ failed jobs',
    registers: [registry],
  });

  const updateBullQueueMetrics = (counts: BullQueueCounts) => {
    if (counts.waiting !== undefined) {
      bullQueueWaiting.set(counts.waiting);
    }
    if (counts.failed !== undefined) {
      bullQueueFailed.set(counts.failed);
    }
  };

  fastify.decorate<ObservabilityMetrics>('observability', {
    registry,
    sseConnections,
    sseQueueDepth,
    sseDrops,
    bullQueueWaiting,
    bullQueueFailed,
    updateBullQueueMetrics,
  });

  fastify.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', registry.contentType);
    reply.send(await registry.metrics());
  });
});



