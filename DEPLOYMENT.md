# 🚀 Dokploy Deployment Guide

## Deploy to `customs.trayb.az` using Dokploy + Cloudflare + GitHub

---

## ✅ Prerequisites

1. **Dokploy installed** on your server
2. **Cloudflare account** with domain `trayb.az`
3. **GitHub repository** with this codebase
4. **Server with Docker** installed

---

## 📋 Step 1: Prepare GitHub Repository

### **1.1 Push Code to GitHub**

```bash
# If not already done
git init
git remote add origin https://github.com/OnarYusifov/scrims.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

---

## 📋 Step 2: Configure Cloudflare DNS

1. **Go to Cloudflare Dashboard** → `trayb.az`
2. **Add DNS Record:**
   - **Type:** `A` or `CNAME`
   - **Name:** `customs`
   - **Target:** Your Dokploy server IP
   - **Proxy:** ✅ Enabled (orange cloud)
   - **TTL:** Auto

3. **SSL/TLS Settings:**
   - **Mode:** Full (strict)
   - **Always Use HTTPS:** ✅ Enabled

---

## 📋 Step 3: Dokploy Setup

### **3.1 Create Application in Dokploy**

1. **Login to Dokploy** dashboard
2. **Click "New Application"**
3. **Choose:** "GitHub Repository"
4. **Connect GitHub** (authorize Dokploy)
5. **Select Repository:** `trayb-customs`
6. **Branch:** `main` (or `master`)

---

## 📋 Step 4: Configure Backend Application

### **4.1 Backend Settings**

**Application Name:** `trayb-backend`

**Build Settings:**
- **Dockerfile Path:** `apps/backend/Dockerfile.prod`
- **Context:** Root of repository
- **Build Command:** (leave default, uses Dockerfile)
- **Port:** `3001`

**Environment Variables:**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@postgres:5432/trayb_customs?schema=public
REDIS_URL=redis://redis:6379
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://customs.trayb.az/api/auth/discord/callback
FRONTEND_URL=https://customs.trayb.az
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
CORS_ORIGIN=https://customs.trayb.az
```

**Domain:**
- **Domain:** `api.customs.trayb.az` (optional, or use subpath)
- **SSL:** Auto (Cloudflare)

---

## 📋 Step 5: Configure Frontend Application

### **5.1 Frontend Settings**

**Application Name:** `trayb-frontend`

**Build Settings:**
- **Dockerfile Path:** `apps/frontend/Dockerfile.prod`
- **Context:** Root of repository
- **Port:** `3000`

**Environment Variables:**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.customs.trayb.az
# OR if using same domain:
# NEXT_PUBLIC_API_URL=https://customs.trayb.az/api
PORT=3000
```

**Domain:**
- **Domain:** `customs.trayb.az`
- **SSL:** Auto (Cloudflare)

---

## 📋 Step 6: Setup Database (PostgreSQL)

### **6.1 Create Database Service in Dokploy**

1. **Click "New Service"** → **"PostgreSQL"**
2. **Name:** `trayb-postgres`
3. **Version:** `16-alpine`
4. **Environment Variables:**
   ```env
   POSTGRES_USER=trayb
   POSTGRES_PASSWORD=your_secure_password
   POSTGRES_DB=trayb_customs
   ```
5. **Volumes:** `postgres_data:/var/lib/postgresql/data`

### **6.2 Run Migrations**

**After backend is deployed, run:**

```bash
# In Dokploy, go to backend application → Shell/Terminal
npx prisma migrate deploy
```

Or add to backend startup script.

---

## 📋 Step 7: Setup Redis

1. **Click "New Service"** → **"Redis"**
2. **Name:** `trayb-redis`
3. **Version:** `7-alpine`
4. **Volumes:** `redis_data:/data`

---

## 📋 Step 8: Update Dockerfiles (If Needed)

The production Dockerfiles should work, but verify:

**Backend Dockerfile.prod** - Should build from root:
```dockerfile
# Context should be root of repo
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
# ... rest of build
```

**Frontend Dockerfile.prod** - Should build from root:
```dockerfile
# Context should be root of repo
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
# ... rest of build
```

---

## 📋 Step 9: Configure Network/Dependencies

In Dokploy, ensure services can communicate:

1. **Backend** depends on:
   - `trayb-postgres`
   - `trayb-redis`

2. **Network:** Use same Docker network for all services

---

## 📋 Step 10: Update Discord OAuth

1. **Go to Discord Developer Portal**
2. **OAuth2 → Redirects**
3. **Add:** `https://customs.trayb.az/api/auth/discord/callback`
   - Or: `https://api.customs.trayb.az/api/auth/discord/callback` (if using subdomain)
4. **Save**

---

## 📋 Step 11: Deploy

1. **Push to GitHub** (main branch)
2. **Dokploy will auto-deploy** (if auto-deploy enabled)
3. **Or manually trigger** deployment in Dokploy
4. **Check logs** for any errors

---

## 🔍 Troubleshooting

### **Build Fails:**
- Check Dockerfile paths are correct
- Verify context is root of repo
- Check build logs in Dokploy

### **Database Connection Issues:**
- Verify `DATABASE_URL` uses service name (e.g., `postgres:5432`)
- Check services are on same network
- Verify database is running

### **CORS Errors:**
- Update `CORS_ORIGIN` in backend env vars
- Check `NEXT_PUBLIC_API_URL` in frontend

### **Domain Not Working:**
- Verify DNS records in Cloudflare
- Check SSL/TLS mode is "Full (strict)"
- Verify domain is added in Dokploy

---

## 📝 Quick Checklist

- [ ] GitHub repo created and pushed
- [ ] Cloudflare DNS configured
- [ ] PostgreSQL service created
- [ ] Redis service created
- [ ] Backend application created in Dokploy
- [ ] Frontend application created in Dokploy
- [ ] Environment variables set
- [ ] Discord OAuth redirect URI updated
- [ ] Prisma migrations run
- [ ] Services deployed and running
- [ ] Domain accessible

---

## 🎯 Alternative: Single Domain Setup

If you want everything on `customs.trayb.az`:

1. **Frontend:** `customs.trayb.az`
2. **Backend API:** `customs.trayb.az/api/*` (use reverse proxy)

**Configure Nginx/Reverse Proxy in Dokploy:**
- Route `/api/*` → Backend (port 3001)
- Route `/*` → Frontend (port 3000)

---

## 📚 Dokploy Documentation

- https://dokploy.com/docs
- https://dokploy.com/docs/deployment
