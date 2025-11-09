import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  emitRealtimeEvent,
  onRealtimeEvent,
  MatchRealtimePayload,
  RealtimeEventName,
} from '../events/app-events';

const STREAM_EVENTS: RealtimeEventName[] = [
  'match:created',
  'match:updated',
  'match:deleted',
];

const writeEvent = (
  reply: FastifyReply,
  event: RealtimeEventName,
  payload: MatchRealtimePayload,
) => {
  reply.raw.write(`event: ${event}\n`);
  reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
};

export default async function realtimeRoutes(fastify: FastifyInstance) {
  fastify.get('/stream', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Initial comment so proxies keep the stream open
    reply.raw.write(': connected\n\n');

    const removeListeners = STREAM_EVENTS.map((eventName) =>
      onRealtimeEvent(eventName, (payload) => writeEvent(reply, eventName, payload)),
    );

    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30000);

    request.raw.on('close', () => {
      removeListeners.forEach((remove) => remove());
      clearInterval(heartbeat);
    });

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


