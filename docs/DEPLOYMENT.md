# 🚀 Dokploy Deployment Guide

## Deploy to `customs.trayb.az` using Dokploy + Cloudflare + GitHub

---

## 🎯 Quick Start Summary

**Deployment Steps:**
1. ✅ Push code to GitHub
2. ✅ Configure Cloudflare DNS (`customs.trayb.az` → your Dokploy server IP)
3. ✅ In Dokploy: Create PostgreSQL service (`trayb-postgres`)
4. ✅ In Dokploy: Create Redis service (`trayb-redis`)
5. ✅ In Dokploy: Create Backend service (GitHub → `apps/backend/Dockerfile.prod`)
6. ✅ In Dokploy: Create Frontend service (GitHub → `apps/frontend/Dockerfile.prod`)
7. ✅ Set environment variables for both apps
8. ✅ Run Prisma migrations
9. ✅ Update Discord OAuth redirect URI
10. ✅ Deploy!

**Key Configuration:**
- **Build Context:** Always use `/` (root of repository) for both apps
- **Dockerfile Paths:** `apps/backend/Dockerfile.prod` and `apps/frontend/Dockerfile.prod`
- **Service Names:** Use `trayb-postgres` and `trayb-redis` in connection strings
- **Ports:** Backend `4001`, Frontend `4000`

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

### **3.1 Create Services in Dokploy**

In Dokploy, you'll need to create **3 services** (PostgreSQL, Redis) and **2 applications** (Backend, Frontend):

**First, create the database services:**

1. **Login to Dokploy** dashboard
2. **Click "Create Service"** (black button in top right)
3. **Select "PostgreSQL"** from the service types
4. **Configure PostgreSQL:**
   - **Name:** `trayb-postgres`
   - **Version:** `16-alpine` (or latest)
   - **Environment Variables:**
     ```
     POSTGRES_USER=trayb
     POSTGRES_PASSWORD=your_secure_password_here
     POSTGRES_DB=trayb_customs
     ```
   - **Volumes:** `postgres_data:/var/lib/postgresql/data`
5. **Click "Deploy"** or "Create"

6. **Create Redis Service:**
   - **Click "Create Service"** again
   - **Select "Redis"**
   - **Name:** `trayb-redis`
   - **Version:** `7-alpine` (or latest)
   - **Volumes:** `redis_data:/data`
   - **Click "Deploy"**

### **3.2 Create Backend Application**

1. **Click "Create Service"**
2. **Select "GitHub Repository"** or **"Docker Image"**
3. **For GitHub:**
   - **Connect GitHub** (authorize Dokploy if first time)
   - **Repository:** `OnarYusifov/scrims` (or your repo)
   - **Branch:** `main`
   - **Dockerfile Path:** `apps/backend/Dockerfile.prod`
   - **Build Context:** `/` (root of repository)
4. **Or use Docker Image** if you prefer

---

## 📋 Step 4: Configure Backend Application

### **4.1 Backend Settings**

**Application Name:** `trayb-backend`

**Build Settings:**
- **Dockerfile Path:** `apps/backend/Dockerfile.prod`
- **Build Context:** `/` (root of repository - this is important!)
- **Build Command:** (leave default, Dokploy will use Dockerfile)
- **Port:** `3001`

**Environment Variables** (add these in Dokploy's environment variables section):
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://trayb:your_secure_password_here@trayb-postgres:5432/trayb_customs?schema=public
REDIS_URL=redis://trayb-redis:6379
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://customs.trayb.az/api/auth/discord/callback
FRONTEND_URL=https://customs.trayb.az
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
CORS_ORIGIN=https://customs.trayb.az
```

**Service Dependencies:**
- Make sure backend can access `trayb-postgres` and `trayb-redis` services
- In Dokploy, services on the same project/environment should be able to communicate by service name

**Domain (Optional):**
- **Domain:** `api.customs.trayb.az` (if using subdomain)
- **SSL:** Auto (Cloudflare will handle SSL)
- Or use path-based routing: `customs.trayb.az/api/*`

---

### **4.2 Create Frontend Application**

1. **Click "Create Service"** again
2. **Select "GitHub Repository"**
3. **Configure:**
   - **Repository:** Same as backend (`OnarYusifov/scrims`)
   - **Branch:** `main`
   - **Dockerfile Path:** `apps/frontend/Dockerfile.prod`
   - **Build Context:** `/` (root of repository)

### **5.1 Frontend Settings**

**Application Name:** `trayb-frontend`

**Build Settings:**
- **Dockerfile Path:** `apps/frontend/Dockerfile.prod`
- **Build Context:** `/` (root of repository - important!)
- **Port:** `3000`

**Environment Variables:**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.customs.trayb.az
# OR if using same domain with path routing:
# NEXT_PUBLIC_API_URL=https://customs.trayb.az/api
PORT=3000
```

**Service Dependencies:**
- Ensure frontend can communicate with backend service

**Domain:**
- **Domain:** `customs.trayb.az`
- **SSL:** Auto (Cloudflare will handle SSL)

---

## 📋 Step 6: Run Database Migrations

### **6.1 Run Migrations**

**After backend is deployed, run:**

```bash
# In Dokploy, go to backend application → Shell/Terminal
npx prisma migrate deploy
```

Or add to backend startup script.

---

## 📋 Step 7: Update Dockerfiles (If Needed)

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

## 📋 Step 8: Configure Network/Dependencies

In Dokploy, services on the same project/environment can communicate by service name:

1. **Backend** connects to:
   - `trayb-postgres:5432` (PostgreSQL)
   - `trayb-redis:6379` (Redis)

2. **Network:** Dokploy automatically creates a Docker network for services in the same environment

---

## 📋 Step 9: Update Discord OAuth

1. **Go to Discord Developer Portal** → https://discord.com/developers/applications
2. **Select your application**
3. **OAuth2 → Redirects**
4. **Add redirect URI:**
   - `https://customs.trayb.az/api/auth/discord/callback`
   - Or: `https://api.customs.trayb.az/api/auth/discord/callback` (if using subdomain)
5. **Save**

---

## 📋 Step 10: Deploy

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
