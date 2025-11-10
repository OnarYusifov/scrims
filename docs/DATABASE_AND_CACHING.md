# Database & Caching Optimizations (2025-11)

This guide documents the database/index changes, Redis caching tiers, and BullMQ queues introduced in the “Database & Caching” optimization slice.

## 1. Prisma Schema & Indexes

- Composite indexes added in `schema.prisma` for hot paths:
  - `User_elo_matches_idx` (`elo`, `matchesPlayed`) for leaderboards.
  - `Match_status_created_idx` (`status`, `createdAt`) for filtered match lists.
  - `PlayerMatchStats_user_created_idx` for profile history lookups.
  - `EloHistory_user_created_idx` for timeline queries.
  - `MatchStatsSubmission_status_created_idx` for reviewer queues.
- Migration `20251109120000_cache_indexes` adds partial indexes:
  - `Match_completed_partial_idx` (`status = COMPLETED`) & `Match_active_status_idx`.
  - `PlayerMatchStats_rating_partial_idx` (skip placeholder stats).
  - `MatchStatsSubmission_pending_idx` (pending reviews).
  - `User_active_partial_idx` (non-banned players).

> Verify with `cd apps/backend && npx prisma migrate deploy`.

## 2. Redis Tiered Caches

Implemented in `src/cache/`:

| Cache | Key Pattern | TTL (default) | Notes |
| --- | --- | --- | --- |
| Profile summary | `cache:profile:{userId}:summary:{full|recent}` | 60s / 120s | Stored per history view; invalidated on stat changes. |
| Match list page | `cache:match:list:{status}:p{page}:l{limit}` | 15s | Bypassed with `?cache=refresh`. |
| Match snapshot | `cache:match:{matchId}:snapshot` | 30s | Warmed after stat updates. |

Helpers: `cache-utils.ts` manages JSON encoding, metrics (`metrics:cache:*` hashes), and tag-based invalidation (`SADD`/`SMEMBERS` sets). Cache listeners (`cache/invalidation-listener.ts`) subscribe to `emitRealtimeEvent` to invalidate on match `created/updated/deleted`.

### Configuration

Optional overrides (all seconds):

```
CACHE_PROFILE_TTL=60
CACHE_PROFILE_FULL_TTL=120
CACHE_MATCH_LIST_TTL=15
CACHE_MATCH_SNAPSHOT_TTL=30
```

## 3. BullMQ Job Queue

File: `src/queues/job-queue.ts`

- Queue name: `trayb-jobs`.
- Components: `Queue`, `QueueScheduler`, `QueueEvents`, `Worker`.
- Jobs (deduped via `jobId`):
  - `profile:refresh` → recalculates aggregates, rebuilds cache via `buildProfileResponse`.
  - `match:snapshot:refresh` → rebuilds cached snapshot.
  - `elo:recalculate` → placeholder for future heavy recompute/analytics.
- Metrics: completions/failures logged; queue events piped to Fastify logger.

Initialization lives in `index.ts`:

```ts
await startJobWorkers(server.log);
...
await shutdownJobWorkers();
```

Use helpers to enqueue:

```ts
await enqueueProfileRefresh(userId);
await enqueueMatchSnapshotRefresh(matchId);
```

## 4. Route Integrations

- `GET /api/users/profile` (and variants) now hit Redis before Prisma, with `?cache=refresh` support.
- `GET /api/matches` uses cached pages (default TTL 15s).
- Stat ingestion & match deletions invalidate caches and enqueue refresh jobs.
- List invalidations triggered automatically via realtime bus + manual fallbacks.

## 5. Verification Checklist

1. **Indexes** – run `EXPLAIN ANALYZE` queries (e.g., profile history, match list) to confirm new indexes are used (`Bitmap Index Scan`/`Index Scan` on the new names).
2. **Cache hit/miss metrics** – query `HGETALL metrics:cache:hits` & `HGETALL metrics:cache:misses`.
3. **BullMQ health** – hit `/api/health`; `redis: status` should be `ready`. Check logs for `BullMQ worker job completed`.
4. **Functional smoke** – `npm run build` then `cd apps/backend && npm run start`; visit `/api/matches?limit=5` twice – second response should log `cache hit`.

## 6. Ownership & Follow-ups

- **Cache invalidation**: owned by Backend team. See `cache/` README for tag naming conventions.
- **Monitoring**: add Grafana panels for `metrics:cache:*` & job queue counts (to be piped into Prometheus).
- **To do**:
  - Flesh out `elo:recalculate` worker to support replay/backfill.
  - Integrate job dashboards (Bull Board) when ops approves.
  - Expand tests (`apps/backend/tests/cache/*.spec.ts`) once harness lands.

For questions, reach out in `#backend-infra`.

