# CI/CD & Dependency Management (2025-11)

## 1. Dependency Automation

- **Renovate** (`.github/renovate.json`)
  - Runs weekly after 02:00 (America/New_York).
  - Groups monorepo bumps and dev dependencies; merges patch/digest updates automatically.
  - Opens a dependency dashboard issue for manual tracking.
- **Manual scripts**
  - `npm run deps:check` – inspect available updates with grouping by scope.
  - `npm run deps:upgrade` – apply updates and re-install (`npm install`) in one shot.
  - `npm run deps:audit` – audit prod dependencies for ≥ high severity issues (also used in CI).
- `.npmrc`
  - `save-exact=true` ensures lockfile reproducibility.
  - `prefer-workspace-packages=true` keeps local packages linked during install.

## 2. CI Pipeline

Workflow: `.github/workflows/ci.yml`

| Job | Purpose | Notes |
| --- | --- | --- |
| `changes` | Detect relevant diffs using `dorny/paths-filter` | Skips pipeline when docs-only changes land. |
| `lint` | Runs `npm run lint`, validates env schema, checks lockfile | Fails if lint scripts mutate files or env schema is outdated. |
| `test` | Executes `npm run test` and audits deps (`npm run deps:audit`) | Blocks on high-severity advisories. |
| `build` | Builds workspaces, uploads artifacts | Stores `backend-dist` & `frontend-standalone` for downstream deploys. |

All jobs share cached `.turbo` results and npm cache. Secrets (`TURBO_*`) enable remote caching when available.

### Preview Workflow

`preview.yml` can be kicked via the **Preview** label on a PR or manual dispatch. It builds the repo and publishes artifacts (`preview-backend-dist`, `preview-frontend-standalone`) suitable for manual upload to Railpack or other hosts.

Tear down temporary environments once you’re done—preview builds do not auto-clean infrastructure.

## 3. Developer Touchpoints

- **Running locally**
  - `npm run lint`, `npm run test`, `npm run build` mirror CI jobs.
  - `npm run deps:audit` before releases to catch advisories.
  - `npm run env:check` anytime you edit `.env`; rerun `npm run setup:env` afterwards.
- **Responding to pipeline failures**
  - Inspect the failing job logs in GitHub Actions.
  - `lint` failure may indicate formatting/residual changes—run the same command locally, commit fixes.
  - `deps:audit` failure means high severity advisories; decide to patch or add a temporary allow-list (coordinate with security).
  - `build` failure still uploads partial artifacts if they exist; check the job summary for artifact names.
- **Load testing / shadow DB**
  - Refresh sanitized data: `./scripts/db/sync-anonymized.sh` (requires replica credentials).
  - Run default load test scenario: `npm run loadtest` (fails fast if host not allow-listed).
  - Artifacts saved under `loadtest/results/` for audit and trend analysis.
- **Escalation / rollback**
  - Use the dependency dashboard issue to manage Renovate PRs.
  - Add `/hold` label (repo convention) if pipeline is flaky or awaiting infra fix.
  - To rollback a dependency update, revert the merge commit and note the reason in the dashboard.

## 4. Known Risks & TODOs

- **Lint/test placeholders**: The frontend/backend lint/test scripts currently emit placeholders. Replace with real suites to gain full pipeline value.
- **Remote cache secrets**: Ensure `TURBO_*` secrets are present in GitHub and Railpack; otherwise builds fall back to local cache.
- **Cache poisoning**: Turborepo cache is shared across jobs—only trusted branches should have access (currently limited to repo jobs).
- **Preview deployments**: Workflow stops at artifact upload; integrating with Railpack/Dokploy API is a future task.
- **Runner capacity**: Parallel jobs increase concurrency; if queue times grow, consider larger GitHub runner pool or self-hosted runners.

For day-to-day operations, monitor GitHub Actions dashboards and Renovate PR stream. Ping #dev-infra for pipeline escalations.


