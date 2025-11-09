# TRAYB Customs - Project Status Report

_Last updated: 2025-11-09_

## ✅ Foundation Complete

- Workspace monorepo (`apps/backend`, `apps/frontend`)
- Prisma schema with users, matches, stats, Elo history, audit logs
- Fastify backend with JWT auth, Discord OAuth, Redis sessions, rate limiting
- Next.js 16 frontend with Matrix theme, admin panel, profile pages
- Realtime updates via Server-Sent Events (matches, leaderboard, profiles, admin audit log)
- Hybrid Elo system with performance multipliers and Discord role syncing
- Nixpacks configuration for Railpack deployments (`nixpacks.toml`, `nixpacks.frontend.toml`)

## 🚧 Active Enhancements

- Match room polish (stats mismatch fixes, scoreboard ordering)
- Radar skill visualization + detailed stats dialog (in progress)
- Admin tooling refinements (weight profile editor, audit log filters)
- Documentation refresh for Railpack

## 🗺️ Next Up

1. Railpack deployment automation (CI triggers, migration hooks)
2. Discord bot UX improvements (match completion summaries, error reporting)
3. Export pipeline (CSV/JSON for matches & Elo snapshots)
4. Additional profile analytics (rank history, achievement badges)

## 📌 Notes

- Docker artifacts have been removed; use the Railpack guide (`docs/DEPLOYMENT.md`) for production.
- Local development expects PostgreSQL + Redis running on localhost (or your preferred managed instances).
- Keep `.env.example` updated whenever new environment variables are introduced.

