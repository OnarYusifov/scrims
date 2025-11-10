import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import { redis, createRedisConnection } from '../lib/redis';
import type { MatchRealtimePayload, RealtimeEventName } from './app-events';

export interface RealtimeEnvelope {
  id: string;
  event: RealtimeEventName;
  payload: MatchRealtimePayload;
}

const STREAM_KEY = process.env.REALTIME_STREAM_KEY || 'trayb:events:realtime';
const GROUP_NAME = process.env.REALTIME_STREAM_GROUP || 'realtime-consumers';
const STREAM_MAXLEN = parseInt(process.env.REALTIME_STREAM_MAXLEN ?? '5000', 10);
const READ_COUNT = parseInt(process.env.REALTIME_STREAM_READ_COUNT ?? '50', 10);
const READ_BLOCK_MS = parseInt(process.env.REALTIME_STREAM_READ_BLOCK_MS ?? '5000', 10);

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

let running = false;
let consumerId: string | null = null;
let logger: FastifyBaseLogger | undefined;
let readerConnection = createRedisConnection();

type StreamEntry = [string, string[]];
type StreamReadResult = [string, StreamEntry[]][];

const parseStreamEntry = (id: string, fields: string[]): RealtimeEnvelope | null => {
  const data: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }

  const event = data.event as RealtimeEventName | undefined;
  const payloadRaw = data.payload;

  if (!event || !payloadRaw) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadRaw) as MatchRealtimePayload;
    return { id, event, payload };
  } catch (error) {
    logger?.error({ err: error, id }, 'Failed to parse realtime payload');
    return null;
  }
};

const ensureConsumerGroup = async () => {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '$', 'MKSTREAM');
  } catch (error: any) {
    if (error?.message?.includes('BUSYGROUP')) {
      return;
    }
    throw error;
  }
};

const emitEnvelope = (envelope: RealtimeEnvelope) => {
  emitter.emit(envelope.event, envelope);
  emitter.emit('*', envelope);
};

const readPending = async () => {
  // Read historical pending messages for this consumer to avoid accumulation.
  const pending = (await (readerConnection as any).xreadgroup(
    'GROUP',
    GROUP_NAME,
    consumerId!,
    'COUNT',
    READ_COUNT.toString(),
    'STREAMS',
    STREAM_KEY,
    '0',
  )) as StreamReadResult | null;

  if (!pending) return;

  for (const [, entries] of pending) {
    for (const entry of entries) {
      const [id, fields] = entry;
      const envelope = parseStreamEntry(id, fields);
      if (!envelope) {
        await readerConnection.xack(STREAM_KEY, GROUP_NAME, id).catch(() => undefined);
        continue;
      }
      emitEnvelope(envelope);
      await readerConnection.xack(STREAM_KEY, GROUP_NAME, id).catch(() => undefined);
    }
  }
};

const pollLoop = async () => {
  while (running) {
    try {
      const response = (await (readerConnection as any).xreadgroup(
        'GROUP',
        GROUP_NAME,
        consumerId!,
        'BLOCK',
        READ_BLOCK_MS.toString(),
        'COUNT',
        READ_COUNT.toString(),
        'STREAMS',
        STREAM_KEY,
        '>',
      )) as StreamReadResult | null;

      if (!response) {
        continue;
      }

      for (const [, entries] of response) {
        for (const entry of entries) {
          const [id, fields] = entry;
          const envelope = parseStreamEntry(id, fields);
          if (!envelope) {
            await readerConnection.xack(STREAM_KEY, GROUP_NAME, id).catch(() => undefined);
            continue;
          }
          emitEnvelope(envelope);
          await readerConnection.xack(STREAM_KEY, GROUP_NAME, id).catch(() => undefined);
        }
      }
    } catch (error) {
      logger?.error({ err: error }, 'Realtime stream read failed');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
};

export const realtimeEmitter = emitter;

export const publishRealtimeEvent = async (
  event: RealtimeEventName,
  payload: MatchRealtimePayload,
): Promise<void> => {
  const enrichedPayload: MatchRealtimePayload = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  await redis
    .xadd(
      STREAM_KEY,
      'MAXLEN',
      '~',
      STREAM_MAXLEN,
      '*',
      'event',
      event,
      'payload',
      JSON.stringify(enrichedPayload),
    )
    .catch((error) => {
      logger?.error({ err: error }, 'Failed to publish realtime event');
      throw error;
    });
};

export const startRealtimeBus = async (fastifyLogger: FastifyBaseLogger): Promise<void> => {
  if (running) return;

  logger = fastifyLogger;
  consumerId = `consumer-${process.pid}-${randomUUID()}`;
  readerConnection = createRedisConnection();

  await ensureConsumerGroup();
  running = true;

  await readPending();
  void pollLoop();
};

export const stopRealtimeBus = async (): Promise<void> => {
  running = false;
  await readerConnection.quit().catch(() => undefined);
  consumerId = null;
};

export const replayEventsSince = async (
  lastEventId: string,
  count = 100,
): Promise<RealtimeEnvelope[]> => {
  if (!lastEventId) {
    return [];
  }

  const response = await redis.xrange(
    STREAM_KEY,
    `(${lastEventId}`,
    '+',
    'COUNT',
    count,
  );

  const envelopes: RealtimeEnvelope[] = [];

  for (const entry of response) {
    const [id, fields] = entry;
    const envelope = parseStreamEntry(id, fields);
    if (envelope) {
      envelopes.push(envelope);
    }
  }

  return envelopes;
};


