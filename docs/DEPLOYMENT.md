# 🚀 Railpack Deployment Guide

This document walks through deploying the TRAYB Customs platform to **Railpack** using the repository’s Nixpacks configurations. Railpack will build two separate services from the same repo:

- `trayb-backend` – Fastify API, Discord bot, Prisma
- `trayb-frontend` – Next.js application

Managed PostgreSQL and Redis instances can be provisioned inside Railpack, or you can point to external services.

---

## 1. Prerequisites

- Railpack account and project
- GitHub repository connected to Railpack
- PostgreSQL 16+ and Redis 7+ (Railpack managed services are recommended)
- Domain ready (e.g. `customs.trayb.az`)

---

## 2. Provision Datastores

1. Create a **PostgreSQL** service in Railpack  
   - `POSTGRES_USER`: `trayb`  
   - `POSTGRES_PASSWORD`: generate a secure password  
   - `POSTGRES_DB`: `trayb_customs`

2. Create a **Redis** service in Railpack (no extra env vars needed unless you enable auth)

Keep the service names handy—they are used in the backend connection strings.

---

## 2.5 Configure Environment Values

1. Align on the master schema (`config/env.schema.json`) and template (`config/env.example`).
2. Populate a production `.env` locally and validate:
   ```bash
   cp config/env.example .env
   vim .env
   npm run env:check -- --context=production
   ```
3. After validation, copy the required variables into Railpack’s Environment tab for each service.

> The schema indicates which keys are required in production (e.g. `TRUST_PROXY`, `REALTIME_STREAM_*`, Discord bot channels/roles, replica & load-test settings). Update the schema and template before introducing new configuration.

---

## 3. Backend Service (`trayb-backend`)

1. In your Railpack project, create a new service and select **Nixpacks** as the builder.
2. Choose the root of the repository as the build context.
3. Under Nixpacks settings set **Config file** to `nixpacks.toml`.
4. Railpack will automatically run:
   - `npm ci --workspace=@trayb/backend`
   - `npm run build --workspace=@trayb/backend`
   - Start command: `cd apps/backend && node dist/index.js`

### Backend Environment Variables

Add the following (adjust values as needed):

```env
NODE_ENV=production
PORT=4001
HOST=0.0.0.0

DATABASE_URL=postgresql://trayb:${POSTGRES_PASSWORD}@<postgres-service>:5432/trayb_customs?schema=public
REDIS_URL=redis://<redis-service>:6379

FRONTEND_URL=https://customs.trayb.az
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://customs.trayb.az/api/core-auth/discord/callback
JWT_SECRET=generate-a-long-secret
SESSION_SECRET=generate-another-long-secret
AUTH_SECRET=generate-a-long-secret-for-nextauth
FRONTEND_INTERNAL_URL=http://trayb-frontend:4000
CORS_ORIGIN=https://customs.trayb.az
```

Additional keys to set (see schema for full list):

- `TRUST_PROXY=true`
- `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW`
- `REALTIME_STREAM_KEY`, `REALTIME_STREAM_GROUP`, `REALTIME_STREAM_MAXLEN`, `REALTIME_STREAM_READ_*`
- `METRIC_PREFIX` (defaults to `trayb_`)
- `DISCORD_BOT_TOKEN` plus channel/role IDs used by the bot
- `PROD_REPLICA_URL` / `SHADOW_DATABASE_URL` / `LOADTEST_*` for sanitized syncs and load testing

> Replace `<postgres-service>` / `<redis-service>` with the hostnames Railpack provides (often the service name inside the same environment).

### Database migrations

After the first deploy, run migrations from the Railpack shell:

```bash
cd apps/backend
npx prisma migrate deploy
```

Include this in your deployment checklist after every schema change.

---

## 4. Frontend Service (`trayb-frontend`)

1. Create another service in Railpack using the same repository.
2. Select **Nixpacks** as the builder and set the config file to `nixpacks.frontend.toml`.
3. Build command will run `npm run build --workspace=@trayb/frontend`.
4. Start command: `cd apps/frontend && npm run start` (serves on port 4000 by default).

### Frontend Environment Variables

```env
NODE_ENV=production
PORT=4000
NEXT_PUBLIC_API_URL=https://customs.trayb.az/api
NEXT_PUBLIC_APP_URL=https://customs.trayb.az
AUTH_SECRET=${AUTH_SECRET}
NEXTAUTH_URL=https://customs.trayb.az
```

If you expose the API on a separate subdomain (e.g. `api.customs.trayb.az`), update `NEXT_PUBLIC_API_URL` accordingly.

Refer to `config/env.schema.json` for the complete list of optional overrides (e.g. feature flags, Turborepo cache credentials).

### Shared build cache configuration

If you enable a remote Turborepo cache, add the following to **both** services (Railpack UI → Environment):

```env
TURBO_TEAM=<team-slug>
TURBO_API=<remote-cache-endpoint>
TURBO_TOKEN=<turbo-auth-token>
TURBO_REMOTE_CACHE_SIGNATURE_KEY=<signature-secret>
```

These variables are optional; without them Turborepo builds still work with local caching only.

### Horizontal scaling

- Set `CLUSTER_WORKERS` on the backend service (usually match vCPU count). Workers auto-restart on crash.
- Prefer sticky sessions at the load balancer to keep SSE clients on the same worker.
- Route database traffic through PgBouncer (transaction mode) for connection pooling.
- Use managed Redis with `maxmemory-policy=allkeys-lru` and enable automatic backups.
- Tune job metrics polling via `BULLMQ_METRICS_POLL_MS` if needed.

---

## 5. Networking & Domains

- **Frontend service:** map your primary domain (e.g., `customs.trayb.az`)
- **Backend service:** expose as `api.customs.trayb.az` or keep it internal and route via the frontend
- Configure SSL/TLS using Railpack’s certificate management
- If you share a single domain, proxy `/api/*` to the backend service

---

## 6. Deployment Checklist

- [ ] GitHub repo connected to Railpack
- [ ] PostgreSQL & Redis services provisioned
- [ ] Backend service created with `nixpacks.toml`
- [ ] Backend environment variables set
- [ ] Prisma migrations run (`npx prisma migrate deploy`)
- [ ] Frontend service created with `nixpacks.frontend.toml`
- [ ] Frontend environment variables set
- [ ] Domains mapped and HTTPS verified
- [ ] Discord OAuth redirect updated to production URL

---

## 7. Post-Deployment Notes

- Whenever Prisma schema changes are merged, redeploy backend **and** re-run `npx prisma migrate deploy`.
- If the frontend consumes new environment variables, redeploy it as well.
- Monitor Redis memory usage—scheduled clean-ups keep stat snapshots from growing indefinitely.
- Keep `JWT_SECRET`, `SESSION_SECRET`, and `AUTH_SECRET` unique per environment.

---

## 8. Useful References

- `nixpacks.toml` – backend build instructions
- `nixpacks.frontend.toml` – frontend build instructions
- `.env.example` – complete list of environment variables
- `docs/LOCAL_SETUP.md` – local development guide

With these two Railpack services in place the scrims platform runs without Docker in production. Push to `main`, let Railpack rebuild, run migrations, and you’re live. 🎉

