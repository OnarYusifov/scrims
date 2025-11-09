# Path-Based Routing Setup (customs.trayb.az/api/*)

This guide shows how to configure Dokploy to use path-based routing instead of subdomains.

## 🎯 Goal

- **Frontend**: `https://customs.trayb.az` → Frontend (port 4000)
- **Backend API**: `https://customs.trayb.az/api/*` → Backend (port 4001)

## 📋 Step 1: Update Dokploy Domain Configuration

### **Backend App**
1. Go to **Backend App** → **Domains** tab
2. **Remove** `api.customs.trayb.az` domain (if it exists)
3. **Add** new domain:
   - **Host**: `customs.trayb.az`
   - **Path**: `/api`
   - **Container Port**: `4001`
   - **HTTPS**: Enabled

### **Frontend App**
1. Go to **Frontend App** → **Domains** tab
2. Make sure domain is:
   - **Host**: `customs.trayb.az`
   - **Path**: `/` (root)
   - **Container Port**: `4000`
   - **HTTPS**: Enabled

**Note:** Traefik (Dokploy's reverse proxy) will automatically route:
- `/api/*` → Backend
- `/*` → Frontend

## 📋 Step 2: Update Environment Variables

### **Backend Environment Variables**

Update in Dokploy → Backend App → Environment:

```bash
# Change from api.customs.trayb.az to customs.trayb.az/api
DISCORD_REDIRECT_URI=https://customs.trayb.az/api/core-auth/discord/callback
CORS_ORIGIN=https://customs.trayb.az
FRONTEND_URL=https://customs.trayb.az
```

### **Frontend Environment Variables**

Update in Dokploy → Frontend App → Environment:

```bash
# Change from api.customs.trayb.az to customs.trayb.az/api
NEXT_PUBLIC_API_URL=https://customs.trayb.az/api
```

## 📋 Step 3: Update Discord OAuth Redirect URI

1. Go to **Discord Developer Portal** → https://discord.com/developers/applications
2. Select your application
3. Go to **OAuth2** → **Redirects**
4. **Update** the redirect URI from:
   - ❌ `https://api.customs.trayb.az/api/core-auth/discord/callback`
   - ✅ `https://customs.trayb.az/api/core-auth/discord/callback`
5. **Save Changes**

## 📋 Step 4: Update Cloudflare DNS (If Needed)

If you had an A record for `api.customs.trayb.az`, you can remove it:
- Only `customs.trayb.az` needs an A record pointing to your Dokploy server

## 📋 Step 5: Redeploy

1. **Redeploy Backend** (to pick up new environment variables)
2. **Redeploy Frontend** (to pick up new API URL)
3. **Clear browser cache** and test!

## ✅ Verification

After redeploying:

1. **Frontend**: Visit `https://customs.trayb.az` → Should load
2. **Backend Health**: Visit `https://customs.trayb.az/api/health` → Should return JSON
3. **Login**: Click login → Should redirect to Discord → Should work!

## 🔍 Troubleshooting

### **404 on /api routes**
- Check Traefik routing in Dokploy
- Verify backend domain has path `/api` configured
- Check backend container port is `4001`

### **CORS errors**
- Verify `CORS_ORIGIN=https://customs.trayb.az` in backend env
- Check browser console for exact error

### **OAuth redirect errors**
- Verify Discord redirect URI matches exactly: `https://customs.trayb.az/api/core-auth/discord/callback`
- Check backend `DISCORD_REDIRECT_URI` env var matches

---

## 🎉 Benefits of Path-Based Routing

✅ **Single domain** - Easier SSL/TLS management  
✅ **No subdomain DNS** - Cloudflare works perfectly  
✅ **Simpler setup** - One domain to manage  
✅ **Same-origin requests** - Better for cookies/auth

