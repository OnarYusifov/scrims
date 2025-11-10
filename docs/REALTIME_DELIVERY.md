# Real-Time & Event Delivery (2025-11 Refresh)

This document describes the hardened SSE delivery path, Redis Streams event bus, and operational guidelines for keeping real-time features healthy.

## 1. Architecture Overview

```
Match / Profile mutations ──► emitRealtimeEvent()
                            │
                            ▼
                  Redis Stream `trayb:events:realtime`
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
  Stream consumer (per instance)        Future subscribers (bot, analytics)
        │
        ▼
  Local EventEmitter ──► SSE clients (`/api/realtime/stream`)
```

- All realtime events (`match:created/updated/deleted`) are persisted using Redis Streams, capped to ~5k entries.
- Each backend instance runs a dedicated consumer that replays pending entries and fans them out locally.
- SSE clients attach to `/api/realtime/stream`; they receive buffered events, heartbeats, and can resume via `Last-Event-ID`.

## 2. SSE Endpoint Behaviours

File: `apps/backend/src/routes/realtime.ts`

- **Heartbeat:** `: heartbeat` comment every 15 s (`SSE_HEARTBEAT_INTERVAL_MS`).
- **Retry hint:** `retry: 5000` sent on connect.
- **Per-client queue:** default 100 events (`SSE_CLIENT_QUEUE_LIMIT`). Dropped events increment `metrics:sse` hash (`dropped` field).
- **Last-Event-ID replay:** connection header or `?lastEventId=` query triggers Redis Stream catch-up before live streaming.
- **Metrics:** connections/disconnections/dropped tracked in `metrics:sse` hash.
- **Graceful shutdown:** synthetic `match:deleted`/`shutdown` event flushes before Fastify closes.
- **Fallback:** client libraries should poll relevant endpoints if the stream errors repeatedly; see section 5.

## 3. Redis Streams Bus

File: `apps/backend/src/events/realtime-bus.ts`

- Stream key: `REALTIME_STREAM_KEY` (default `trayb:events:realtime`).
- Consumer group: `REALTIME_STREAM_GROUP` (default `realtime-consumers`).
- Max length (approximate trim): `REALTIME_STREAM_MAXLEN` (default 5000 events).
- Batch read: `REALTIME_STREAM_READ_COUNT` (default 50), blocking read 5 s (`REALTIME_STREAM_READ_BLOCK_MS`).
- Every event persisted includes `event`, `payload` (JSON), `timestamp` (autofilled if not provided).
- `publishRealtimeEvent()` adds entries and trims the stream. Failures are logged via Fastify logger.
- `startRealtimeBus()` / `stopRealtimeBus()` manage the consumer lifecycle; initiated during server boot.
- `replayEventsSince(lastId)` fetches backlog (used by SSE resume).

### Event Schema

```json
{
  "matchId": "uuid",
  "action": "match:updated",
  "data": {...},          // optional context
  "timestamp": "ISO8601"  // added if missing
}
```

Future producers (Discord bot, analytics ingest) should call `emitRealtimeEvent()` to reuse the same pipeline.

## 4. Ownership & Monitoring

| Component | Emits / Mutates | Consumes | Key Metrics |
| --- | --- | --- | --- |
| `emitRealtimeEvent()` | Match controllers, cache invalidation hooks, shutdown hook | Redis stream + all backend instances | `metrics:sse` hash, stream length |
| SSE Endpoint | Authenticated clients (admin UI, match rooms) | Browser/EventSource | Cache hit ratio & `metrics:sse:dropped` |
| Redis Stream Consumer | Each backend | SSE emitter, future services | Pending entries < 100, loop errors |
| Cache invalidators | `cache/invalidation-listener.ts` | N/A | `metrics:cache:*` (see DB slice) |

- **Lag detection:** monitor stream `XLEN` and pending counts (`XPENDING`). Pending > 100 suggests consumer stalls.
- **Fan-out health:** Grafana panel should plot `metrics:sse:connections`, `metrics:sse:dropped`, `XPENDING`.
- **Alerts:**
  - `metrics:sse:dropped` increase > 100/min → investigate slow clients or raise queue limit.
  - Redis `XPENDING` > 500 or oldest pending age > 30 s → consumer stuck (restart instance).
  - Stream length hitting `REALTIME_STREAM_MAXLEN` frequently → increase cap or shorten replay window.

## 5. Client Fallback Strategy

- **Primary:** SSE via browser `EventSource`.
- **Automatic reconnection:** handled by browser; `retry: 5000` instructs 5 s backoff.
- **Failover:** after 3 consecutive SSE errors, clients should fall back to polling the REST endpoints:
  - `/api/matches?cache=refresh` for match list.
  - `/api/users/profile?fullHistory=false` for active profile.
- **Escalation to WebSockets:** if SSE bandwidth becomes insufficient (e.g., match radar updates > 5 Hz), plan to add a WebSocket gateway that reads from the same Redis Stream but supports binary payloads and higher frequency fan-out. Until that scenario, SSE remains the default.

## 6. Verification Checklist

1. **Local smoke:**  
   - Start backend (`npm run dev`).  
   - Visit `/api/realtime/stream` via curl (`curl -H "Accept: text/event-stream" http://localhost:4001/api/realtime/stream`).  
   - Trigger a match update -> observe event with `id` and JSON payload.
2. **Resume test:**  
   - Copy an event ID, reconnect with header `Last-Event-ID: {id}`.  
   - Ensure subsequent events replay from the stored stream.
3. **Metrics:**  
   - `redis-cli HGETALL metrics:sse` → check `connections`, `disconnects`, `dropped`.  
   - `redis-cli XPENDING trayb:events:realtime realtime-consumers`.
4. **Stream length:**  
   - `redis-cli XLEN trayb:events:realtime` should stay below `REALTIME_STREAM_MAXLEN`.

## 7. Operational Notes & Follow-ups

- BullMQ cache-warming jobs automatically enqueue profile refreshes; monitor combined load to ensure Redis can handle both queue + stream duties.
- If introducing additional realtime topics, add them to `STREAM_EVENTS` and update docs accordingly.
- Consider adding Bull Board or custom dashboard for stream & SSE metrics (future infra ticket).
- Web clients should surface a visible banner when falling back to polling so operators can investigate persistent SSE outages.

For further questions, contact the Platform team (`#realtime-alerts`).



