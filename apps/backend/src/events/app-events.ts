import {
  publishRealtimeEvent,
  realtimeEmitter,
  RealtimeEnvelope,
} from './realtime-bus';

export type RealtimeEventName =
  | 'match:created'
  | 'match:updated'
  | 'match:deleted';

export interface MatchRealtimePayload {
  matchId: string;
  action: string;
  data?: unknown;
  timestamp: string;
}

export const emitRealtimeEvent = (
  event: RealtimeEventName,
  payload: MatchRealtimePayload,
) => {
  publishRealtimeEvent(event, payload).catch((error) => {
    console.error('Failed to publish realtime event', error);
  });
};

export const onRealtimeEvent = (
  event: RealtimeEventName,
  listener: (payload: MatchRealtimePayload, envelope: RealtimeEnvelope) => void,
) => {
  const handler = (envelope: RealtimeEnvelope) => {
    listener(envelope.payload, envelope);
  };
  realtimeEmitter.on(event, handler);
  return () => {
    realtimeEmitter.off(event, handler);
  };
};

export const onceRealtimeEvent = (
  event: RealtimeEventName,
  listener: (payload: MatchRealtimePayload, envelope: RealtimeEnvelope) => void,
) => {
  const handler = (envelope: RealtimeEnvelope) => {
    listener(envelope.payload, envelope);
  };
  realtimeEmitter.once(event, handler);
  return () => realtimeEmitter.off(event, handler);
};


