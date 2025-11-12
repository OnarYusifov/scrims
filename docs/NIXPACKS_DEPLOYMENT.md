# 🚀 Nixpacks Deployment Guide (Dokploy)

This guide covers deploying the TRAYB Customs platform as a **single unified service** on Dokploy using Nixpacks. Both the backend and frontend run in one service with path-based routing.

## 📋 Quick Steps for Path-Based Routing

### **1. Run Database Migrations (CRITICAL - Do this first!)**

In Dokploy → Application → **Shell/Terminal**:

```bash
cd /app/apps/backend
npm run prisma:migrate:deploy
```

Or use the **Console** feature in Dokploy to run:
```bash
npx prisma migrate deploy --schema=./apps/backend/prisma/schema.prisma
```

**⚠️ This must be done before the app can work!** The database tables don't exist yet.

---

### **2. Configure Path-Based Routing in Dokploy**

Since we're running both backend and frontend in a single service, configure path-based routing to expose both on the same domain:

#### **Application Configuration**

In Dokploy → Application → **Domains** tab:

1. **Add domain for backend API:**
   - **Host**: `customs.trayb.az`
   - **Path**: `/api`
   - **Container Port**: `4001`
   - **HTTPS**: ✅ Enabled

2. **Add domain for frontend:**
   - **Host**: `customs.trayb.az`
   - **Path**: `/` (root)
   - **Container Port**: `4000`
   - **HTTPS**: ✅ Enabled

**Traefik will automatically route:**
- `/api/*` → Backend (port 4001)
- `/*` → Frontend (port 4000)

---

### **3. Update Environment Variables**

In Dokploy → Application → **Environment** tab, set all environment variables for both backend and frontend:

```bash
# Node Environment
NODE_ENV=production

# Backend configuration
PORT=4001
HOST=0.0.0.0

# Database and Cache
DATABASE_URL=postgresql://postgres:password@customs-postgres-dnycvg:5432/customs_db
REDIS_URL=redis://defa2351245143513451345345314lt:ytxvhhs3d123432648129374051234dpj7qmo@customs-redis-9kuozx:6379

# URLs and CORS
FRONTEND_URL=https://customs.trayb.az
CORS_ORIGIN=https://customs.trayb.az
FRONTEND_INTERNAL_URL=http://localhost:4000

# Frontend public URLs
NEXT_PUBLIC_API_URL=https://customs.trayb.az
NEXT_PUBLIC_APP_URL=https://customs.trayb.az
NEXTAUTH_URL=https://customs.trayb.az

# Discord OAuth
DISCORD_CLIENT_ID=<your-discord-client-id>
DISCORD_CLIENT_SECRET=<your-discord-client-secret>
DISCORD_REDIRECT_URI=https://customs.trayb.az/api/core-auth/discord/callback

# Secrets
JWT_SECRET=<your-jwt-secret>
SESSION_SECRET=<your-session-secret>
AUTH_SECRET=<your-auth-secret>
```

---

### **4. Update Discord OAuth Redirect URI**

1. Go to **Discord Developer Portal**: https://discord.com/developers/applications
2. Select your application
3. Go to **OAuth2** → **Redirects**
4. **Update** redirect URI to:
   ```
   https://customs.trayb.az/api/core-auth/discord/callback
   ```
5. **Save Changes**

---

### **5. Deploy the Application**

1. **Deploy the unified service** (to pick up new env vars and domain config)
2. **Run database migrations** (see step 1)
3. **Clear browser cache** and test!

---

## 🔍 Nixpacks Configuration

The unified `nixpacks.toml` builds both backend and frontend in a single service:

### **`nixpacks.toml` (Root)**
```toml
[variables]
NODE_ENV = "production"

[phases.setup]
nixPkgs = ["nodejs_22"]
aptPackages = [
  "build-essential",
  "python3",
  "pkg-config",
  "libcairo2-dev",
  "libpango1.0-dev",
  "libjpeg-dev",
  "libgif-dev",
  "librsvg2-dev",
  "libpng-dev",
  "libpixman-1-dev",
  "zlib1g-dev"
]

[phases.install]
cmds = [
  "npm ci"
]

[phases.build]
cmds = [
  "npx prisma generate --schema=./apps/backend/prisma/schema.prisma",
  "turbo run build --filter=@trayb/backend --filter=@trayb/frontend",
  "npm prune --omit=dev"
]

[build]
cacheDirectories = [
  "node_modules",
  "apps/backend/node_modules",
  "apps/frontend/node_modules",
  ".turbo"
]

[start]
cmd = "npm run start"
```

The start command runs both services:
- Backend on port 4001
- Frontend on port 4000

---

## ✅ Verification Checklist

After deploying:

- [ ] **Frontend loads**: `https://customs.trayb.az`
- [ ] **Backend health check**: `https://customs.trayb.az/api/health` returns JSON
- [ ] **Database migrations run**: No "table does not exist" errors
- [ ] **Login works**: Click login → Discord OAuth → Success
- [ ] **No CORS errors**: Check browser console
- [ ] **No Redis errors**: Check application logs

---

## 🐛 Troubleshooting

### **"Table does not exist" error**
→ Run migrations: `npm run prisma:migrate:deploy` in application shell

### **404 on `/api/*` routes**
→ Check application domain has path `/api` configured in Dokploy

### **OAuth redirect error**
→ Verify Discord redirect URI matches exactly: `https://customs.trayb.az/api/core-auth/discord/callback`

### **CORS errors**
→ Verify `CORS_ORIGIN=https://customs.trayb.az` in environment variables

---

## 📝 Notes

- **Nixpacks** auto-detects Node.js and runs `npm install` and `npm run build`
- **Migrations** must be run manually (or add to startup script)
- **Path-based routing** works better with Cloudflare SSL
- **Single domain** = simpler SSL/TLS management
- **Single service** = easier configuration and management

