# 🚀 Dokploy Deployment Guide

This document walks through deploying the TRAYB Customs platform to **Dokploy** using the repository's Nixpacks configuration. Dokploy will build a single unified service from the repo that runs both the backend and frontend:

- `trayb-customs` – Combined service running Fastify API, Discord bot, Prisma, and Next.js application

Managed PostgreSQL and Redis instances can be provisioned inside Dokploy, or you can point to external services.

---

## 1. Prerequisites

- Dokploy account and project
- GitHub repository connected to Dokploy
- PostgreSQL 16+ and Redis 7+ (Dokploy managed services are recommended)
- Domain ready (e.g. `customs.trayb.az`)

---

## 2. Provision Datastores

1. Create a **PostgreSQL** service in Dokploy  
   - `POSTGRES_USER`: `trayb`  
   - `POSTGRES_PASSWORD`: generate a secure password  
   - `POSTGRES_DB`: `trayb_customs`

2. Create a **Redis** service in Dokploy (no extra env vars needed unless you enable auth)

Keep the service names handy—they are used in the connection strings.

---

## 2.5 Configure Environment Values

1. Align on the master schema (`config/env.schema.json`) and template (`config/env.example`).
2. Populate a production `.env` locally and validate:
   ```bash
   cp config/env.example .env
   vim .env
   npm run env:check -- --context=production
   ```
3. After validation, copy the required variables into Dokploy's Environment tab for the service.

> The schema indicates which keys are required in production (e.g. `TRUST_PROXY`, `REALTIME_STREAM_*`, Discord bot channels/roles, replica & load-test settings). Update the schema and template before introducing new configuration.

---

## 3. Unified Service (`trayb-customs`)

1. In your Dokploy project, create a new service and select **Nixpacks** as the builder.
2. Choose the root of the repository as the build context.
3. Under Nixpacks settings set **Config file** to `nixpacks.toml`.
4. Dokploy will automatically run:
   - `npm ci` (installs all workspace dependencies)
   - `npx prisma generate --schema=./apps/backend/prisma/schema.prisma`
   - `turbo run build --filter=@trayb/backend --filter=@trayb/frontend`
   - Start command: `npm run start` (runs both backend on port 4001 and frontend on port 4000)

### Environment Variables

Add the following (adjust values as needed):

```env
NODE_ENV=production

# Backend runs on port 4001
PORT=4001
HOST=0.0.0.0

# Database and Cache
DATABASE_URL=postgresql://trayb:${POSTGRES_PASSWORD}@<postgres-service>:5432/trayb_customs?schema=public
REDIS_URL=redis://<redis-service>:6379

# URLs and Auth
FRONTEND_URL=https://customs.trayb.az
NEXT_PUBLIC_API_URL=https://customs.trayb.az/api
NEXT_PUBLIC_APP_URL=https://customs.trayb.az
NEXTAUTH_URL=https://customs.trayb.az

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://customs.trayb.az/api/core-auth/discord/callback

# Secrets
JWT_SECRET=generate-a-long-secret
SESSION_SECRET=generate-another-long-secret
AUTH_SECRET=generate-a-long-secret-for-nextauth

# Internal communication (not needed for single service, but kept for compatibility)
FRONTEND_INTERNAL_URL=http://localhost:4000

# CORS
CORS_ORIGIN=https://customs.trayb.az
```

Additional keys to set (see schema for full list):

- `TRUST_PROXY=true`
- `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW`
- `REALTIME_STREAM_KEY`, `REALTIME_STREAM_GROUP`, `REALTIME_STREAM_MAXLEN`, `REALTIME_STREAM_READ_*`
- `METRIC_PREFIX` (defaults to `trayb_`)
- `DISCORD_BOT_TOKEN` plus channel/role IDs used by the bot
- `PROD_REPLICA_URL` / `SHADOW_DATABASE_URL` / `LOADTEST_*` for sanitized syncs and load testing

> Replace `<postgres-service>` / `<redis-service>` with the hostnames Dokploy provides (often the service name inside the same environment).

### Database migrations

After the first deploy, run migrations from the Dokploy shell:

```bash
cd apps/backend
npx prisma migrate deploy
```

Include this in your deployment checklist after every schema change.

### Shared build cache configuration

If you enable a remote Turborepo cache, add the following to the service (Dokploy UI → Environment):

```env
TURBO_TEAM=<team-slug>
TURBO_API=<remote-cache-endpoint>
TURBO_TOKEN=<turbo-auth-token>
TURBO_REMOTE_CACHE_SIGNATURE_KEY=<signature-secret>
```

These variables are optional; without them Turborepo builds still work with local caching only.

### Horizontal scaling

- Set `CLUSTER_WORKERS` for the backend service (usually match vCPU count). Workers auto-restart on crash.
- Prefer sticky sessions at the load balancer to keep SSE clients on the same worker.
- Route database traffic through PgBouncer (transaction mode) for connection pooling.
- Use managed Redis with `maxmemory-policy=allkeys-lru` and enable automatic backups.
- Tune job metrics polling via `BULLMQ_METRICS_POLL_MS` if needed.

---

## 4. Networking & Domains (Path-Based Routing)

Since both backend and frontend run in a single service, configure path-based routing in Dokploy:

### Domain Configuration

In Dokploy → Application → **Domains** tab:

1. **Add domain for backend API:**
   - **Host**: `customs.trayb.az`
   - **Path**: `/api`
   - **Container Port**: `4001`
   - **HTTPS**: ✅ Enabled

2. **Add domain for frontend:**
   - **Host**: `customs.trayb.az`
   - **Path**: `/` (root)
   - **Container Port**: `4000`
   - **HTTPS**: ✅ Enabled

**Traefik will automatically route:**
- `/api/*` → Backend (port 4001)
- `/*` → Frontend (port 4000)

Configure SSL/TLS using Dokploy's certificate management.

---

## 5. Deployment Checklist

- [ ] GitHub repo connected to Dokploy
- [ ] PostgreSQL & Redis services provisioned
- [ ] Unified service created with `nixpacks.toml`
- [ ] Environment variables set (all in one place!)
- [ ] Prisma migrations run (`npx prisma migrate deploy`)
- [ ] Path-based routing configured (frontend: `/`, backend: `/api`)
- [ ] Domains mapped and HTTPS verified
- [ ] Discord OAuth redirect updated to production URL

---

## 6. Post-Deployment Notes

- Whenever Prisma schema changes are merged, redeploy the service **and** re-run `npx prisma migrate deploy`.
- If any environment variables change, redeploy the service.
- Monitor Redis memory usage—scheduled clean-ups keep stat snapshots from growing indefinitely.
- Keep `JWT_SECRET`, `SESSION_SECRET`, and `AUTH_SECRET` unique per environment.

---

## 7. Useful References

- `nixpacks.toml` – unified build instructions for both backend and frontend
- `.env.example` – complete list of environment variables
- `docs/LOCAL_SETUP.md` – local development guide
- `docs/NIXPACKS_DEPLOYMENT.md` – detailed Nixpacks configuration guide

With this single unified Dokploy service, the scrims platform runs without Docker in production. Push to `main`, let Dokploy rebuild, run migrations, and you're live. 🎉

---

## 8. Benefits of Single Service Deployment

- **Simplified Configuration**: Manage all environment variables in one place
- **Easier Maintenance**: One service to monitor, deploy, and troubleshoot
- **Cost-Effective**: Reduced resource overhead from running multiple containers
- **Consistent Environment**: Both apps share the same environment and dependencies
- **Simpler Networking**: No need for internal service-to-service communication
