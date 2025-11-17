# AI Collaboration Configuration Guide

## 🎯 Purpose

This document ensures **both AI assistants** (yours and your collaborator's) use the **exact same configuration** to prevent conflicts.

## Standard Configuration (MUST FOLLOW)

### Port Configuration

**Frontend**: Always port `3000`
- Hardcoded in `apps/frontend/package.json`: `"dev": "next dev -p 3000"`
- Hardcoded in `apps/frontend/package.json`: `"start": "next start -p 3000"`
- **DO NOT** use `PORT` env var for frontend
- **DO NOT** remove `-p 3000` flag

**Backend**: Always port `3001`
- Code: `const port = Number(process.env.PORT) || 3001;` in `apps/backend/src/index.ts`
- Defaults to 3001 if `PORT` env var not set
- **DO NOT** change the default from 3001
- **DO NOT** hardcode a different port

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
# Ports (optional - defaults work)
# PORT=3001  # Only set if you need to override backend port
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
# Backend should show: "🚀 Backend server running on http://0.0.0.0:3001"
# Frontend should show: "Local: http://localhost:3000"
```

**Fix**:
- Backend: Ensure `apps/backend/src/index.ts` has: `const port = Number(process.env.PORT) || 3001;`
- Frontend: Ensure `apps/frontend/package.json` has: `"dev": "next dev -p 3000"`

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
   # Check ports
   grep -r "3000\|3001" apps/*/package.json apps/*/src/index.ts
   
   # Check env loading
   grep -r "@trayb/config/load-env" apps/
   ```

2. **Follow the standard**:
   - Use port 3000 for frontend (hardcoded)
   - Use port 3001 for backend (default)
   - Use root `.env` file only
   - Import `@trayb/config/load-env` first

3. **Document exceptions**:
   - If you MUST change something, update this file
   - Explain why the change is needed
   - Get approval before merging

### ❌ DON'T:

1. **Don't change ports** without updating this document
2. **Don't create per-app .env files**
3. **Don't modify env loading logic** without discussion
4. **Don't hardcode different ports**
5. **Don't use different configs** for dev/prod (same loader works for both)

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
# Standard ports
Frontend: 3000 (hardcoded in package.json)
Backend: 3001 (default in code, can override with PORT env var)

# Env file location
Root: /home/yunar/scrims/.env

# Env loader
Package: @trayb/config/load-env
Import: import "@trayb/config/load-env"; (first import)

# URL defaults
FRONTEND_URL: http://localhost:3000
BACKEND_URL: http://localhost:3001
API_URL: http://localhost:3001
```

## Summary for Both AI Assistants

**MANDATORY RULES**:
1. Frontend = port 3000 (hardcoded)
2. Backend = port 3001 (default)
3. Use root `.env` file only
4. Import `@trayb/config/load-env` first
5. Never create per-app env files
6. Never change default ports without documentation

**If you see violations**: Revert to standard and document why.

