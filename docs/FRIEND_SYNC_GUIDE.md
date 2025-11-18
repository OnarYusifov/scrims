# Step-by-Step Guide: Catching Up with Latest Changes

This guide will help you sync your local environment with the latest changes, including the API subdomain migration and email sending fixes.

## Prerequisites

- Git installed
- Bun installed
- Access to the repository

## Step 1: Navigate to Project Directory

```bash
cd /path/to/scrims
```

## Step 2: Check Current Branch

```bash
git branch --show-current
```

If you're not on `dev` branch, switch to it:

```bash
git checkout dev
```

## Step 3: Pull Latest Changes

```bash
# Fetch all remote changes
git fetch origin

# Pull latest changes from dev branch
git pull origin dev
```

### If you get "refusing to merge unrelated histories" error:

This happens when your local repository has a different history than the remote. Use this command:

```bash
# Allow merging unrelated histories
git pull origin dev --allow-unrelated-histories
```

If you still have conflicts after this, you may need to:
- Stash your changes: `git stash`
- Pull: `git pull origin dev --allow-unrelated-histories`
- Apply your changes: `git stash pop`
- Resolve any conflicts manually

### Alternative: Start Fresh (if you don't have important local changes)

If you don't have important local changes and want to start fresh:

```bash
# Backup your current work (if any)
# Then remove the local repository and clone fresh
cd ..
rm -rf scrims  # Only if you don't have important changes!
git clone <repository-url> scrims
cd scrims
git checkout dev
```

## Step 4: Install/Update Dependencies

```bash
# Install all dependencies (including new ones)
bun install
```

## Step 5: Update Environment Variables

### Check Your `.env` File

Make sure your `.env` file in the **root directory** has the following configuration:

```env
# Port Configuration (for your local setup)
FRONTEND_PORT=5000
BACKEND_PORT=5001

# Frontend URLs (for OAuth, email links, etc.)
FRONTEND_URL="http://localhost:5000"
AUTH_URL="http://localhost:5000"
NEXTAUTH_URL="http://localhost:5000"

# Backend API URLs
# IMPORTANT: For local development, use localhost with your ports
BACKEND_URL="http://localhost:5001"
API_URL="http://localhost:5001"
NEXT_PUBLIC_API_URL="http://localhost:5001"

# Database (your local database URL)
DATABASE_URL="postgresql://..."

# Redis (if using)
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret"
JWT_EXPIRES_IN="7d"

# Auth.js / NextAuth
AUTH_SECRET="your-auth-secret"
NEXTAUTH_SECRET="your-auth-secret"

# OAuth Providers (your credentials)
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Resend (for email sending)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="hello@trayb.az"

# Other environment variables...
```

### Key Changes to Note:

1. **API Routes Changed**: Backend routes no longer have `/api` prefix
   - Old: `http://localhost:5001/api/auth/register`
   - New: `http://localhost:5001/auth/register`

2. **API_URL vs BACKEND_URL**:
   - `API_URL`: Used for server-side API calls (Next.js API routes → Backend)
   - `BACKEND_URL`: Same as API_URL for local development
   - `NEXT_PUBLIC_API_URL`: Used for client-side calls (browser → Backend)

3. **Port Configuration**: Use `FRONTEND_PORT` and `BACKEND_PORT` from `.env` (no hardcoding)

## Step 6: Run Database Migrations (if needed)

```bash
# Navigate to the db package
cd packages/db

# Run migrations
bunx prisma migrate deploy

# Or if you need to generate Prisma client
bunx prisma generate

# Go back to root
cd ../..
```

## Step 7: Test the Setup

### Start the Development Server

```bash
# From root directory
bun run dev
```

This should start:
- Frontend on `http://localhost:5000`
- Backend on `http://localhost:5001`

### Verify Everything Works

1. **Frontend**: Open `http://localhost:5000`
   - Should load without errors
   - Login page should work

