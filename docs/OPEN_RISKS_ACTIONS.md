# Open Risks & Actions (Updated 2025-11-09)

| Priority | Area | Risk / Trade-off | Proposed Mitigation / Next Action | Owner | Target Date |
| --- | --- | --- | --- | --- | --- |
| High | Realtime Scaling | Fastify clustering requires sticky sessions; without them SSE reconnections will pinball across workers and lose buffered events. | Infra to enable LB affinity (cookie/IP hash) before scaling `CLUSTER_WORKERS > 1`. Validate in staging with concurrent SSE clients. | Platform / Infra | Before enabling multi-worker prod deploy |
| High | Observability Security | `/metrics` endpoint is unauthenticated and could leak internals externally. | Restrict at ingress (IP allowlist, auth proxy) or expose on internal-only network. Add task to infra backlog. | Platform / Infra | Same sprint as Prometheus enablement |
| High | Data Reliability | Postgres PgBouncer + managed Redis decisions outstanding; current docs assume providers. | Decide on provider (e.g., PgBouncer on Fly.io / RDS + Elasticache). Provision staging, update `DATABASE_URL`/`REDIS_URL`, run soak test. | Infra | 2 weeks |
| High | Backups & DR | Automated PITR/backups not yet configured; `backup-db.sh` is manual. | Integrate with managed Postgres backups or nightly cron pushing dumps to S3. Schedule quarterly restore drill in calendar. | Platform | 3 weeks |
| High | Test Coverage | `npm run lint` / `npm run test` are placeholders; pipeline cannot catch regressions. | Stand up ESLint 9 config + Vitest suites for backend/frontend. Gradually replace stubs, update CI gates. | App Teams | 4 weeks |
| Medium | Build Pipeline | Remote Turborepo cache secrets undecided; CI currently cold each run. | Choose cache backend (Vercel/S3), store `TURBO_*` secrets in GitHub & Railpack, test cache hit rate. | Dev Infra | 2 weeks |
| Medium | Runtime Footprint | `npm prune --omit=dev` assumes bundled outputs include dependencies. Risk if future dynamic requires dev deps. | Document verification step in release checklist; add integration test to ensure runtime has assets before pruning changes. | Platform | Ongoing |
| Medium | Monitoring | Grafana/Alertmanager stack not yet provisioned; metrics exist but no dashboards/alerts. | Hook Prometheus scrape to `/metrics`, build Grafana dashboards for gold signals listed in docs, configure alerts. | Platform SRE | 3 weeks |
| Medium | Realtime UX | Frontend needs to surface SSE resume/replay and fallback banner guidance. | Frontend team to implement resume logic (Last-Event-ID) and error UX per `REALTIME_DELIVERY.md`. | Frontend | Next sprint |
| Medium | Cache Governance | Need ongoing ownership for cache invalidation metrics and BullMQ queue dashboards. | Backend team to add weekly check in runbook; consider integrating Bull Board once access approved. | Backend | Ongoing |
| Medium | Chaos Drills | Fire/chaos drill cadence outlined but not scheduled. | Add quarterly drills to shared calendar; document results in `/docs/incident-logs/`. | Platform | Schedule by Q1 2026 |
| Medium | Data Anonymization | `scripts/db/anonymize.sql` must stay aligned with schema changes to avoid leaking new fields. | Backend to review anonymization + verification scripts whenever Prisma models change; add checklist to PR template. | Backend | Ongoing |
| Low | Preview Deployments | Preview workflow only uploads artifacts; no automated environment spin-up. | Evaluate Railpack/Dokploy API integration or keep manual with documented steps. | Dev Infra | Backlog |
| Low | Job Pipeline | `elo:recalculate` worker logic is placeholder; heavy recalculations pending. | Scope requirements with product, implement job handler, add tests. | Backend Analytics | Backlog |
| Low | Observability Polish | Bull Board or equivalent UI not yet wired up. | Evaluate lightweight dashboard (Bull Board or Grafana panels from metrics) once auth story defined. | Platform | Backlog |
| Low | Stream Growth | Additional realtime topics need explicit opt-in to `STREAM_EVENTS`. | Add checklist for new events to update constants/docs during feature onboarding. | Platform | Ongoing |

**Status Legend:** High = requires action before production rollout; Medium = schedule in near-term roadmap; Low = backlog candidates—justify deferral when prioritizing.

