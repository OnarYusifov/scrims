# Environment Variables Reference

## 📌 Source of Truth

- **Schema:** `config/env.schema.json` (defines every variable, scope, defaults, and required contexts)
- **Template:** `config/env.example` (copy to `.env`)
- **Validation:** `npm run env:check` (local), `npm run env:check:ci` (CI/deploy)
- **Syncing:** `npm run setup:env` regenerates `apps/backend/.env` and `apps/frontend/.env.local`

Always update the schema and template together when adding new configuration. The CI pipeline runs the CI validation script to catch missing or unexpected keys before merges.

---

## 🎯 Minimum Required Variables

The following variables must be populated in **local, staging, and production** environments.

| Key | Scope | Description |
| --- | --- | --- |
| `FRONTEND_URL` | shared | Public URL of the frontend app (browser origin) |
| `FRONTEND_INTERNAL_URL` | backend | Internal URL for backend → frontend proxying (Auth.js) |
| `NEXT_PUBLIC_API_URL` | frontend | Base URL for API requests issued by the Next.js app |
| `NEXTAUTH_URL` | frontend | Canonical NextAuth callback URL (must match `FRONTEND_URL`) |
| `AUTH_SECRET` | shared | NextAuth session encryption secret |
| `JWT_SECRET` | backend | Fastify JWT signing secret |
| `SESSION_SECRET` | backend | Fastify session secret |
| `DATABASE_URL` | backend | Postgres connection string |
| `REDIS_URL` | backend | Redis connection string |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` | shared | Discord OAuth credentials |
| `CORS_ORIGIN` | backend | Allowed origin(s) for cross-site requests |

---

## 🚦 Production & Staging Enhancements

These variables become important on shared staging or production clusters.

| Key | Purpose |
| --- | --- |
| `TRUST_PROXY` | Required when running behind a load balancer (ensures correct client IPs) |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW` | Fastify rate limit tuning |
| `CLUSTER_WORKERS` | Number of Fastify workers (keep at `1` until sticky sessions + `/metrics` controls are in place) |
| `UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY`, `UNDER_PRESSURE_MAX_HEAP_BYTES` | Backpressure thresholds for under-pressure plugin |
| `REALTIME_STREAM_*` | Redis Streams configuration (key, group, maxlen, read batch/block) |
| `DISCORD_BOT_TOKEN`, channel IDs, role IDs | Discord bot automation |
| `METRIC_PREFIX` | Prometheus metric namespace |

All Discord channel/role IDs are documented in the schema; update those entries when guild mappings change.

---

## 🛡️ Production Data Safe-Use

| Key | Description | Notes |
| --- | --- | --- |
| `PROD_REPLICA_URL` | Read-only production replica connection string | Used by `scripts/db/sync-anonymized.sh` |
| `SHADOW_DATABASE_URL` | Target database for anonymized dumps | Typically a local/staging shadow database |
| `LOADTEST_BASE_URL` | Base URL for the autocannon harness | Defaults to the backend URL |
| `LOADTEST_ALLOWED_HOSTS` | Comma-separated allow-list for load-testing targets | Prevents accidental production hits |
| `LOADTEST_BEARER`, `LOADTEST_*` overrides | Optional auth + tuning knobs for load tests | Assertions live in `loadtest/scenario.json` |

Workflow:

```bash
PROD_REPLICA_URL=... SHADOW_DATABASE_URL=... ./scripts/db/sync-anonymized.sh
npm run loadtest
```

See `docs/PROD_DATA_SAFE_PLAYBOOK.md` for the full procedure.

---

## 🧰 Optional Overrides

These tune specific subsystems and all default to safe values:

- Cache TTLs: `CACHE_PROFILE_TTL`, `CACHE_PROFILE_FULL_TTL`, `CACHE_MATCH_LIST_TTL`, `CACHE_MATCH_SNAPSHOT_TTL`
- SSE behaviour: `SSE_HEARTBEAT_INTERVAL_MS`, `SSE_CLIENT_QUEUE_LIMIT`
- Redis Streams tuning: `REALTIME_STREAM_MAXLEN`, `REALTIME_STREAM_READ_COUNT`, `REALTIME_STREAM_READ_BLOCK_MS`
- BullMQ metrics polling: `BULLMQ_METRICS_POLL_MS`
- Random.org integration: `RANDOM_ORG_API_KEY`
- Discord role escalation: `DISCORD_ROOT_IDS` (comma-separated Discord IDs that should auto-upgrade to ROOT during login)
- Debug flag: `DEBUG_OPGG_HTML`
- Legacy ELO settings (`ELO_*`) remain optional for historical parity
- Turborepo cache credentials (`TURBO_*`) for CI/deploy optimisation

---

## 🔄 Recommended Workflow

1. `cp config/env.example .env`
2. Fill in variables (consult `config/env.schema.json` for descriptions and requirements)
3. `npm run env:check` to validate the file
4. `npm run setup:env` to regenerate per-app environment files
5. Commit schema/template changes alongside code that introduces new configuration

If validation fails, the script lists missing keys and the contexts where they are required. Resolve those before proceeding.

