# Project Plan

## Phase 0 – Requirements Alignment
- Confirm service boundaries (`apps/frontend`, `apps/backend`, `apps/bots`) and shared packages (`packages/ui`, `packages/db`, `packages/config`, `packages/types`).
- Decide on auth flows (email/password first, Discord OAuth linkage) and JWT usage patterns (session tokens vs service-to-service).
- Lock infrastructure targets: Dokploy deployment model (single container), Redis/PostgreSQL provisioning, S3-compatible storage vendor.
- Establish coding standards (TypeScript strict, ESLint/Prettier, commit hooks) and testing baseline (`bun test`, Playwright).

## Phase 1 – Monorepo & Tooling Bootstrap
- Initialize Turborepo with Bun (`bunx create-turbo`), configure `tsconfig` path aliases, and strict TypeScript settings.
- Set up shared tooling packages: ESLint + Prettier config, Tailwind config, `zod` schemas shared via `packages/types`.
- Configure GitHub Actions pipeline for lint, `bun test`, and Playwright smoke job.
- Add environment management (`.env.example`, `dotenv-safe`) and document secrets handling within Dokploy.

## Phase 2 – Backend Foundation (`apps/backend`)
- Scaffold Fastify v5 server with Bun entrypoint, Socket.IO server (Redis adapter), and Zod-aware type providers.
- Implement auth primitives: JWT signing utilities, Auth.js-compatible session validation hooks, Discord OAuth handler stubs.
- Wire auto-generated OpenAPI/Scalar docs using Fastify Swagger + Zod schema conversion.
- Integrate Prisma client (`packages/db`) targeting PostgreSQL; add migration workflow with Bun scripts.

## Phase 3 – Frontend Foundation (`apps/frontend`)
- Boot Next.js (App Router) app with Tailwind 4, shadcn/ui, next-intl, nuqs.
- Create auth-aware layout for session guard leveraging Auth.js + JWT validation.
- Establish shared UI primitives and form patterns (react-hook-form + zod resolver) in `packages/ui`.
- Integrate state management scaffolding with Zustand stores and query clients (tRPC or typed fetch hooks).

## Phase 4 – Core Features & Real-time
- Implement real-time messaging/typing flows via Socket.IO client in Next.js, backed by Fastify Socket namespace.
- Build Discord bot services (`apps/control-bot`, `apps/recorder-bot`) using discord.js v14 and shared config package.
- Add Redis caching helpers (session store, rate limiting) and test failover scenarios.
- Set up file/audio pipeline: presigned upload endpoints, S3-compatible storage integration, retention strategy.

## Phase 5 – Quality, Observability, Deployment
- Add bun-driven unit/integration tests for critical modules and Playwright scenarios for auth/admin flows.
- Integrate Sentry (frontend + backend) with performance tracing and release tagging via GitHub Actions.
- Configure Dokploy deployment manifest for single-container release, including health checks and rollout steps.
- Conduct load and chaos testing on Socket.IO + Discord bot interactions; document operational runbooks.

## Phase 6 – Polish & Expansion
- Evaluate feature flag mechanism (lightweight config package or environment-driven toggles).
- Document extension guidelines for additional services/modules to keep architecture modular.
- Backlog future enhancements (analytics tooling, queue worker expansion, multi-region support) based on project priorities.

