# Configuration Conflict Resolution Guide

## Current Standard Configuration

### Ports (FIXED - DO NOT CHANGE)

- **Frontend**: Port `3000` (default, configurable via `FRONTEND_PORT` in root `.env`)
- **Backend**: Port `3001` (default in `apps/backend/src/index.ts`)

### Environment Loading (CENTRALIZED)

- **Location**: Root `.env` file at `<project-root>/.env`
- **Loader**: `@trayb/config/load-env` package
- **Usage**: Import first in all apps: `import "@trayb/config/load-env";`

## How to Check for Conflicts

### Step 1: Verify Ports

```bash
# Check frontend port
grep -A 1 '"dev"' apps/frontend/package.json
# Should show: "dev": "next dev"

# Check backend port
grep "PORT\|3001" apps/backend/src/index.ts
# Should show: const port = Number(process.env.PORT) || 3001;
```

### Step 2: Verify Environment Loading

```bash
# Check backend
head -5 apps/backend/src/index.ts
# Should show: import "@trayb/config/load-env"; as first import

# Check frontend
head -10 apps/frontend/next.config.ts
# Should show env loading code

# Check for per-app .env files (should NOT exist)
find apps -name ".env*" -type f
# Should return nothing (or only .env.example if exists)
```

### Step 3: Compare with Collaborator's Changes

```bash
# See what they changed
git fetch origin
git diff origin/dev...HEAD -- apps/*/package.json apps/*/src/index.ts apps/*/next.config.ts packages/config/
```

## Common Conflicts

### Conflict: Port Changed

**If collaborator changed ports**:
- Frontend: Ensure uses environment-based port configuration without the `-p` flag
- Backend: Revert to `|| 3001` default

### Conflict: Different Env Loading

**If collaborator modified env loading**:
- Revert to using `@trayb/config/load-env`
- Ensure it's imported first
- Remove any custom env loading code

### Conflict: New .env Files

**If collaborator created per-app .env files**:
- Delete them: `rm apps/*/.env.local apps/*/.env.development`
- Use only root `.env` file

## Resolution Steps

1. **Identify the conflict**:
   ```bash
   git diff origin/dev...HEAD
   ```

2. **Check against standard**:
   - Ports should be 3000/3001
   - Env loading should use `@trayb/config/load-env`
   - No per-app .env files

3. **Resolve conflicts**:
   - Keep standard configuration
   - Integrate their feature code (not config changes)
   - Update documentation if exception needed

4. **Test**:
   ```bash
   # Start backend - should be on 3001
   cd apps/backend && bun run dev
   
   # Start frontend - should be on 3000
   cd apps/frontend && bun run dev
   ```

## For Your Collaborator's Profile Feature

When merging their profile changes:

1. **Keep their feature code** (games, badges functionality)
2. **Revert any config changes** (ports, env loading)
3. **Ensure ports are 3000/3001**
4. **Ensure env loading uses centralized loader**

## Quick Fix Commands

```bash
# Fix frontend port if changed (Do not hardcode -p 3000. Restore to default: "dev": "next dev", "start": "next start")
sed -i 's/"dev": "next dev[^"]*"/"dev": "next dev"/' apps/frontend/package.json
sed -i 's/"start": "next start[^"]*"/"start": "next start"/' apps/frontend/package.json

# Fix backend port if changed
sed -i 's/const port = [^;]*;/const port = Number(process.env.PORT) || 3001;/' apps/backend/src/index.ts

# Remove per-app .env files
find apps -name ".env.local" -o -name ".env.development" | xargs rm -f

# Ensure env loader is first import in backend
# (Manual check needed)
```

