# Local Setup Guide for TRAYB Customs

## Prerequisites

Before starting, you need:
- Node.js 18+ installed
- PostgreSQL 16 (or use Docker Desktop for just Postgres + Redis)
- Redis (or use Docker Desktop)
- Cairo graphics toolchain for the Discord bot's Canvas rendering:
  - **Ubuntu/Debian:** `sudo apt install -y libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev`
  - **Alpine (WSL/Docker):** `apk add --no-cache cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev freetype-dev`
  - **macOS:** `brew install pkg-config cairo pango libpng jpeg giflib`

## Option 1: Using Docker Desktop (Recommended)

If you have Docker Desktop installed:

### 1. Start only PostgreSQL and Redis (not the full app)

```bash
# Navigate to project root
cd "C:\Users\Onarbay\Documents\trayb leaderboard"

# Start only database services
docker-compose up -d postgres redis

# Check they're running
docker-compose ps
```

### 2. Stop all Docker containers (if needed)

```bash
# Stop all services
docker-compose down

# Or stop specific services
docker-compose stop postgres redis

# To remove volumes as well (fresh start)
docker-compose down -v
```

---

## Option 2: Install PostgreSQL and Redis Locally (Windows)

### Install PostgreSQL
1. Download from: https://www.postgresql.org/download/windows/
2. Install with default settings (port 5432)
3. Remember your postgres password!

### Install Redis
1. Download from: https://github.com/microsoftarchive/redis/releases
2. Or use WSL2: `wsl -d Ubuntu sudo service redis-server start`

---

## Full Local Setup (After DB is Running)

### Step 1: Install Dependencies

```bash
# Navigate to project root
cd "C:\Users\Onarbay\Documents\trayb leaderboard"

# Install root dependencies
npm install

# Install backend dependencies
cd apps/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ../..
```

### Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy example (if it exists) or create manually
# .env file contents:

DATABASE_URL="postgresql://postgres:password@localhost:5432/trayb_customs?schema=public"
REDIS_URL="redis://localhost:6379"

PORT=3001
HOST="0.0.0.0"
NODE_ENV="development"

JWT_SECRET="your-super-secret-jwt-key-change-this"
SESSION_SECRET="your-super-secret-session-key-change-this"
JWT_EXPIRATION="7d"

# Discord OAuth (get from Discord Developer Portal)
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_CALLBACK_URL="http://localhost:3001/auth/discord/callback"
DISCORD_WHITELISTED_IDS="your-discord-user-id"

NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Elo Configuration
ELO_START_RATING=800
ELO_CALIBRATION_MATCHES=10
ELO_CALIBRATION_K_FACTOR=48
ELO_NORMAL_K_FACTOR=32
ELO_HIGH_ELO_K_FACTOR=24
ELO_HIGH_ELO_THRESHOLD=1600
ELO_MAX_CHANGE_PER_SERIES=150

# Logging
LOG_LEVEL="info"
PRETTY_LOGS="true"

# CORS
CORS_ORIGIN="http://localhost:3000"
```

### Step 3: Set Up the Database

```bash
# Navigate to backend
cd apps/backend

# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to see your database
npx prisma studio
```

### Step 4: Start the Backend Server

```bash
# From apps/backend directory
npm run dev

# You should see:
# ╔════════════════════════════════════════╗
# ║   TRAYB Customs Backend API Server    ║
# ║   Status: ✓ Running                    ║
# ║   Port: 3001                           ║
# ╚════════════════════════════════════════╝
```

Test the backend:
- Open browser to: http://localhost:3001/health
- You should see: `{"status":"ok","timestamp":"...","services":{"database":"connected","redis":"..."}}`

### Step 5: Start the Frontend Server

Open a NEW terminal window:

```bash
# Navigate to frontend
cd "C:\Users\Onarbay\Documents\trayb leaderboard\apps\frontend"

# Start dev server
npm run dev

# You should see:
# ▲ Next.js 15.1.0
# - Local:        http://localhost:3000
```

### Step 6: Test the Application

Open your browser to: http://localhost:3000

You should see:
- ✅ Matrix-themed landing page
- ✅ Animated Matrix rain effect
- ✅ TRAYB Customs header
- ✅ Navigation links
- ✅ Theme toggle working

---

## Quick Commands Reference

### Start Everything (from project root)

```bash
# Start both backend and frontend
npm run dev

