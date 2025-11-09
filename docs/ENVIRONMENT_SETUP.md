# 🔐 Environment Variables Setup Guide

This guide explains how environment files are organised for local development and for Railpack production deploys.

---

## 📁 File Structure

```
trayb-customs/
├── .env.example          # Template used for local + production
├── .env                  # Your local override (create from .env.example)
├── apps/
│   ├── backend/
│   │   └── prisma/
│   └── frontend/
└── nixpacks*.toml        # Build configuration for Railpack/Nixpacks
```

The project relies on a **single root `.env`** file. Both the backend and frontend read from it (via `process.env`) so you only need to keep one copy in sync.

---

## 🚀 Quick Setup

```bash
cp .env.example .env      # 1. Copy the template
nano .env                 # 2. Fill in your values (or use your editor of choice)
```

That’s it—no per-app `.env` files are required.

---

## 🔑 Minimum Variables to Change

1. `POSTGRES_PASSWORD`
2. `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`
3. `JWT_SECRET` (generate a long random string)
4. `SESSION_SECRET` (generate another long random string)
5. `AUTH_SECRET` (NextAuth secret, generate a long random string)

### Generating secrets

```bash
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🌐 Local Development Defaults

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/trayb_customs?schema=public
REDIS_URL=redis://localhost:6379

PORT=4001
NODE_ENV=development

DISCORD_REDIRECT_URI=http://localhost:4001/api/auth/discord/callback
FRONTEND_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:4000

NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_APP_URL=http://localhost:4000
AUTH_SECRET=change-me-in-development
```

Adjust hostnames if you run PostgreSQL/Redis elsewhere.

---

## 🚢 Railpack Production Configuration

### Backend service

```env
NODE_ENV=production
PORT=4001
HOST=0.0.0.0

DATABASE_URL=postgresql://trayb:${POSTGRES_PASSWORD}@trayb-postgres:5432/trayb_customs?schema=public
REDIS_URL=redis://trayb-redis:6379

FRONTEND_URL=https://customs.trayb.az
DISCORD_REDIRECT_URI=https://customs.trayb.az/api/auth/discord/callback
CORS_ORIGIN=https://customs.trayb.az
```

### Frontend service

```env
NODE_ENV=production
PORT=4000
NEXT_PUBLIC_API_URL=https://customs.trayb.az/api
NEXT_PUBLIC_APP_URL=https://customs.trayb.az
AUTH_SECRET=${AUTH_SECRET}
```

Replace `trayb-postgres` / `trayb-redis` with the service names Railpack generates in your environment. If you split the API onto a subdomain (e.g. `api.customs.trayb.az`) remember to update `NEXT_PUBLIC_API_URL`.

---

## 🔄 Keeping Files in Sync

- The root `.env` is the single source of truth.
- Commit `.env.example` with placeholder values so teammates know what needs to be set.
- Never commit `.env`—it stays local.
- When deploying, copy the values into Railpack’s environment variable UI for each service.

---

## ✅ Verification Checklist

```bash
ls .env                                # file exists
npx prisma migrate dev --name init     # successfully connects to DB
npm run dev                            # backend + frontend start locally
curl http://localhost:4001/api/health  # backend health check passes
```

---

## 🔍 Discord OAuth Redirects

- **Local:** `http://localhost:4001/api/auth/discord/callback`
- **Production:** `https://customs.trayb.az/api/auth/discord/callback`

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

You’re ready to develop locally and deploy via Railpack using Nixpacks. Keep `.env.example` updated whenever new variables are introduced so teammates and CI environments stay aligned.

