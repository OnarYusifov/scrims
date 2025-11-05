# 🔐 Environment Variables Setup Guide

## 📁 File Structure

```
trayb-customs/
├── .env.example              # Root config (for Docker Compose)
├── .env                      # Your root config (create from .env.example)
├── setup-env.sh              # Auto-setup script
├── apps/
│   ├── backend/
│   │   ├── .env.example      # Backend template
│   │   └── .env              # Backend config (auto-generated)
│   └── frontend/
│       ├── .env.example      # Frontend template
│       └── .env.local        # Frontend config (auto-generated)
```

## 🚀 Quick Setup (Recommended)

### Option 1: Automatic Setup (Easiest)

```bash
# 1. Copy root template
cp .env.example .env

# 2. Edit .env and fill in your values
nano .env  # or use your favorite editor

# 3. Run the setup script (auto-creates app .env files)
npm run setup:env

# Done! ✅
```

### Option 2: Manual Setup

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env

# Frontend
cp apps/frontend/.env.example apps/frontend/.env.local
# Edit apps/frontend/.env.local
```

---

## 📋 Required Variables

### 🔑 **Must Change These:**

1. **POSTGRES_PASSWORD** - Your database password
2. **DISCORD_CLIENT_ID** - From Discord Developer Portal
3. **DISCORD_CLIENT_SECRET** - From Discord Developer Portal
4. **JWT_SECRET** - Random 32+ character string
5. **SESSION_SECRET** - Random 32+ character string

### 🔐 **Generating Secrets:**

```bash
# Option 1: Using OpenSSL (best)
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online generator
# Visit: https://www.uuidgenerator.net/
```

---

## 🎯 Environment Files Explained

### **Root `.env` (Docker Compose)**

Used by Docker Compose to set up PostgreSQL and Redis. Also serves as the source for app-specific configs.

**Purpose:**
- Configure database services
- Single source of truth for shared variables
- Used by `setup-env.sh` to generate app configs

### **Backend `apps/backend/.env`**

Used by the Fastify backend server.

**Key Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- Discord OAuth credentials
- JWT & session secrets

### **Frontend `apps/frontend/.env.local`**

Used by Next.js frontend.

**Key Variables:**
- `NEXT_PUBLIC_API_URL` - Backend API endpoint (must start with `NEXT_PUBLIC_`)

**Note:** Next.js uses `.env.local` for local development (not committed to git)

---

## 🌐 Local Development vs Production

### **Local Development (Ports 4000/4001):**

```env
# Backend
DATABASE_URL=postgresql://trayb:password@localhost:5432/trayb_customs
REDIS_URL=redis://localhost:6379
DISCORD_REDIRECT_URI=http://localhost:4001/api/auth/discord/callback
FRONTEND_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:4000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4001
```

### **Production (Dokploy):**

```env
# Backend
DATABASE_URL=postgresql://trayb:PASSWORD@trayb-postgres:5432/trayb_customs
REDIS_URL=redis://trayb-redis:6379
DISCORD_REDIRECT_URI=https://customs.trayb.az/api/auth/discord/callback
FRONTEND_URL=https://customs.trayb.az
CORS_ORIGIN=https://customs.trayb.az

# Frontend
NEXT_PUBLIC_API_URL=https://api.customs.trayb.az
```

**Key Differences:**
- Use service names (`trayb-postgres`, `trayb-redis`) instead of `localhost`
- Use HTTPS URLs
- Use production domain names

---

## 🔍 Discord OAuth Setup

1. Go to https://discord.com/developers/applications
2. Create new application or select existing
3. Go to **OAuth2** section
4. Copy `CLIENT_ID` and `CLIENT_SECRET`
5. Add redirect URIs:
   - Local: `http://localhost:4001/api/auth/discord/callback`
   - Production: `https://customs.trayb.az/api/auth/discord/callback`

---

## 🐳 Docker Compose Variables

The root `.env` is automatically loaded by Docker Compose:

```yaml
# docker-compose.yml uses these:
POSTGRES_USER=trayb
POSTGRES_PASSWORD=your_password
POSTGRES_DB=trayb_customs
```

---

## ✅ Verification Checklist

After setup, verify everything works:

```bash
# 1. Check files exist
ls -la .env
ls -la apps/backend/.env
ls -la apps/frontend/.env.local

# 2. Start database services
docker-compose up -d postgres redis

# 3. Test backend can connect
cd apps/backend
npx prisma migrate dev  # Should succeed

# 4. Start dev servers
npm run dev

# 5. Check URLs
# Frontend: http://localhost:4000
# Backend: http://localhost:4001
# Backend Health: http://localhost:4001/health
```

---

## 🚨 Troubleshooting

### **Error: Cannot connect to database**
- Check `DATABASE_URL` is correct
- Ensure PostgreSQL is running: `docker-compose ps`
- Check password matches in both `.env` and `DATABASE_URL`

### **Error: Discord OAuth fails**
- Verify `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- Check redirect URI matches Discord Developer Portal
- Ensure `DISCORD_REDIRECT_URI` uses correct port

### **Error: JWT/Session errors**
- Ensure `JWT_SECRET` and `SESSION_SECRET` are set
- Must be at least 32 characters
- Don't use example values

### **Frontend can't reach backend**
- Check `NEXT_PUBLIC_API_URL` is correct
- Ensure backend is running on port 4001
- Try: `curl http://localhost:4001/health`

---

## 📝 Best Practices

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Use different secrets** for development vs production
3. **Rotate secrets** periodically in production
4. **Use strong passwords** for database
5. **Keep `.env.example` updated** when adding new variables

---

## 🔄 Updating Environment

When you change root `.env`:

```bash
# Re-run setup to sync to apps
npm run setup:env

# Or manually copy changes to app .env files
```

---

## 📚 Related Documentation

- [QUICK_START.md](./QUICK_START.md) - Getting started guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [DISCORD_AUTH_SETUP.md](./DISCORD_AUTH_SETUP.md) - Discord OAuth detailed guide

---

**Need help?** Check other docs in `/docs` or create an issue on GitHub.

