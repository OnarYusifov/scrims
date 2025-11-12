# 🔐 Environment Variables Setup Guide

This guide explains how to configure environment files consistently across local development, CI, and Railpack/Dokploy deployments.

---

## 📁 File Structure

```
trayb-customs/
├── config/
│   ├── env.schema.json   # Canonical list of variables, scopes & requirements
│   └── env.example       # Template you copy to .env
├── .env                  # Your local values (ignored by git)
├── setup-env.sh          # Generates app-specific env files
├── apps/
│   ├── backend/
│   └── frontend/
└── ...
```

The **root `.env`** is the single source of truth. Both apps load from it via `setup-env.sh`, which writes `apps/backend/.env` and `apps/frontend/.env.local`.

---

## 🚀 Quick Setup

```bash
cp config/env.example .env   # 1. Copy the template
vim .env                     # 2. Fill in secrets/URLs (see env.schema.json)
npm run env:check            # 3. Validate required keys for local context
npm run setup:env            # 4. Generate app-specific env files
```

If validation fails, the script lists missing variables along with the environments that require them.

---

## 🔑 Minimum Variables to Provide

1. `DATABASE_URL` – Postgres connection string
2. `REDIS_URL` – Redis connection string
3. `JWT_SECRET`, `SESSION_SECRET`, `AUTH_SECRET` – Generate strong secrets (see below)
4. `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`
5. `FRONTEND_URL`, `FRONTEND_INTERNAL_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL`

### Generating secrets

```bash
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🌐 Local Defaults

`config/env.example` already contains sensible local defaults:

- `DATABASE_URL=postgresql://postgres:password@localhost:5432/trayb_customs?schema=public`
- `REDIS_URL=redis://localhost:6379`
- `FRONTEND_URL=http://localhost:4000`
- `NEXT_PUBLIC_API_URL=http://localhost:4001`
- `DISCORD_REDIRECT_URI=http://localhost:4001/api/core-auth/discord/callback`

Adjust hostnames if you run databases elsewhere.

---

## 🚢 Deploying to Dokploy

1. Populate `.env` with production credentials and URLs.
2. Run `npm run env:check -- --context=production` if you want to validate the prod set locally.
3. Copy values into Dokploy's dashboard (single unified service environment).
4. Ensure `TRUST_PROXY=true` and production URLs (`FRONTEND_URL`, `CORS_ORIGIN`, `FRONTEND_INTERNAL_URL`) point to deployed hosts.

The schema lists which variables become required in production (`TRUST_PROXY`, `REALTIME_STREAM_*`, Discord bot channels/roles, etc.).

---

## 🔄 Keeping Things in Sync

- `config/env.schema.json` is **the** ground truth. Update it when adding/removing variables.
- `config/env.example` mirrors the schema with safe placeholder values—keep them aligned.
- `setup-env.sh` should be re-run after editing `.env`; it will regenerate `apps/backend/.env` and `apps/frontend/.env.local`.
- CI runs `npm run env:check:ci` so new variables must be reflected in the schema before merges.

---

## ✅ Verification Checklist

```bash
npm run env:check                     # passes for local context
npm run setup:env                     # regenerates per-app files
npx prisma migrate dev --name init    # database connectivity works
npm run dev                           # backend + frontend start locally
curl http://localhost:4001/healthz    # backend health check OK
```

---

## 🔍 Discord OAuth Redirects

- **Local:** `http://localhost:4001/api/core-auth/discord/callback`
- **Production:** `https://customs.trayb.az/api/core-auth/discord/callback`

Remember to update the Discord Developer Portal when URLs change.

---

## 🧹 Legacy Cleanup & Migration Notes

- Older per-app templates (e.g. `apps/backend/.env.example`, `apps/frontend/.env.local`) have been removed. Always edit the root `.env` and rerun `npm run setup:env`.
- Delete any lingering `.env.local`, `.env.production`, or service-specific `.env` files that were committed or cached from previous flows—those values now live in the root `.env` and the schema.
- If you introduce app-specific secrets, add them to `config/env.schema.json` so validation works everywhere (local, CI, staging, production).
- The validator warns about unknown keys; remove them or add them to the schema. This prevents stale configuration from surviving future refactors.

Remember to add both to the Discord Developer Portal.

---

## 🆘 Troubleshooting

### “Cannot connect to database”
- Confirm PostgreSQL is running and reachable
- Verify `DATABASE_URL`
- Ensure migrations (`npx prisma migrate dev`) succeed locally

### “Cannot connect to Redis”
- Confirm Redis is running (`redis-cli ping`)
- Verify `REDIS_URL`

### Environment variables not loading in Next.js
- Next.js only exposes variables prefixed with `NEXT_PUBLIC_` to the browser. Keep secrets on the server side.

---

You're ready to develop locally and deploy via Dokploy using Nixpacks. Keep `.env.example` updated whenever new variables are introduced so teammates and CI environments stay aligned.

