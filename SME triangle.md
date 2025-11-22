# SME Triangle Improvement Plan

Goal: reach **10/10** for Scalability, Modularity, and Ease of Editing before building new API features. Use this checklist to guide prep work and ongoing guardrails.

---

## Scalability

1. Add Redis/KeyDB caches for expensive `/admin/stats/*` aggregations. _(Phase 2 – Schedule Soon)_
2. Move heavy analytics (ELO, match stats) to background jobs and serve precomputed snapshots. _(Phase 2 – Schedule Soon)_
3. Introduce read replicas or separate Prisma clients for analytics vs transactional traffic. _(Phase 2 – Schedule Soon)_
4. Implement per-route rate limiting to prevent stampedes. _(Phase 2 – Schedule Soon)_
5. Replace offset pagination with cursor-based pagination for large tables. _(Phase 2 – Schedule Soon)_
6. Add circuit breakers/retries for external integrations (Discord bots, Random.org, future GRID). _(Phase 3 – Prepare/Delegate)_
7. Tune Fastify keep-alive and compression settings for high throughput. _(Phase 3 – Prepare/Delegate)_
8. Instrument Prometheus metrics (latency, throughput, DB timings) plus alerting. _(Phase 2 – Schedule Soon)_
9. Configure Prisma connection pooling with deployment-aware limits. _(Phase 2 – Schedule Soon)_
10. Plan an OLAP-friendly store (e.g., ClickHouse/BigQuery) for historical stats so the primary DB isn’t overloaded. _(Phase 2 – Schedule Soon)_
11. Use queues (BullMQ/RabbitMQ) for match completion → ELO recalculations/events. _(Phase 2 – Schedule Soon)_
12. Add backpressure handling and graceful shutdown logic. _(Phase 2 – Schedule Soon)_
13. Snapshot analytics datasets nightly for quick recovery. _(Phase 3 – Prepare/Delegate)_
14. Introduce feature flags + staged rollouts to limit blast radius. _(Phase 3 – Prepare/Delegate)_
15. Add chaos testing or fault injection to validate resilience. _(Phase 2 – Schedule Soon)_
16. Serve recordings via CDN with signed URLs to offload bandwidth. _(Phase 3 – Prepare/Delegate)_
17. Shard or partition audit logs and large tables to keep queries fast. _(Phase 2 – Schedule Soon)_
18. Define autoscaling policies and health probes per service. _(Phase 2 – Schedule Soon)_
19. Enable distributed tracing (OpenTelemetry) across backend + bots. _(Phase 2 – Schedule Soon)_
20. Document SLOs and capacity plans so scaling work stays intentional. _(Phase 2 – Schedule Soon)_

## Modularity

21. Split giant route modules into `controller/service/repository` layers. _(Phase 1 – Do Now)_
22. Extract shared admin auth/RBAC middleware into a reusable Fastify plugin. _(Phase 1 – Do Now)_
23. Move schema definitions into dedicated files and share them across backend/frontend. _(Phase 1 – Do Now)_
24. Create domain services (PlayerService, StatsService, etc.) with unit tests. _(Phase 1 – Do Now)_
25. Introduce interfaces for stats storage so swapping data sources is configuration-only. _(Phase 2 – Schedule Soon)_
26. Auto-discover module routes instead of manually importing each register function. _(Phase 2 – Schedule Soon)_
27. Apply dependency inversion: handlers depend on interfaces, not Prisma directly. _(Phase 2 – Schedule Soon)_
28. Consolidate repeated Prisma selectors/mappers into utilities. _(Phase 1 – Do Now)_
29. Centralize error handling with typed errors + consistent JSON responses. _(Phase 2 – Schedule Soon)_
30. Adopt an event-driven pattern for admin actions to reuse events between modules/jobs. _(Phase 2 – Schedule Soon)_
31. Use DTOs for responses to decouple transport from persistence. _(Phase 2 – Schedule Soon)_
32. Build a reusable RBAC/permission matrix component for route + component checks. _(Phase 1 – Do Now)_
33. Modularize background jobs per domain (players, matches, stats). _(Phase 2 – Schedule Soon)_
34. Provide a backend SDK/client for other services to consume admin APIs consistently. _(Phase 2 – Schedule Soon)_
35. Define clear module boundaries in docs (inputs, outputs, owned tables). _(Phase 1 – Do Now)_

## Ease of Editing

36. Keep files under ~300 lines; split schemas, handlers, helpers into focused files. _(Phase 1 – Do Now)_
37. Generate OpenAPI automatically from Zod to avoid duplicated JSON schema. _(Phase 1 – Do Now)_
38. Add README per module explaining data models, routes, testing instructions. _(Phase 1 – Do Now)_
39. Write unit tests for mappers/helpers (e.g., `mapUserToPlayerDetail`) to guard refactors. _(Phase 2 – Schedule Soon)_
40. Provide sample fixtures/Postman collections for every endpoint. _(Phase 2 – Schedule Soon)_
41. Enforce ESLint + Prettier + import order on backend TypeScript. _(Phase 1 – Do Now)_
42. Add DevContainer or setup script for one-command backend onboarding. _(Phase 2 – Schedule Soon)_
43. Centralize shared enums/types in `packages/types` for backend + frontend. _(Phase 1 – Do Now)_
44. Add commit hooks for lint, test, and type checks. _(Phase 2 – Schedule Soon)_
45. Document environment variables with validation (envsafe/Zod) at startup. _(Phase 1 – Do Now)_
46. Maintain seed data per module (players, stats, multikill examples) for testing. _(Phase 1 – Do Now)_
47. Add docstrings/JSDoc atop every route/service explaining behavior and invariants. _(Phase 1 – Do Now)_
48. Standardize logging via Pino with child loggers per module. _(Phase 1 – Do Now)_
49. Maintain architectural decision records (ADR) describing why patterns exist. _(Phase 1 – Do Now)_
50. Keep a changelog of API adjustments so frontend/admin tooling stays in sync. _(Phase 1 – Do Now)_

---

**Usage:** prioritize foundational items (shared middleware, schema generation, env validation, logging) before new API work, then tackle domain-specific tasks as each module evolves. Leave heavier infra (caching, OLAP, chaos tests) until core routes exist but keep hooks/config ready.
