# Configuration Changes - For Collaborator's AI

## 🎯 Summary

Ports are now **fully environment-based** from the root `.env` file. No hardcoded ports anywhere.

## What Changed

### Before (Hardcoded)

- Frontend: `"dev": "next dev -p 3000"` (hardcoded port)
- Backend: `const port = Number(process.env.PORT) || 3001;` (default only)

### After (Environment-Based)

- Frontend: `"dev": "next dev"` (reads `PORT` from `process.env`, which comes from root `.env`)
- Backend: `const port = Number(process.env.BACKEND_PORT || process.env.PORT) || 3001;`

## How to Configure Ports

### In Root `.env` File

Add these variables to `<project-root>/.env`:

```env
# Your setup (5000/5001)
FRONTEND_PORT=5000
BACKEND_PORT=5001

# Or use the other developer's setup (3000/3001)
# FRONTEND_PORT=3000
# BACKEND_PORT=3001
```

### How It Works

1. **Frontend**:
   - `next.config.ts` loads root `.env` file
   - Sets `process.env.PORT = process.env.FRONTEND_PORT` if `FRONTEND_PORT` is set
   - Next.js automatically reads `PORT` from `process.env` when starting
   - No `-p` flag needed in package.json scripts

2. **Backend**:
   - `src/index.ts` imports `@trayb/config/load-env` first
   - Loader reads root `.env` file and sets `process.env` variables
   - Code reads: `process.env.BACKEND_PORT || process.env.PORT || 3001`

## Important Rules

### ✅ DO:

- Set `FRONTEND_PORT` and `BACKEND_PORT` in root `.env` file
- Use root `.env` file only (no per-app env files)
- Let Next.js read `PORT` automatically (no `-p` flag)

### ❌ DON'T:

- ❌ Hardcode ports in package.json scripts
- ❌ Use `-p` flag in Next.js scripts
- ❌ Create `.env.local` or per-app `.env` files
- ❌ Set ports in multiple places

## Verification

After setting ports in `.env`:

```bash
# Check ports are set
grep -E "FRONTEND_PORT|BACKEND_PORT" .env

# Start services
bun run dev

# Frontend should show: "Local: http://localhost:${FRONTEND_PORT}"
# Backend should show: "🚀 Backend server running on http://0.0.0.0:${BACKEND_PORT}"
```

## Files Changed

1. `apps/frontend/package.json` - Removed `-p 3000` flags
2. `apps/frontend/next.config.ts` - Sets `process.env.PORT` from `FRONTEND_PORT`
3. `apps/backend/src/index.ts` - Uses `BACKEND_PORT || PORT || 3001`

## Migration Steps

1. **Add to root `.env`**:

   ```env
   FRONTEND_PORT=5000
   BACKEND_PORT=5001
   ```

2. **Update URL variables** (if needed):

   ```env
   FRONTEND_URL="http://localhost:5000"
   BACKEND_URL="http://localhost:5001"
   API_URL="http://localhost:5001"
   NEXT_PUBLIC_API_URL="http://localhost:5001"
   AUTH_URL="http://localhost:5000"
   NEXTAUTH_URL="http://localhost:5000"
   ```

3. **Restart services**:
   ```bash
   bun run dev
   ```

## Questions?

See `docs/ENV_PORT_CONFIGURATION.md` for detailed documentation.
