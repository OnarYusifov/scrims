# Collaborator Setup Guide

This guide will help you set up the repository as a collaborator from scratch.

## Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/OnarYusifov/scrims.git

# Navigate into the project
cd scrims
```

## Step 2: Verify Your Access

Make sure you have been added as a collaborator to the repository. If you get a "permission denied" error, ask the repository owner to add you as a collaborator on GitHub.

## Step 3: Switch to Dev Branch

```bash
# Check available branches
git branch -a

# Switch to dev branch (this is where we work)
git checkout dev

# Verify you're on dev branch
git branch --show-current
```

## Step 4: Install Dependencies

```bash
# Install all dependencies using Bun
bun install
```

This will install all packages for the monorepo (frontend, backend, and shared packages).

## Step 5: Set Up Environment Variables

Create a `.env` file in the **root directory** (not in app directories):

```bash
# Create .env file
touch .env
```

Add the following configuration to your `.env` file:

```env
# Port Configuration (for your local setup)
FRONTEND_PORT=5000
BACKEND_PORT=5001

# Frontend URLs (for OAuth, email links, etc.)
FRONTEND_URL="http://localhost:5000"
AUTH_URL="http://localhost:5000"
NEXTAUTH_URL="http://localhost:5000"

# Backend API URLs (for local development)
BACKEND_URL="http://localhost:5001"
API_URL="http://localhost:5001"
NEXT_PUBLIC_API_URL="http://localhost:5001"

# Database (your local PostgreSQL connection string)
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Redis (if using locally)
REDIS_URL="redis://localhost:6379"

# JWT Secret (generate a random string)
JWT_SECRET="your-random-secret-here"
JWT_EXPIRES_IN="7d"

# Auth.js / NextAuth Secrets (generate random strings)
AUTH_SECRET="your-random-auth-secret"
NEXTAUTH_SECRET="your-random-auth-secret"

# OAuth Providers
# Get these from Discord/Google developer portals
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Resend (for email sending)
# Get API key from https://resend.com
RESEND_API_KEY="re_your-resend-api-key"
RESEND_FROM_EMAIL="hello@trayb.az"

# Discord Bots (if working with bots)
DISCORD_CONTROL_BOT_TOKEN="your-bot-token"
DISCORD_RECORDER_BOT_1_TOKEN="your-bot-token"
DISCORD_RECORDER_BOT_2_TOKEN="your-bot-token"
```

### Important Notes:

1. **Ports**: Use `5000` and `5001` to avoid conflicts with the main developer
2. **Database**: Set up a local PostgreSQL database or use the shared one
3. **Secrets**: Generate random strings for JWT and Auth secrets (you can use: `openssl rand -hex 32`)
4. **OAuth**: You'll need to set up your own OAuth apps or use test credentials
5. **Resend**: Sign up at https://resend.com for email sending

## Step 6: Set Up Database

### Option A: Use Local PostgreSQL

```bash
# Make sure PostgreSQL is installed and running
# Create a database
createdb scrims_dev

# Update DATABASE_URL in .env to point to your local database
```

### Option B: Use Shared Database

Ask the repository owner for the shared database connection string.

### Run Migrations

```bash
# Navigate to db package
cd packages/db

# Generate Prisma client
bunx prisma generate

# Run migrations
bunx prisma migrate deploy

# Go back to root
cd ../..
```

## Step 7: Configure Git (if not already done)

```bash
# Set your name and email (if not already configured globally)
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## Step 8: Test the Setup

### Start Development Server

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
   - Login page should be accessible

2. **Backend API Docs**: Open `http://localhost:5001/docs`
   - Should show Swagger UI
   - API routes should be visible

3. **Test Registration**:
   - Try registering a new user
   - Check if email is sent (check Resend dashboard)

4. **Test OAuth** (if configured):
   - Try Discord login
   - Try Google login

## Step 9: Understanding the Workflow

### Branch Strategy

- **`main`**: Production-ready code (protected)
- **`dev`**: Development branch (where we collaborate)
- **`feature/*`**: Feature branches for new work

### Working on Features

1. **Create a feature branch from `dev`**:

   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write code
   - Test locally
   - Commit frequently

3. **Push your feature branch**:

   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request**:
   - Go to GitHub
   - Create PR from `feature/your-feature-name` to `dev`
   - Wait for review and approval
   - Merge when approved

### Syncing with Latest Changes

When you want to get the latest changes:

```bash
# Make sure you're on dev branch
git checkout dev

# Pull latest changes
git pull origin dev

# If you're on a feature branch, merge dev into it
git checkout feature/your-feature-name
git merge dev
```

## Step 10: Daily Workflow

### Starting Work

```bash
# 1. Pull latest changes
git checkout dev
git pull origin dev

# 2. Create/switch to feature branch
git checkout -b feature/your-feature-name
# OR if branch exists:
git checkout feature/your-feature-name
git merge dev  # Get latest changes

# 3. Start dev server
bun run dev
```

### Committing Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature-name
```

### Before Creating PR

```bash
# Make sure your branch is up to date
git checkout dev
git pull origin dev
git checkout feature/your-feature-name
git merge dev

# Run tests/lint
bun run lint
bun run check-types

# Push updated branch
git push origin feature/your-feature-name
```

## Troubleshooting

### Issue: "Permission denied" when cloning

**Solution**: Make sure you've been added as a collaborator. Contact the repository owner.

### Issue: "Cannot find module" errors

**Solution**:

```bash
# Reinstall dependencies
rm -rf node_modules
bun install
```

### Issue: Database connection errors

**Solution**:

1. Check PostgreSQL is running: `pg_isready`
2. Verify `DATABASE_URL` in `.env`
3. Run migrations: `cd packages/db && bunx prisma migrate deploy`

### Issue: Port already in use

**Solution**:

```bash
# Find what's using the port
lsof -i :5000
lsof -i :5001

# Kill the process or change ports in .env
```

### Issue: OAuth not working locally

**Solution**:

1. Make sure OAuth redirect URIs include `http://localhost:5000`
2. Check `AUTH_URL` and `NEXTAUTH_URL` in `.env`
3. Verify OAuth credentials are correct

## Quick Reference Commands

```bash
# Clone repository
git clone https://github.com/OnarYusifov/scrims.git
cd scrims

# Switch to dev branch
git checkout dev

# Install dependencies
bun install

# Set up database
cd packages/db
bunx prisma generate
bunx prisma migrate deploy
cd ../..

# Start dev server
bun run dev

# Create feature branch
git checkout -b feature/your-feature-name

# Pull latest changes
git checkout dev
git pull origin dev

# Sync feature branch
git checkout feature/your-feature-name
git merge dev
```

## Getting Help

If you encounter issues:

1. Check this guide
2. Check `docs/FRIEND_SYNC_GUIDE.md` for sync instructions
3. Check `docs/API_SUBDOMAIN_MIGRATION.md` for API changes
4. Ask for help in your collaboration channel

## Summary Checklist

- [ ] Cloned repository
- [ ] Switched to `dev` branch
- [ ] Installed dependencies (`bun install`)
- [ ] Created `.env` file with correct configuration
- [ ] Set up database and ran migrations
- [ ] Started dev server (`bun run dev`)
- [ ] Verified frontend works (`http://localhost:5000`)
- [ ] Verified backend works (`http://localhost:5001/docs`)
- [ ] Tested registration/email sending
- [ ] Ready to start developing! ✅
