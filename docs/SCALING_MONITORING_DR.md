# Scaling, Monitoring & Disaster Recovery (2025-11)

## 1. Horizontal Scaling

### Fastify Cluster
- Enable workers with `CLUSTER_WORKERS=<cpu count>` in the backend environment.
- Master process forks workers (sticky sessions recommended when using SSE).
- First worker (`RUN_JOB_WORKER=true`) hosts BullMQ jobs; others handle API/SSE only.
- Adjust redis/queue metrics polling with `BULLMQ_METRICS_POLL_MS`.

### PgBouncer
- Deploy PgBouncer in transaction mode between app and Postgres.
- Sample DSN: `postgresql://user:password@pgbouncer:6432/trayb_customs?schema=public`.
- Recommended settings:
  ```
  pool_mode = transaction
  max_client_conn = 200
  default_pool_size = 20
  reserve_pool_size = 5
  ```
- Point `DATABASE_URL` at PgBouncer in production/staging.

### Managed Redis
- Use a managed Redis (Upstash/Redis Enterprise) with multi-AZ.
- Set `maxmemory-policy allkeys-lru` to avoid OOM when caching.
- Enable auto-backups (daily) and monitor CPU/memory utilization.

## 2. Monitoring & Alerting

### Metrics
- `/metrics` exposes Prometheus metrics (default prefix `trayb_`):
  - `trayb_sse_active_connections`
  - `trayb_sse_events_dropped_total`
  - `trayb_bullmq_waiting_jobs`
  - default process/node metrics via `prom-client`.
- Redis counters (`metrics:sse`, `metrics:cache:*`) remain for quick CLI checks.

### Dashboards
- Suggested Grafana panels:
  - API latency (p50/p95) via Prometheus scrape.
  - Redis health: `up`, `used_memory`, `connected_clients`.
  - Postgres via PgBouncer stats (`SHOW STATS;` exporter).
  - SSE: active connections & drops.
  - BullMQ: waiting/failed job gauges.
- Alert thresholds:
  - API p95 > 500 ms over 5 min.
  - `trayb_sse_events_dropped_total` incrementing > 100/min.
  - BullMQ waiting jobs > 200 or failed > 5/min.
  - Redis/PgBouncer heartbeat failure.

### Health/Readiness
- `/healthz`: lightweight liveness (uptime).
- `/readyz`: checks Postgres, Redis, BullMQ readiness; returns HTTP 503 when degraded.
- Under-pressure plugin protects against event-loop stalls (defaults: 1000 ms delay, 256 MB heap).

## 3. Backups & Recovery

### Automated Backups
- Prefer managed Postgres PITR (point-in-time recovery). Schedule daily snapshots.
- For manual fallback, use `scripts/backup-db.sh` (pg_dump custom format).
- Store dumps in versioned bucket (e.g., `s3://trayb-backups/{env}/`).

### Restore Tests
- Quarterly: restore latest backup to staging DB, run smoke tests, document outcome.
- Verify Redis snapshot/replica failover (if using managed Redis).

### Infrastructure-as-Code
- Track Railpack/Nixpacks config, PgBouncer helm chart, Redis provision scripts in `infra/` (todo).
- Keep environment variable templates in repo (`setup-env.sh`) for quick redeploy.

## 4. Incident Playbooks

### Critical Scenarios
- **DB failover**: promote replica, update `DATABASE_URL`, restart workers, run `/readyz`.
- **Redis outage**: fail over to managed replica, flush SSE cache metrics, monitor queue rebuild.
- **BullMQ backlog**: evaluate worker health, scale job worker nodes, replay stuck jobs.
- **SSE saturation**: check `trayb_sse_events_dropped_total` and consider scaling workers, raising queue limits, or switching hot paths to WebSockets.

### Chaos / Fire Drills (Quarterly)
- Simulate Postgres failover (read replica promotion).
- Kill Redis primary to ensure clients reconnect.
- Stop job worker process and confirm alerts trigger.
- Disable SSE endpoint to validate polling fallback UX.
- Document results in shared runbook (`/docs/incident-logs/YYYY-MM-DD.md`) and track follow-ups.

## 5. Team Decisions / Buy-in
- Choose managed providers (PgBouncer host, Redis HA) and ensure budget.
- Create Grafana/Alertmanager stack (or Datadog equivalent); assign owners.
- Integrate backup bucket credentials with CI for automated smoke restores.
- Define resolver rotation for incidents; align with #infra on on-call schedule.

With these controls in place we have a clear path to scale horizontally, observe system health, and recover from incidents quickly. Update this document after each drill or infrastructure change.



