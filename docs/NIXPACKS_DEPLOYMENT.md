# 🚀 Nixpacks Deployment Guide (Dokploy)

## 📋 Quick Steps for Path-Based Routing

### **1. Run Database Migrations (CRITICAL - Do this first!)**

In Dokploy → Backend App → **Shell/Terminal**:

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

#### **Backend App Configuration**

In Dokploy → Backend App → **Domains** tab:

1. **Remove** `api.customs.trayb.az` domain (if it exists)
2. **Add** new domain:
   - **Host**: `customs.trayb.az`
   - **Path**: `/api`
   - **Container Port**: `4001`
   - **HTTPS**: ✅ Enabled

#### **Frontend App Configuration**

In Dokploy → Frontend App → **Domains** tab:

1. Make sure domain is:
   - **Host**: `customs.trayb.az`
   - **Path**: `/` (root)
   - **Container Port**: `4000`
   - **HTTPS**: ✅ Enabled

**Traefik will automatically route:**
- `/api/*` → Backend (port 4001)
- `/*` → Frontend (port 4000)

---

### **3. Update Environment Variables**

#### **Backend Environment Variables**

In Dokploy → Backend App → **Environment** tab, update:

```bash
# Change from api.customs.trayb.az to customs.trayb.az/api
DISCORD_REDIRECT_URI=https://customs.trayb.az/api/core-auth/discord/callback
CORS_ORIGIN=https://customs.trayb.az
FRONTEND_URL=https://customs.trayb.az

# Keep these as they are
PORT=4001
HOST=0.0.0.0
NODE_ENV=production
DATABASE_URL=postgresql://postgres:password@customs-postgres-dnycvg:5432/customs_db
REDIS_URL=redis://defa2351245143513451345345314lt:ytxvhhs3d123432648129374051234dpj7qmo@customs-redis-9kuozx:6379
JWT_SECRET=<your-jwt-secret>
SESSION_SECRET=<your-session-secret>
DISCORD_CLIENT_ID=<your-discord-client-id>
DISCORD_CLIENT_SECRET=<your-discord-client-secret>
```

#### **Frontend Environment Variables**

In Dokploy → Frontend App → **Environment** tab, update:

```bash
# Base URL without /api (endpoints already include /api/ prefix)
NEXT_PUBLIC_API_URL=https://customs.trayb.az

# Keep these
NODE_ENV=production
PORT=4000
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

### **5. Redeploy Both Apps**

1. **Redeploy Backend** (to pick up new env vars and domain config)
2. **Redeploy Frontend** (to pick up new API URL)
3. **Clear browser cache** and test!

---

## 🔍 Nixpacks Configuration

Nixpacks should auto-detect your Node.js app. Make sure you have:

### **`nixpacks.toml` (Root)**
```toml
[phases.setup]
nixPkgs = ['nodejs_20']
```

### **`package.json` (Root)**
```json
{
  "packageManager": "npm@10.8.2"
}
```

### **`turbo.json` (Root)**
```json
{
  "tasks": {
    "build": {
      "outputs": ["dist/**", ".next/**"]
    }
  }
}
```

---

## ✅ Verification Checklist

After redeploying:

- [ ] **Frontend loads**: `https://customs.trayb.az`
- [ ] **Backend health check**: `https://customs.trayb.az/api/health` returns JSON
- [ ] **Database migrations run**: No "table does not exist" errors
- [ ] **Login works**: Click login → Discord OAuth → Success
- [ ] **No CORS errors**: Check browser console
- [ ] **No Redis errors**: Check backend logs

---

## 🐛 Troubleshooting

### **"Table does not exist" error**
→ Run migrations: `npm run prisma:migrate:deploy` in backend shell

### **404 on `/api/*` routes**
→ Check backend domain has path `/api` configured in Dokploy

### **OAuth redirect error**
→ Verify Discord redirect URI matches exactly: `https://customs.trayb.az/api/core-auth/discord/callback`

### **CORS errors**
→ Verify `CORS_ORIGIN=https://customs.trayb.az` in backend env

---

## 📝 Notes

- **Nixpacks** auto-detects Node.js and runs `npm install` and `npm run build`
- **Migrations** must be run manually (or add to startup script)
- **Path-based routing** works better with Cloudflare SSL
- **Single domain** = simpler SSL/TLS management

