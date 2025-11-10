# Build & Deploy Pipeline (2025-11 Refresh)

This document covers the optimized build + deploy workflow introduced with the Turborepo upgrade and lean Nixpacks configurations.

## 1. Turborepo Overview

- Root scripts now invoke Turborepo (`npm run lint|test|build`).
- Tasks only rebuild packages touched by a change (`turbo run build --filter=@trayb/backend...`).
- Local caching lives in `.turbo/`. Configure a remote cache for CI/CD parity.

### 1.1 Remote Cache Setup

You can use any Turborepo-compatible cache backend (Vercel, S3 proxy, etc). Populate the following environment variables wherever the pipeline runs (local opt-in, CI, Railpack builds):

| Variable | Purpose |
| --- | --- |
| `TURBO_TEAM` | Team/namespace slug |
| `TURBO_API` | Remote cache API endpoint |
| `TURBO_TOKEN` | Auth token |
| `TURBO_REMOTE_CACHE_SIGNATURE_KEY` | Shared signature secret |

> **Tip:** export these in your shell profile or use [direnv](https://direnv.net/). Turborepo automatically falls back to local caching if the env vars are missing.

### 1.2 Local Developer Workflow

```bash
npm ci                 # one-time install
npm run lint           # lint only changed packages
npm run test           # placeholder tests (will expand later)
npm run build          # full build with Turborepo caching
npm run build:backend  # scoped build
npm run build:frontend # scoped build
```

> **Note:** Both lint and test tasks currently emit placeholder output while we migrate to ESLint 9 + Vitest. They succeed (exit 0) to keep the pipeline green; treat them as stubs until the follow-up work lands.

Turborepo prints a cache summary; when remote cache is configured, you should see cache hits in CI after the first run.

## 2. CI/CD Pipeline

`/.github/workflows/ci.yml` now performs:

1. Checkout + Node 22 setup
2. Cache `.turbo/`
3. `npm ci`
4. `npm run lint`
5. `npm run test`
6. `npm run build`

Secrets (`TURBO_*`) should be added in GitHub → Settings → Secrets and variables. Missing secrets simply disable remote caching.

## 3. Nixpacks / Railpack Changes

### 3.1 Backend (`nixpacks.toml`)

- Installs build-essential libs for `canvas`.
- Runs `npm ci --workspace=@trayb/backend`.
- Generates Prisma client + runs `turbo run build --filter=@trayb/backend`.
- Prunes dev dependencies after the build (`npm prune ... --omit=dev`).
- Caches `node_modules`, `apps/backend/node_modules`, `.turbo`.

### 3.2 Frontend (`nixpacks.frontend.toml`)

- Uses Node 22.
- Runs `npm ci --workspace=@trayb/frontend`.
- Builds via `turbo run build --filter=@trayb/frontend`.
- Prunes dev dependencies post-build.
- Caches `node_modules`, `apps/frontend/node_modules`, `.turbo`.

> **Railpack setup:** point backend service to `nixpacks.toml`, frontend to `nixpacks.frontend.toml`. Add the `TURBO_*` env vars, `NODE_ENV=production`, and (optionally) `TURBO_REMOTE_CACHE_SIGNATURE_KEY`. Pruning dev deps reduces cold-start size; ensure the build output includes everything your start command needs before pruning.

## 4. Verification Checklist

1. **Local smoke:** `npm ci && npm run build` (should succeed; second run shows cache hits).
2. **CI:** verify GitHub Action finishes in <1m after first warm run. Check logs for `Remote caching disabled` vs `cache hit`.
3. **Railpack:** redeploy both services. Confirm build logs show `turbo run build` and `npm prune` executing.
4. **Runtime:** `Railpack → Logs` ensure `node dist/index.js` / `next start` boot successfully, no missing module errors.

## 5. Known Trade-offs / Follow-ups

- Remote cache backend still requires infra decision (Vercel, S3 proxy, etc). Add to infra backlog.
- Placeholder `npm run test` commands currently echo warnings; replace with real suites when available.
- Pruning dev dependencies assumes build outputs (dist/standalone) contain everything. Revisit if you move to dynamic imports requiring dev-only packages at runtime.
- When additional workspaces are added, update `turbo.json` filters and the Nixpacks cache directories.

## 6. Next Steps

- Decide on remote cache provider (recommend S3 via turborepo-remote-cache or Vercel if licensed).
- Add secrets to GitHub + Railpack once provider is ready.
- Expand test tasks to real unit/integration suites (will make `npm run test` meaningful).
- Optionally add Railpack post-deploy script to warm Next.js ISR pages.

For questions, reach out in `#build-pipeline` or ping the Dev Infra lead.

