# Local Setup Guide for TRAYB Customs

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Cairo graphics toolchain for the Discord bot:
  - **Ubuntu/Debian:** `sudo apt install -y libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev`
  - **macOS:** `brew install pkg-config cairo pango libpng jpeg giflib`
  - **Windows (WSL recommended):** use the Ubuntu command above inside WSL

> If you prefer containers for the datastores, run PostgreSQL and Redis however you like—the application itself runs directly on Node.js.

---

## 1. Install Dependencies

```bash
cd trayb-customs
npm install
```

The workspace install pulls dependencies for both the backend and frontend.

---

## 2. Configure Environment Variables

Copy the example file and adjust values for local development:

```bash
cp .env.example .env
```

Key entries:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/trayb_customs?schema=public"
REDIS_URL="redis://localhost:6379"

PORT=4001
HOST="0.0.0.0"
NODE_ENV="development"

JWT_SECRET="generate-a-strong-secret"
SESSION_SECRET="generate-another-strong-secret"
AUTH_SECRET="generate-a-strong-secret-for-nextauth"

DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_REDIRECT_URI="http://localhost:4001/api/core-auth/discord/callback"

NEXT_PUBLIC_API_URL="http://localhost:4001"
NEXT_PUBLIC_APP_URL="http://localhost:4000"
FRONTEND_INTERNAL_URL="http://localhost:4000"
```

---

## 3. Prepare the Database

Ensure PostgreSQL and Redis are running, then:

```bash
cd apps/backend
npx prisma generate
npx prisma migrate dev --name init
```

Optional: view data in Prisma Studio.

```bash
npx prisma studio
```

---

## 4. Start the Services

### Backend (Fastify API + Discord bot)

```bash
cd apps/backend
npm run dev
```

Health check: http://localhost:4001/api/health

### Frontend (Next.js)

```bash
cd apps/frontend
npm run dev
```

Visit http://localhost:4000

> Shortcut: from the project root you can run `npm run dev` to start both servers concurrently.

---

## Useful Commands

```bash
# Backend helpers
cd apps/backend
npx prisma studio               # Browse the database
npx prisma migrate reset        # Reset database (destructive!)
npm run build                   # Production build

# Frontend helpers
cd apps/frontend
npm run lint
npm run build
```

---

## Troubleshooting

### Database connection errors
- Confirm PostgreSQL is reachable at `localhost:5432`
- Verify credentials in `DATABASE_URL`

### Redis connection errors
- Ensure Redis is running on `localhost:6379`
- Confirm `REDIS_URL` matches your instance

### Port already in use
```bash
# macOS/Linux
lsof -i :4000
kill -9 <PID>

# Windows PowerShell
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Prisma client not generated
```bash
cd apps/backend
npx prisma generate
```

---

## Discord OAuth Credentials

1. Go to https://discord.com/developers/applications
2. Create a new application
3. In **OAuth2 → General** copy the Client ID and Client Secret
4. Add `http://localhost:4001/api/core-auth/discord/callback` to Redirects

---

## Questions?

Open an issue on GitHub or reach out on Discord. When you're ready for production, follow the Railpack deployment guide.

