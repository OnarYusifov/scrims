# Configuration Standard - For AI Assistants

## 🚨 CRITICAL: Port and Environment Configuration

This document defines the **standard configuration** that all developers and AI assistants must follow.

## Port Configuration

### Standard Ports (DO NOT CHANGE)

- **Frontend (Next.js)**: Port `3000`
- **Backend (Fastify)**: Port `3001`

### How Ports Are Configured

#### Frontend (`apps/frontend`)
- **Development**: `next dev -p 3000` (hardcoded in package.json)
- **Production**: `next start -p 3000` (hardcoded in package.json)
- **Environment Variable**: Next.js can use `PORT` env var, but we hardcode `-p 3000` for consistency

#### Backend (`apps/backend`)
- **Port**: Uses `process.env.PORT || 3001` (defaults to 3001)
- **Host**: Uses `process.env.HOST || "0.0.0.0"` (defaults to 0.0.0.0)
- **Location**: `apps/backend/src/index.ts` line 81

### ✅ Correct Configuration

```typescript
// apps/backend/src/index.ts
const port = Number(process.env.PORT) || 3001;  // ✅ Correct
const host = process.env.HOST || "0.0.0.0";     // ✅ Correct
```

```json
// apps/frontend/package.json
{
  "scripts": {
    "dev": "next dev -p 3000",    // ✅ Correct
    "start": "next start -p 3000" // ✅ Correct
  }
}
```

### ❌ DO NOT CHANGE

- ❌ Do NOT hardcode different ports
- ❌ Do NOT remove the `-p 3000` flag from frontend scripts
- ❌ Do NOT change the backend default port from 3001
- ❌ Do NOT use environment variables to override these defaults in development

## Environment Variable Loading

### Centralized .env File (REQUIRED)

**All apps MUST use the centralized root `.env` file.**

#### How It Works

1. **Root `.env` file location**: `/home/yunar/scrims/.env` (monorepo root)
2. **Loader package**: `@trayb/config/load-env`
3. **Loading order**: Environment variables are loaded BEFORE any app code runs

#### Implementation

**Backend** (`apps/backend/src/index.ts`):
```typescript
// MUST be first import - before any other imports
import "@trayb/config/load-env";

// Then other imports...
import Fastify from "fastify";
```

**Frontend** (`apps/frontend/next.config.ts`):
```typescript
// Loads .env from root automatically
// This runs before Next.js processes env files
import { readFileSync, existsSync } from "fs";
// ... loads from root .env
```

**All Bots** (`apps/control-bot`, `apps/recorder-bot1`, `apps/recorder-bot2`):
```typescript
// MUST be first import
import "@trayb/config/load-env";
```

### ✅ Correct Environment Variable Usage

```typescript
// ✅ CORRECT: Use process.env with fallback
const port = Number(process.env.PORT) || 3001;
const apiUrl = process.env.API_URL || "http://localhost:3001";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
```

### ❌ DO NOT DO

- ❌ Do NOT create per-app `.env` files (`.env.local`, `.env.development`, etc.)
- ❌ Do NOT use `dotenv` package directly in apps
- ❌ Do NOT load env files from app directories
- ❌ Do NOT override the centralized loader

## Environment Variables Reference

### Required Variables (in root `.env`)

```env
# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# JWT
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"

# Auth.js / NextAuth
AUTH_URL="http://localhost:3000"        # or https://beta.trayb.az in production
NEXTAUTH_URL="http://localhost:3000"   # same as AUTH_URL
AUTH_SECRET="..."
NEXTAUTH_SECRET="..."                   # same as AUTH_SECRET

# Frontend URL (for email links, redirects)
FRONTEND_URL="http://localhost:3000"   # or https://beta.trayb.az in production

# Backend API URL
BACKEND_URL="http://localhost:3001"    # for server-side calls (same container)
API_URL="http://localhost:3001"        # for backend Socket.io config
NEXT_PUBLIC_API_URL="http://localhost:3001"  # for client-side calls

# OAuth Providers
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Discord Bots
DISCORD_CONTROL_BOT_TOKEN="..."
DISCORD_RECORDER_BOT_1_TOKEN="..."
DISCORD_RECORDER_BOT_2_TOKEN="..."

# SMTP
SMTP_HOST="..."
SMTP_PORT=465
SMTP_USER="..."
SMTP_PASSWORD="..."
SMTP_FROM="..."
```

### Port Variables (Optional - defaults work)

- `PORT` - Backend port (defaults to 3001, don't set unless needed)
- `HOST` - Backend host (defaults to 0.0.0.0, don't set unless needed)

**Note**: Frontend port is hardcoded in package.json scripts, not from env vars.

## Common Configuration Conflicts

### Conflict 1: Multiple .env Files

**Problem**: Creating `.env.local` or per-app `.env` files causes conflicts.

**Solution**: Use ONLY the root `.env` file. The loader handles everything.

### Conflict 2: Port Override

**Problem**: Setting `PORT=3000` for backend or different ports.

**Solution**: 
- Backend always uses 3001 (or `process.env.PORT` if set)
- Frontend always uses 3000 (hardcoded in scripts)
- Never override these defaults

### Conflict 3: Environment Variable Loading Order

**Problem**: Loading env vars after imports or in wrong order.

**Solution**: 
- Always import `@trayb/config/load-env` FIRST
- Before any other imports
- Before any code that uses `process.env`

### Conflict 4: Different Config in Development vs Production

**Problem**: Using different env loading logic for dev/prod.

**Solution**: 
- Same loader works for both
- Dokploy injects env vars directly (bypasses .env file)
- Loader only sets vars that don't exist (allows override)

## For AI Assistants Working with Collaborators

When you see configuration changes:

1. **Check if ports are changed**: Should be 3000 (frontend) and 3001 (backend)
2. **Check if env loading is modified**: Should use `@trayb/config/load-env`
3. **Check if new .env files are created**: Should only use root `.env`
4. **Verify port usage**: Backend uses `process.env.PORT || 3001`, Frontend uses `-p 3000`

If conflicts are found:
- Revert to standard configuration
- Use centralized `.env` file
- Keep ports as 3000/3001
- Document any necessary exceptions

## Testing Configuration

### Verify Ports

```bash
# Start backend - should show port 3001
cd apps/backend
bun run dev
# Should see: "🚀 Backend server running on http://0.0.0.0:3001"

# Start frontend - should show port 3000
cd apps/frontend
bun run dev
# Should see: "Local: http://localhost:3000"
```

### Verify Environment Loading

```bash
# Check if root .env is loaded
# Backend should print: "✅ Loaded X environment variable(s) from /path/to/.env"
```

## Docker/Production Configuration

In Docker (Dokploy):
- Ports are handled by Dokploy/Traefik
- Environment variables are injected directly (no .env file needed)
- Backend listens on 0.0.0.0:3001 (internal)
- Frontend listens on 0.0.0.0:3000 (internal)
- Dokploy routes external traffic to these ports

## Summary

✅ **DO**:
- Use root `.env` file only
- Import `@trayb/config/load-env` first
- Use port 3000 for frontend (hardcoded)
- Use port 3001 for backend (default)
- Use `process.env` with fallbacks

❌ **DON'T**:
- Create per-app .env files
- Change default ports
- Load env vars manually
- Override centralized configuration
- Use different configs for dev/prod

