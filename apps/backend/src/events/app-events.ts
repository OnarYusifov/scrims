import { EventEmitter } from 'node:events';

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

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow unlimited listeners – we manage cleanup manually per connection.
    this.setMaxListeners(0);
  }
}

const bus = new AppEventBus();

export const emitRealtimeEvent = (
  event: RealtimeEventName,
  payload: MatchRealtimePayload,
) => {
  bus.emit(event, payload);
};

export const onRealtimeEvent = (
  event: RealtimeEventName,
  listener: (payload: MatchRealtimePayload) => void,
) => {
  bus.on(event, listener);
  return () => {
    bus.off(event, listener);
  };
};

export const onceRealtimeEvent = (
  event: RealtimeEventName,
  listener: (payload: MatchRealtimePayload) => void,
) => {
  bus.once(event, listener);
  return () => {
    bus.off(event, listener);
  };
};