2. **Backend API Docs**: Open `http://localhost:5001/docs`
   - Should show Swagger UI
   - Note: Routes are now `/auth/*` instead of `/api/auth/*`

3. **Test Registration**:
   - Try registering a new user
   - Check if email is sent (check Resend dashboard)
   - Verify email verification works

4. **Test OAuth**:
   - Try Discord login
   - Try Google login
   - Both should work correctly

## Step 8: Understanding the Changes

### What Changed?

1. **API Subdomain Migration**:
   - Backend routes moved from `/api/*` to `/*`
   - In production: `api.trayb.az` handles backend, `beta.trayb.az` handles frontend
   - In local: Both run on localhost with different ports

2. **Email Sending Fix**:
   - Fixed React Email rendering with Bun
   - `react-dom/server` is now properly configured
   - Email sending should work correctly

3. **Environment Variables**:
   - Centralized `.env` in root directory
   - Port configuration via `FRONTEND_PORT` and `BACKEND_PORT`
   - No hardcoded ports

### File Structure

```
scrims/
├── .env                    # Root .env file (ONE FILE ONLY)
├── apps/
│   ├── frontend/          # Next.js frontend
│   │   └── app/
│   │       └── api/       # Frontend API routes (proxy to backend)
│   └── backend/           # Fastify backend
│       └── src/
│           └── routes/    # Backend routes (no /api prefix)
└── packages/
    └── db/                # Prisma database
```

## Troubleshooting

### Issue: "Cannot find module 'react-dom/server'"

**Solution**: Make sure `react-dom` is installed:
```bash
cd apps/backend
bun add react-dom
cd ../..
```

### Issue: "Port already in use"

**Solution**: Check what's using the port and kill it, or change ports in `.env`:
```bash
# Find process using port 5000
lsof -i :5000

# Kill it
kill -9 <PID>
```

### Issue: "Database connection error"

**Solution**: 
1. Check your `DATABASE_URL` in `.env`
2. Make sure PostgreSQL is running
3. Run migrations: `cd packages/db && bunx prisma migrate deploy`

### Issue: "OAuth not working"

**Solution**:
1. Check `AUTH_URL` and `NEXTAUTH_URL` in `.env` (should be `http://localhost:5000`)
2. Verify OAuth provider credentials are correct
3. Check OAuth redirect URIs in provider dashboards:
   - Discord: `http://localhost:5000/api/auth/callback/discord`
   - Google: `http://localhost:5000/api/auth/callback/google`

### Issue: "Email not sending"

**Solution**:
1. Check `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env`
2. Verify Resend API key is valid
3. Check Resend dashboard for errors
4. Make sure `react-dom` is installed in `apps/backend`

## Quick Sync Script

You can also use the provided sync script:

```bash
# Make it executable (first time only)
chmod +x sync-for-friend.sh

# Run it
./sync-for-friend.sh
```

This script will:
- Switch to `dev` branch
- Pull latest changes
- Add port configuration to `.env` if missing

## Next Steps After Syncing

1. **Review Changes**: Check `docs/API_SUBDOMAIN_MIGRATION.md` for details
2. **Test Locally**: Make sure everything works on your machine
3. **Continue Development**: You can now work on new features
4. **Create Feature Branch**: When starting new work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Need Help?

If you encounter any issues:
1. Check the error messages carefully
2. Review this guide again
3. Check `docs/API_SUBDOMAIN_MIGRATION.md` for API changes
4. Ask for help in your collaboration channel

## Summary Checklist

- [ ] Pulled latest changes from `dev` branch
- [ ] Installed/updated dependencies (`bun install`)
- [ ] Updated `.env` file with correct ports and URLs
- [ ] Ran database migrations (if needed)
- [ ] Started dev server (`bun run dev`)
- [ ] Tested frontend (`http://localhost:5000`)
- [ ] Tested backend API docs (`http://localhost:5001/docs`)
- [ ] Tested registration and email sending
- [ ] Tested OAuth login (Discord/Google)
- [ ] Everything works! ✅

