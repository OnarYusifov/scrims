# 🚀 Quick Start Guide

## Prerequisites
- Node.js 20+
- PostgreSQL
- Redis
- Discord Application (for OAuth)

## Setup Steps

### 1. Clone and Install
```bash
git clone https://github.com/OnarYusifov/scrims.git
cd scrims
npm install
```

### 2. Setup Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env and fill in:
# - POSTGRES_PASSWORD
# - DISCORD_CLIENT_ID
# - DISCORD_CLIENT_SECRET
# - JWT_SECRET (generate random 32+ char string)
# - SESSION_SECRET (generate random 32+ char string)
# - AUTH_SECRET (generate random 32+ char string for NextAuth)
```

### 3. Run Database Migrations
```bash
cd apps/backend
npx prisma generate
npx prisma migrate dev
```

### 4. Start Development Servers
```bash
# From root directory
npm run dev

# Or individually:
npm run dev:backend  # Runs on http://localhost:4001
npm run dev:frontend # Runs on http://localhost:4000
```

## Ports
- **Frontend:** http://localhost:4000
- **Backend API:** http://localhost:4001
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

## Documentation
All documentation is in the `/docs` folder:
- `DEPLOYMENT.md` - Production deployment guide
- `DISCORD_AUTH_SETUP.md` - Discord OAuth setup
- `LOCAL_SETUP.md` - Detailed local development setup

## Need Help?
Check the other docs in the `/docs` folder or create an issue on GitHub.

