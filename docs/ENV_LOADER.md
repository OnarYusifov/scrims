# Environment Variable Loader

## Overview

All apps in the monorepo now automatically load environment variables from the **root `.env` file**. This ensures consistent configuration across all services and prepares the project for Dokploy deployment, where environment variables are managed centrally.

## Implementation

### Shared Loader Package

**Location:** `packages/config/src/load-env.ts`

A reusable environment loader that:
- Automatically finds the monorepo root directory
- Loads `.env` from the root
- Only sets variables that aren't already in `process.env` (allows override)
- Silently fails in production (Dokploy injects env vars directly)

### Usage

Simply import at the top of your entry file:

```typescript
import "@trayb/config/load-env";
```

The loader runs automatically when the module is imported.

## Apps Using Root Env Loader

### ✅ Backend (`apps/backend`)
- **File:** `apps/backend/src/index.ts`
- **Implementation:** `import "@trayb/config/load-env";`
- Loads before Fastify server starts

### ✅ Frontend (`apps/frontend`)
- **File:** `apps/frontend/next.config.ts`
- **Implementation:** Loads in Next.js config (runs before Next.js processes env files)
- Has fallback manual loading if package unavailable

### ✅ Control Bot (`apps/control-bot`)
- **File:** `apps/control-bot/src/index.ts`
- **Implementation:** `import "@trayb/config/load-env";`

### ✅ Recorder Bot 1 (`apps/recorder-bot1`)
- **File:** `apps/recorder-bot1/src/index.ts`
- **Implementation:** `import "@trayb/config/load-env";`

### ✅ Recorder Bot 2 (`apps/recorder-bot2`)
- **File:** `apps/recorder-bot2/src/index.ts`
- **Implementation:** `import "@trayb/config/load-env";`

## How It Works

1. **Root Detection**: The loader searches upward from the current file's directory, looking for `package.json` with `workspaces` or name `"trayb"`

2. **Env Loading**: Reads `.env` from root directory and parses `KEY=VALUE` pairs

3. **Override Protection**: Only sets variables that don't already exist in `process.env`, allowing:
   - Runtime overrides
   - Dokploy environment variable injection
   - Local development overrides

4. **Error Handling**: 
   - Development: Warns if `.env` not found
   - Production: Silent (Dokploy injects vars directly)

## Dokploy Deployment

In Dokploy, you can:
1. Set environment variables in the Dokploy UI (they'll be injected as `process.env`)
2. The loader will still run but won't override existing vars
3. All apps will use the same environment configuration

## Benefits

- ✅ **Single source of truth**: One `.env` file at root
- ✅ **Dokploy ready**: Works with Dokploy's env injection
- ✅ **Override support**: Local development can override specific vars
- ✅ **Consistent**: All apps use the same env loading logic
- ✅ **Automatic**: No manual configuration needed per app

## Example

```bash
# Root .env file
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_xxxxx
AUTH_SECRET=your-secret
DISCORD_CLIENT_ID=xxxxx
```

All apps will automatically have access to these variables when they start.








