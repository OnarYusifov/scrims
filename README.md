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
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run database migrations
cd apps/backend
npx prisma generate
npx prisma migrate dev
cd ../..

# Start development servers
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
├── docs/             # All documentation
├── docker/           # Docker configs
└── .env.example      # Environment template
```

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, React, TypeScript, TailwindCSS, Framer Motion
- **Backend:** Fastify, TypeScript, Prisma, PostgreSQL, Redis
- **Auth:** Discord OAuth 2.0
- **Deployment:** Dokploy, Docker, Cloudflare

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
```

## 🐳 Docker Commands

```bash
# Development
npm run docker:dev         # Start all services
npm run docker:down        # Stop all services
npm run docker:logs        # View logs

# Production
docker-compose -f docker-compose.prod.yml up -d
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

For production deployment to Dokploy, see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 📄 License

Private project for Trayb community.
