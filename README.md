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
cp .env.example .env

# Edit .env and fill in your values:
# - Database credentials
# - Discord OAuth credentials
# - JWT secrets
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
├── nixpacks.toml     # Backend build config for Railpack/Nixpacks
├── nixpacks.frontend.toml # Frontend build config for Railpack/Nixpacks
└── .env.example      # Environment template
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

Copy `.env.example` to `.env` and configure:
```bash
# Required variables:
POSTGRES_PASSWORD=           # Your database password
DISCORD_CLIENT_ID=           # From Discord Developer Portal
DISCORD_CLIENT_SECRET=       # From Discord Developer Portal
JWT_SECRET=                  # Random 32+ character string
SESSION_SECRET=              # Random 32+ character string
AUTH_SECRET=                 # Random 32+ character string (NextAuth session encryption)
```

## 📝 Scripts

```bash
npm run dev              # Start both frontend and backend
npm run dev:backend      # Backend only (PORT 4001)
npm run dev:frontend     # Frontend only (PORT 4000)
npm run build            # Build both apps
npm run start            # Start production servers
```

## 🌐 Deployment

For Railpack production deployment (Nixpacks builds for backend & frontend) see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 📄 License

Private project for Trayb community.
