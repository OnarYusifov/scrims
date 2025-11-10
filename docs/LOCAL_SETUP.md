# Local Setup Guide for TRAYB Customs

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Cairo graphics toolchain for the Discord bot:
  - **Ubuntu/Debian:** `sudo apt install -y libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev`
  - **macOS:** `brew install pkg-config cairo pango libpng jpeg giflib`
  - **Windows (WSL recommended):** use the Ubuntu command above inside WSL

> If you prefer containers for the datastores, run PostgreSQL and Redis however you like—the application itself runs directly on Node.js.

---

## 1. Install Dependencies

```bash
cd trayb-customs
npm install
```

The workspace install pulls dependencies for both the backend and frontend.

---

## 2. Configure Environment Variables

```bash
cp config/env.example .env   # Copy the template
vim .env                     # Fill in secrets/URLs (see config/env.schema.json for details)
npm run env:check            # Validate required keys for the local context
npm run setup:env            # Generate apps/backend/.env and apps/frontend/.env.local
```

Key values:

- `DATABASE_URL` / `REDIS_URL` — point to your local Postgres & Redis instances
- `JWT_SECRET`, `SESSION_SECRET`, `AUTH_SECRET` — generate strong random strings (`openssl rand -base64 32`)
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — from the Discord Developer Portal
- `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL`, `FRONTEND_INTERNAL_URL` — default to `http://localhost:4000` & `http://localhost:4001`

Refer to `config/env.schema.json` for the full catalogue of variables, scopes, and which environments require them.

---

## 3. Prepare the Database

Ensure PostgreSQL and Redis are running, then:

```bash
cd apps/backend
npx prisma generate
npx prisma migrate dev --name init
```

Optional: view data in Prisma Studio.

```bash
npx prisma studio
```

---

## 4. Start the Services

### Backend (Fastify API + Discord bot)

```bash
cd apps/backend
npm run dev
```

Health check: http://localhost:4001/api/health

### Frontend (Next.js)

```bash
cd apps/frontend
npm run dev
```

Visit http://localhost:4000

> Shortcut: from the project root you can run `npm run dev` to start both servers concurrently.

---

## 5. Optional: Seed a Sanitized Shadow Database

If you have access to the read-only production replica, you can refresh a local/staging “shadow” database with anonymized data:

```bash
PROD_REPLICA_URL=postgresql://readonly:password@replica-host:5432/trayb_customs \
SHADOW_DATABASE_URL=postgresql://postgres:password@localhost:5432/trayb_shadow \
./scripts/db/sync-anonymized.sh
```

The script masks Discord IDs, emails, IP addresses, and sensitive payloads, then verifies the result. Logs are saved under `logs/data-sync/` for auditing. See `docs/PROD_DATA_SAFE_PLAYBOOK.md` for more details and additional guardrails.

---

## Useful Commands

```bash
# Backend helpers
cd apps/backend
npx prisma studio               # Browse the database
npx prisma migrate reset        # Reset database (destructive!)
npm run build                   # Production build

# Frontend helpers
cd apps/frontend
npm run lint
npm run build

# Turborepo shortcuts from project root
cd ../..
npm run lint
npm run test
npm run build
npm run deps:check         # Inspect pending dependency updates
npm run deps:audit         # Audit production dependencies
npm run loadtest           # Run the default autocannon scenario (requires sanitized shadow data)

### Cache verification tips

- Hit `GET http://localhost:4001/api/matches?limit=5` twice – the second call should hit Redis (check server logs for `cache hit`).
- To bypass cache temporarily append `?cache=refresh`.
- Redis metrics live under hashes `metrics:cache:hits` / `metrics:cache:misses`; inspect with `redis-cli HGETALL metrics:cache:hits`.
```

---

## Troubleshooting

### Database connection errors
- Confirm PostgreSQL is reachable at `localhost:5432`
- Verify credentials in `DATABASE_URL`

### Redis connection errors
- Ensure Redis is running on `localhost:6379`
- Confirm `REDIS_URL` matches your instance

### Port already in use
```bash
# macOS/Linux
lsof -i :4000
kill -9 <PID>

# Windows PowerShell
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Prisma client not generated
```bash
cd apps/backend
npx prisma generate
```

---

## Discord OAuth Credentials

1. Go to https://discord.com/developers/applications
2. Create a new application
3. In **OAuth2 → General** copy the Client ID and Client Secret
4. Add `http://localhost:4001/api/core-auth/discord/callback` to Redirects

---

## Questions?

Open an issue on GitHub or reach out on Discord. When you're ready for production, follow the Railpack deployment guide.