# Or separately:
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only
```

### Database Commands

```bash
cd apps/backend

# View database in browser
npx prisma studio

# Reset database (careful - deletes all data!)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name your_migration_name

# Generate Prisma client (after schema changes)
npx prisma generate
```

### Docker Commands (if using Docker Desktop)

```bash
# Start databases only
docker-compose up -d postgres redis

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Stop databases
docker-compose stop postgres redis

# Stop and remove everything
docker-compose down

# Stop and remove with volumes (fresh start)
docker-compose down -v
```

---

## Troubleshooting

### Backend won't start - Database connection error

**Problem:** `Can't reach database server at localhost:5432`

**Solutions:**
1. Check PostgreSQL is running: `docker-compose ps` or Windows Services
2. Check DATABASE_URL in .env file
3. Verify port 5432 is not in use: `netstat -an | findstr 5432`

### Backend won't start - Redis connection error

**Problem:** `Could not connect to Redis`

**Solutions:**
1. Check Redis is running: `docker-compose ps` or `redis-cli ping`
2. Check REDIS_URL in .env file
3. Try: `docker-compose restart redis`

### Frontend can't connect to backend

**Problem:** Network errors in browser console

**Solutions:**
1. Verify backend is running on port 3001
2. Check NEXT_PUBLIC_API_URL in .env
3. Check CORS settings in backend

### Port already in use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**
```bash
# Find process using port
netstat -ano | findstr :3000

# Kill process by PID
taskkill /PID <PID> /F

# Or use different port
# Frontend: Change in package.json or: npm run dev -- -p 3001
# Backend: Change PORT in .env
```

### Prisma Client not generated

**Problem:** `@prisma/client did not initialize yet`

**Solution:**
```bash
cd apps/backend
npx prisma generate
```

---

## Development Workflow

### 1. Daily Start

```bash
# Terminal 1: Start databases
docker-compose up -d postgres redis

# Terminal 2: Start backend
cd apps/backend
npm run dev

# Terminal 3: Start frontend
cd apps/frontend
npm run dev
```

### 2. Making Database Changes

```bash
# 1. Edit apps/backend/prisma/schema.prisma
# 2. Create migration:
cd apps/backend
npx prisma migrate dev --name your_change

# 3. Prisma Client updates automatically
```

### 3. Viewing Database

```bash
cd apps/backend
npx prisma studio
# Opens at http://localhost:5555
```

### 4. Stopping Everything

```bash
# Ctrl+C in each terminal (backend, frontend)

# Stop databases
docker-compose stop postgres redis

# Or stop everything
docker-compose down
```

---

## What Works Right Now

✅ **Backend:**
- Server starts on port 3001
- Health check endpoint working
- Database connection established
- Redis connection established
- JWT & session plugins loaded
- CORS configured
- Rate limiting active

✅ **Frontend:**
- Next.js 15 running on port 3000
- Matrix rain animation
- Theme toggle (dark mode)
- Toast notifications
- Responsive layout
- All components rendering

❌ **Not Yet Implemented:**
- API routes (auth, matches, users, admin)
- Authentication flow
- Match creation UI
- Leaderboard
- Admin dashboard

See PROJECT_STATUS.md for full implementation roadmap.

---

## Next Steps After Setup

1. **Test the health endpoint:** http://localhost:3001/health
2. **View the landing page:** http://localhost:3000
3. **Open Prisma Studio:** http://localhost:5555 (after `npx prisma studio`)
4. **Start building:** Follow PROJECT_STATUS.md for next implementation steps

---

## Getting Discord OAuth Credentials

To enable Discord login:

1. Go to: https://discord.com/developers/applications
2. Create New Application → Name it "TRAYB Customs"
3. Go to OAuth2 → General
4. Copy Client ID and Client Secret
5. Add Redirect: `http://localhost:3001/auth/discord/callback`
6. Go to OAuth2 → URL Generator
7. Select scopes: `identify`, `email`
8. Get your Discord User ID:
   - Enable Developer Mode in Discord (User Settings → Advanced)
   - Right-click your profile → Copy ID
9. Add to .env file

---

## Support

- Check PROJECT_STATUS.md for architecture details
- View Prisma schema: apps/backend/prisma/schema.prisma
- Backend code: apps/backend/src/
- Frontend code: apps/frontend/src/

Good luck! 🚀

