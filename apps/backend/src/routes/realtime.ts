import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  emitRealtimeEvent,
  MatchRealtimePayload,
  onRealtimeEvent,
  RealtimeEventName,
} from '../events/app-events';
import { replayEventsSince } from '../events/realtime-bus';
import { redis } from '../lib/redis';
import type { ObservabilityMetrics } from '../plugins/metrics';

const STREAM_EVENTS: RealtimeEventName[] = [
  'match:created',
  'match:updated',
  'match:deleted',
];

const HEARTBEAT_MS = parseInt(process.env.SSE_HEARTBEAT_INTERVAL_MS ?? '15000', 10);
const SSE_QUEUE_LIMIT = parseInt(process.env.SSE_CLIENT_QUEUE_LIMIT ?? '100', 10);
const SSE_METRIC_KEY = 'metrics:sse';

interface SseEnvelope {
  id: string;
  event: RealtimeEventName;
  payload: MatchRealtimePayload;
}

const incrementMetric = (field: string) =>
  redis.hincrby(SSE_METRIC_KEY, field, 1).catch(() => undefined);

class SseClient {
  private queue: SseEnvelope[] = [];
  private writing = false;
  private closed = false;

  constructor(
    private readonly reply: FastifyReply,
    private readonly metrics?: ObservabilityMetrics,
  ) {}

  enqueue(envelope: SseEnvelope) {
    if (this.closed) return;

    if (this.queue.length >= SSE_QUEUE_LIMIT) {
      this.queue.shift();
      void incrementMetric('dropped');
      this.metrics?.sseDrops.inc();
    }

    this.queue.push(envelope);
    this.metrics?.sseQueueDepth.set(this.queue.length);
    if (!this.writing) {
      void this.flush();
    }
  }

  sendComment(message: string) {
    if (this.closed) return;
    const chunk = `: ${message}\n\n`;
    this.reply.raw.write(chunk);
  }

  private async flush(): Promise<void> {
    if (this.closed) return;

    this.writing = true;
    while (this.queue.length > 0 && !this.closed) {
      const envelope = this.queue.shift();
      if (!envelope) continue;

      const chunk = [
        `id: ${envelope.id}`,
        `event: ${envelope.event}`,
        `data: ${JSON.stringify(envelope.payload)}`,
        '',
      ].join('\n');

      if (!this.reply.raw.write(`${chunk}\n`)) {
        await new Promise<void>((resolve) => {
          this.reply.raw.once('drain', resolve);
        });
      }
    }
    this.writing = false;
    this.metrics?.sseQueueDepth.set(this.queue.length);
  }

  close() {
    this.closed = true;
    this.queue = [];
    this.metrics?.sseQueueDepth.set(0);
  }
}

interface RealtimeStreamQuery {
  lastEventId?: string;
  token?: string;
}

export default async function realtimeRoutes(fastify: FastifyInstance) {
  fastify.get('/stream', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token: queryToken } = (request.query as RealtimeStreamQuery) ?? {};

    try {
      await request.jwtVerify();
    } catch {
      if (!queryToken) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }

      try {
        const decoded = await fastify.jwt.verify<{
          userId: string;
          discordId: string;
          role: string;
        }>(queryToken);
        (request as any).user = decoded;
      } catch {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    reply.hijack();
    reply.raw.write('retry: 5000\n');
    reply.raw.write(': connected\n\n');

    const connectionId = randomUUID();
    void incrementMetric('connections');

    const metrics = fastify.observability;
    metrics?.sseConnections.inc();

    const client = new SseClient(reply, metrics);

    const lastEventIdHeader = request.headers['last-event-id'];
    const lastEventIdQuery = (request.query as RealtimeStreamQuery)?.lastEventId;
    const lastEventId = typeof lastEventIdHeader === 'string'
      ? lastEventIdHeader
      : lastEventIdQuery ?? '';

    if (lastEventId) {
      const backlog = await replayEventsSince(lastEventId);
      backlog.forEach((envelope) => client.enqueue(envelope));
    }

    const removeListeners = STREAM_EVENTS.map((eventName) =>
      onRealtimeEvent(eventName, (payload, envelope) => {
        if (envelope) {
          client.enqueue(envelope);
        } else {
          client.enqueue({
            id: Date.now().toString(),
            event: eventName,
            payload,
          });
        }
      }),
    );

    const heartbeat = setInterval(() => {
      client.sendComment('heartbeat');
    }, HEARTBEAT_MS);

    request.raw.on('close', () => {
      removeListeners.forEach((remove) => remove());
      clearInterval(heartbeat);
      client.close();
      void incrementMetric('disconnects');
      metrics?.sseConnections.dec();
      fastify.log.debug({ connectionId }, 'SSE connection closed');
    });

    fastify.log.debug({ connectionId }, 'SSE connection established');

    return reply;
  });

  fastify.addHook('onClose', (_instance, done) => {
    // Emit a synthetic event so that lingering connections flush before shutdown.
    emitRealtimeEvent('match:deleted', {
      matchId: 'system',
      action: 'shutdown',
      timestamp: new Date().toISOString(),
      data: { reason: 'server-shutdown' },
    });
    done();
  });
}

