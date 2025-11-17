# AI Collaboration Configuration Guide

## 🎯 Purpose

This document ensures **both AI assistants** (yours and your collaborator's) use the **exact same configuration** to prevent conflicts.

## Standard Configuration (MUST FOLLOW)

### Port Configuration (Environment-Based)

**Ports are configured via root `.env` file - NO HARDCODED PORTS**

**Frontend**: Uses `FRONTEND_PORT` or `PORT` from root `.env`
- Scripts: `"dev": "next dev"` and `"start": "next start"` (no `-p` flag)
- Next.js automatically reads `PORT` from `process.env`
- Default: `3000` if not set
- Set in root `.env`: `FRONTEND_PORT=3000` (or `5000` for collaborator)

**Backend**: Uses `BACKEND_PORT` or `PORT` from root `.env`
- Code: `const port = Number(process.env.BACKEND_PORT || process.env.PORT) || 3001;`
- Default: `3001` if not set
- Set in root `.env`: `BACKEND_PORT=3001` (or `5001` for collaborator)

**IMPORTANT**: Both developers can use different ports by setting them in their root `.env` file

### Environment Variable Loading

**CRITICAL**: All apps MUST use centralized root `.env` file.

#### Backend (`apps/backend/src/index.ts`)
```typescript
// Line 1-3: MUST be first, before any other imports
import "@trayb/config/load-env";

// Then other imports...
import Fastify from "fastify";
```

#### Frontend (`apps/frontend/next.config.ts`)
```typescript
// Loads .env from root automatically
// This runs before Next.js processes env files
// DO NOT modify this logic
```

#### All Bots
```typescript
// First import in each bot's index.ts
import "@trayb/config/load-env";
```

### Environment Variables (Root `.env` File)

**Location**: `/home/yunar/scrims/.env` (monorepo root)

**Required Variables**:
```env
# Ports (set these to match your setup)
FRONTEND_PORT=3000  # or 5000 for collaborator
BACKEND_PORT=3001   # or 5001 for collaborator
# HOST=0.0.0.0  # Only set if you need to override backend host

# URLs
FRONTEND_URL="http://localhost:3000"        # Development
# FRONTEND_URL="https://beta.trayb.az"      # Production
BACKEND_URL="http://localhost:3001"        # Server-side calls
API_URL="http://localhost:3001"             # Backend Socket.io
NEXT_PUBLIC_API_URL="http://localhost:3001" # Client-side calls
AUTH_URL="http://localhost:3000"            # NextAuth
NEXTAUTH_URL="http://localhost:3000"        # NextAuth (same as AUTH_URL)

# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# Auth
AUTH_SECRET="..."
NEXTAUTH_SECRET="..."  # Same as AUTH_SECRET
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"

# OAuth
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# SMTP
SMTP_HOST="..."
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="..."
SMTP_PASSWORD="..."
SMTP_FROM="..."
```

## Common Conflicts and Solutions

### Conflict 1: Port Mismatch

**Symptom**: Backend or frontend running on wrong port

**Check**:
```bash
# Check what ports are configured
grep -E "FRONTEND_PORT|BACKEND_PORT" .env

# Backend should show: "🚀 Backend server running on http://0.0.0.0:${BACKEND_PORT:-3001}"
# Frontend should show: "Local: http://localhost:${FRONTEND_PORT:-3000}"
```

**Fix**:
- Set `FRONTEND_PORT` and `BACKEND_PORT` in root `.env` file
- Backend: Ensure `apps/backend/src/index.ts` has: `const port = Number(process.env.BACKEND_PORT || process.env.PORT) || 3001;`
- Frontend: Ensure `apps/frontend/package.json` has: `"dev": "next dev"` (no `-p` flag)

### Conflict 2: Environment Variable Not Loading

**Symptom**: `process.env.VARIABLE` is undefined

**Check**:
- Backend should print: `✅ Loaded X environment variable(s) from /path/to/.env`
- Frontend loads silently in `next.config.ts`

**Fix**:
- Ensure `import "@trayb/config/load-env";` is FIRST import in backend
- Ensure `next.config.ts` has the env loading code
- Check that root `.env` file exists

### Conflict 3: Multiple .env Files

**Symptom**: Different values in different places

**Fix**:
- Delete any `.env.local`, `.env.development`, or per-app `.env` files
- Use ONLY root `.env` file
- The loader handles everything

### Conflict 4: Collaborator Changed Config

**Symptom**: Their changes conflict with your setup

**Resolution Process**:
1. **Check what they changed**:
   ```bash
   git diff origin/dev...HEAD -- apps/*/package.json apps/*/src/index.ts apps/*/next.config.ts
   ```

2. **Identify conflicts**:
   - Port changes? → Revert to 3000/3001
   - Env loading changes? → Revert to `@trayb/config/load-env`
   - New .env files? → Remove them, use root `.env`

3. **Merge properly**:
   - Keep standard ports (3000/3001)
   - Keep centralized env loading
   - Integrate their feature code
   - Update this document if needed

## For AI Assistants: When Making Changes

### ✅ DO:

1. **Check current configuration first**:
   ```bash
   # Check ports in .env
   grep -E "FRONTEND_PORT|BACKEND_PORT" .env
   
   # Check scripts (should NOT have -p flag)
   grep "next dev\|next start" apps/frontend/package.json
   
   # Check env loading
   grep -r "@trayb/config/load-env" apps/
   ```

2. **Follow the standard**:
   - Set `FRONTEND_PORT` and `BACKEND_PORT` in root `.env` file
   - No hardcoded ports in package.json scripts
   - Use root `.env` file only
   - Import `@trayb/config/load-env` first

3. **Document exceptions**:
   - If you MUST change something, update this file
   - Explain why the change is needed
   - Get approval before merging

### ❌ DON'T:

1. **Don't hardcode ports** in package.json scripts (use env vars)
2. **Don't create per-app .env files** (use root `.env` only)
3. **Don't modify env loading logic** without discussion
4. **Don't use `-p` flag** in Next.js scripts (Next.js reads PORT automatically)
5. **Don't set ports in multiple places** (only root `.env`)

## Verification Checklist

Before committing configuration changes:

- [ ] Frontend port is 3000 (check `package.json`)
- [ ] Backend port defaults to 3001 (check `src/index.ts`)
- [ ] Backend imports `@trayb/config/load-env` first
- [ ] Frontend `next.config.ts` loads root `.env`
- [ ] No per-app `.env` files exist
- [ ] Root `.env` file has all required variables
- [ ] Ports match in all references (3000/3001)

## Communication Protocol

When you (AI assistant) see configuration changes from collaborator:

1. **Acknowledge**: "I see configuration changes in [files]"
2. **Analyze**: Check if they follow the standard
3. **Report**: "These changes [follow/violate] the standard because..."
4. **Recommend**: "I recommend [keeping/reverting/integrating] because..."
5. **Wait for approval**: Don't auto-merge conflicting configs

## Quick Reference

```bash
# Port configuration (set in root .env)
FRONTEND_PORT=3000  # or 5000 for collaborator
BACKEND_PORT=3001   # or 5001 for collaborator

# Env file location
Root: /home/yunar/scrims/.env

# Env loader
Package: @trayb/config/load-env
Import: import "@trayb/config/load-env"; (first import)

# URL defaults (update based on ports)
FRONTEND_URL: http://localhost:${FRONTEND_PORT:-3000}
BACKEND_URL: http://localhost:${BACKEND_PORT:-3001}
API_URL: http://localhost:${BACKEND_PORT:-3001}
```

## Summary for Both AI Assistants

**MANDATORY RULES**:
1. Set `FRONTEND_PORT` and `BACKEND_PORT` in root `.env` file
2. No hardcoded ports in package.json scripts
3. Use root `.env` file only (no per-app env files)
4. Import `@trayb/config/load-env` first
5. Never use `-p` flag in Next.js scripts
6. Never create per-app `.env` files

**If you see violations**: Revert to standard and document why.

