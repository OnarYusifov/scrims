# TRAYB CUSTOMS

Modern esports-inspired Valorant customs and stats platform for closed-group competitions.

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/OnarYusifov/scrims.git
cd scrims
npm install
```

### 2. Setup Environment
```bash
# Copy environment template
cp config/env.example .env

# Edit .env and fill in secrets/URLs (see config/env.schema.json for details)
vim .env

# Validate and materialize app-specific env files
npm run env:check
npm run setup:env
```

### 3. Start Services
1. **Run PostgreSQL and Redis locally** (or use managed instances):
   - PostgreSQL 16+
   - Redis 7+

2. **Run database migrations**
   ```bash
   cd apps/backend
   npx prisma generate
   npx prisma migrate dev
   cd ../..
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

### 4. Access the Application
- **Frontend:** http://localhost:4000
- **Backend API:** http://localhost:4001

## 📁 Project Structure

```
trayb-customs/
├── apps/
│   ├── frontend/     # Next.js frontend (PORT 4000)
│   └── backend/      # Fastify backend (PORT 4001)
├── docs/             # Documentation
├── config/           # Environment schema + sample template
│   ├── env.schema.json
│   └── env.example
├── nixpacks.toml     # Backend build config for Railpack/Nixpacks
├── nixpacks.frontend.toml # Frontend build config for Railpack/Nixpacks
└── setup-env.sh      # Copies root .env into per-app files
```

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, React, TypeScript, TailwindCSS, Framer Motion
- **Backend:** Fastify, TypeScript, Prisma, PostgreSQL, Redis
- **Realtime:** Discord.js 14, Canvas (for leaderboard rendering)
- **Auth:** Discord OAuth 2.0
- **Deployment:** Railpack (Nixpacks), Cloudflare

## 🤖 Discord Bot

The backend now hosts a Discord bot that keeps your voice channels and results channel in sync with match flow:

- Auto-moves players into the lobby (`1436009958469533726`) when they join a match.
- Splits teams into `Team Alpha` (`1426994984300712027`) and `Team Bravo` (`1426995070590255186`) channels at the start of pick/ban, enforcing 5-player limits.
- Returns everyone to the lobby (or disconnects) when a match finishes and unlocks/reset channel limits.
- Drops a rich match summary embed plus a generated leaderboard image into the results channel (`1436464923365605426`) after stats are submitted.

### Required Environment Variables

Add the following to `apps/backend/.env` (values can live at the root if you centralize envs):

```
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_GUILD_ID=<guild-id>
DISCORD_LOBBY_CHANNEL_ID=1436009958469533726
DISCORD_TEAM_ALPHA_CHANNEL_ID=1426994984300712027
DISCORD_TEAM_BRAVO_CHANNEL_ID=1426995070590255186
DISCORD_RESULTS_CHANNEL_ID=1436464923365605426
```

> The channel IDs above match production defaults. Override them if your staging guild uses different IDs.

### Native Dependencies

The bot renders leaderboard images with `canvas`. When running locally make sure the Cairo toolchain is available:

- **Debian/Ubuntu:** `sudo apt install -y libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev`
  - **Alpine/WSL:** `apk add --no-cache cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev freetype-dev`
- **macOS (Homebrew):** `brew install pkg-config cairo pango libpng jpeg giflib`

## 📚 Documentation

All documentation is in the `/docs` folder:
- [**QUICK_START.md**](./docs/QUICK_START.md) - Fast setup guide
- [**DEPLOYMENT.md**](./docs/DEPLOYMENT.md) - Production deployment (Dokploy)
- [**DISCORD_AUTH_SETUP.md**](./docs/DISCORD_AUTH_SETUP.md) - Discord OAuth setup
- [**LOCAL_SETUP.md**](./docs/LOCAL_SETUP.md) - Detailed local development guide

## 🔐 Environment Variables

- **Source of truth:** `config/env.schema.json` (includes descriptions, scopes, defaults, and required contexts)
- **Template:** `config/env.example` (copy to `.env`)
- **Validation:** `npm run env:check` (local), `npm run env:check:ci` (automation)
- **Syncing:** `npm run setup:env` regenerates `apps/backend/.env` and `apps/frontend/.env.local`

Update the schema whenever new environment configuration is introduced. The CI pipeline runs `npm run env:check:ci` to catch missing/unexpected variables early.

## 📝 Scripts

```bash
npm run dev              # Start both frontend and backend
npm run dev:backend      # Backend only (PORT 4001)
npm run dev:frontend     # Frontend only (PORT 4000)
npm run lint             # Lint all workspaces via Turborepo
npm run test             # Run test targets (placeholder until suites exist)
npm run env:check        # Validate local .env against schema
npm run env:check:ci     # Validate CI/deploy env (no .env file required)
npm run setup:env        # Regenerate app-specific env files from root .env
npm run build            # Build all workspaces with remote cache support
npm run build:backend    # Build backend only via Turborepo
npm run build:frontend   # Build frontend only via Turborepo
npm run start            # Start production servers
npm run loadtest         # Execute the default autocannon scenario (requires sanitized data)
npm run deps:check       # Preview dependency updates (npm-check-updates)
npm run deps:upgrade     # Apply dependency updates and reinstall
npm run deps:audit       # Audit production dependencies (CI uses this)
```

## 🌐 Deployment

For Railpack production deployment (Nixpacks builds for backend & frontend) see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

Realtime/event delivery pipeline details live in [docs/REALTIME_DELIVERY.md](./docs/REALTIME_DELIVERY.md).

CI/CD, dependency automation, and pipeline ownership are described in [docs/CI_CD.md](./docs/CI_CD.md).

Scaling/monitoring/DR runbooks: [docs/SCALING_MONITORING_DR.md](./docs/SCALING_MONITORING_DR.md).

Open risks & follow-up actions: [docs/OPEN_RISKS_ACTIONS.md](./docs/OPEN_RISKS_ACTIONS.md).

Production data safe-use playbook: [docs/PROD_DATA_SAFE_PLAYBOOK.md](./docs/PROD_DATA_SAFE_PLAYBOOK.md).

## 📄 License

Private project for Trayb community.
