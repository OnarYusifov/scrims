# Environment-Based Port Configuration

## Overview

Ports are now configured via environment variables from the **root `.env` file** only. No hardcoded ports, no per-app env files.

## Port Environment Variables

### Frontend Port

- **Variable**: `FRONTEND_PORT` (or `PORT` as fallback)
- **Default**: `3000` (if not set)
- **Location**: Root `.env` file
- **Usage**: Next.js automatically reads `PORT` from `process.env`

### Backend Port

- **Variable**: `BACKEND_PORT` (or `PORT` as fallback)
- **Default**: `3001` (if not set)
- **Location**: Root `.env` file
- **Usage**: Code reads from `process.env.BACKEND_PORT || process.env.PORT`

## Configuration in Root `.env` File

Add these to `/home/yunar/scrims/.env`:

```env
# Port Configuration
# Set these to match your development setup
FRONTEND_PORT=3000    # or 5000 for collaborator's setup
BACKEND_PORT=3001     # or 5001 for collaborator's setup

# Or use single PORT variable (applies to backend, frontend uses FRONTEND_PORT)
# PORT=3001
```

## How It Works

### Frontend (`apps/frontend`)

1. **next.config.ts** loads root `.env` file
2. Sets `process.env.PORT = process.env.FRONTEND_PORT` if `FRONTEND_PORT` is set
3. Next.js automatically reads `PORT` from `process.env` when starting
4. **No `-p` flag needed** in package.json scripts

### Backend (`apps/backend`)

1. **src/index.ts** imports `@trayb/config/load-env` first
2. Loader reads root `.env` file and sets `process.env` variables
3. Code reads: `process.env.BACKEND_PORT || process.env.PORT || 3001`

## Examples

### Your Setup (3000/3001)

```env
FRONTEND_PORT=3000
BACKEND_PORT=3001
```

### Collaborator's Setup (5000/5001)

```env
FRONTEND_PORT=5000
BACKEND_PORT=5001
```

## Important Rules

### ✅ DO:

- Set ports in root `.env` file only
- Use `FRONTEND_PORT` and `BACKEND_PORT` variables
- Let Next.js read `PORT` automatically (no `-p` flag)
- Use centralized env loader for backend

### ❌ DON'T:

- ❌ Hardcode ports in package.json scripts
- ❌ Create `.env.local` or per-app `.env` files
- ❌ Use `-p` flag in Next.js scripts
- ❌ Set ports in multiple places

## Verification

### Check Current Ports

```bash
# Check what ports are configured
grep -E "FRONTEND_PORT|BACKEND_PORT|^PORT=" .env

# Start services and verify ports
bun run dev
# Frontend should show: "Local: http://localhost:${FRONTEND_PORT:-3000}"
# Backend should show: "🚀 Backend server running on http://0.0.0.0:${BACKEND_PORT:-3001}"
```

### Test Port Configuration

```bash
# Test with different ports
echo "FRONTEND_PORT=5000" >> .env
echo "BACKEND_PORT=5001" >> .env

# Restart services
bun run dev

# Should now run on 5000/5001
```

## Migration from Hardcoded Ports

If you had hardcoded ports before:

1. **Remove `-p` flags** from `apps/frontend/package.json`:
   ```json
   // OLD (hardcoded)
   "dev": "next dev -p 3000"
   
   // NEW (env-based)
   "dev": "next dev"
   ```

2. **Add port variables** to root `.env`:
   ```env
   FRONTEND_PORT=3000
   BACKEND_PORT=3001
   ```

3. **Backend already uses env** (no changes needed)

## Troubleshooting

### Frontend Not Using Correct Port

- Check `FRONTEND_PORT` or `PORT` in root `.env`
- Verify `next.config.ts` loads the env file
- Restart Next.js dev server

### Backend Not Using Correct Port

- Check `BACKEND_PORT` or `PORT` in root `.env`
- Verify `@trayb/config/load-env` is imported first
- Check console for "✅ Loaded X environment variable(s)"

### Port Conflicts

- Ensure only root `.env` file exists
- Delete any `.env.local` or per-app env files
- Check for multiple PORT variables (use FRONTEND_PORT/BACKEND_PORT)

