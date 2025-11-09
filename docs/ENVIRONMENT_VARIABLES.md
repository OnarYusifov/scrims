# Environment Variables Reference

## 🔧 Configuration Overview

### **Frontend Environment Variables** (`apps/frontend`)

Create a `.env.local` file in `apps/frontend/` for local development:

```bash
# API Configuration - REQUIRED
NEXT_PUBLIC_API_URL=http://localhost:4001

# For production (Dokploy):
# NEXT_PUBLIC_API_URL=https://api.customs.trayb.az

# Auth.js session secret - REQUIRED
AUTH_SECRET=your-nextauth-secret
```

**Note:** The frontend port (4000) is hardcoded in `package.json` scripts.

---

### **Backend Environment Variables** (`apps/backend`)

Create a `.env` file in `apps/backend/` for local development:

```bash
# Server Configuration
PORT=4001
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info
PRETTY_LOGS=true

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/trayb_customs

# Redis
REDIS_URL=redis://localhost:6379

# JWT & Session
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
SESSION_SECRET=your-super-secret-session-key-min-32-chars
AUTH_SECRET=your-nextauth-secret

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=http://localhost:4001/api/auth/discord/callback

# Discord Bot Integration
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=your-discord-guild-id
DISCORD_LOBBY_CHANNEL_ID=1436009958469533726
DISCORD_TEAM_ALPHA_CHANNEL_ID=1426994984300712027
DISCORD_TEAM_BRAVO_CHANNEL_ID=1426995070590255186
DISCORD_RESULTS_CHANNEL_ID=1436464923365605426

# For production, use:
# DISCORD_REDIRECT_URI=https://api.customs.trayb.az/api/auth/discord/callback

# CORS
CORS_ORIGIN=http://localhost:4000

# For production, use:
# CORS_ORIGIN=https://customs.trayb.az

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

---

## 🚀 Production Environment (Dokploy)

### **Frontend (customs.trayb.az)**
```bash
NEXT_PUBLIC_API_URL=https://api.customs.trayb.az
NODE_ENV=production
AUTH_SECRET=<same-secret-used-by-backend>
```

### **Backend (api.customs.trayb.az)**
```bash
PORT=4001
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info
PRETTY_LOGS=false

DATABASE_URL=postgresql://user:password@postgres:5432/trayb_customs
REDIS_URL=redis://redis:6379

JWT_SECRET=<generate-secure-secret>
SESSION_SECRET=<generate-secure-secret>
AUTH_SECRET=<same-secret-used-by-frontend>

DISCORD_CLIENT_ID=<your-production-id>
DISCORD_CLIENT_SECRET=<your-production-secret>
DISCORD_REDIRECT_URI=https://api.customs.trayb.az/api/auth/discord/callback

# Discord Bot Integration
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_GUILD_ID=<guild-id>
DISCORD_LOBBY_CHANNEL_ID=1436009958469533726
DISCORD_TEAM_ALPHA_CHANNEL_ID=1426994984300712027
DISCORD_TEAM_BRAVO_CHANNEL_ID=1426995070590255186
DISCORD_RESULTS_CHANNEL_ID=1436464923365605426

CORS_ORIGIN=https://customs.trayb.az

RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

---

## 📋 Port Reference

| Service  | Port | URL (Local)              | URL (Production)              |
|----------|------|--------------------------|-------------------------------|
| Frontend | 4000 | http://localhost:4000    | https://customs.trayb.az      |
| Backend  | 4001 | http://localhost:4001    | https://api.customs.trayb.az  |
| Database | 5432 | localhost:5432           | postgres:5432 (internal)      |
| Redis    | 6379 | localhost:6379           | redis:6379 (internal)         |

---

## 🔒 Security Notes

1. **Never commit `.env` files to git** - they are in `.gitignore`
2. **Generate strong secrets** for production:
   ```bash
   openssl rand -base64 32
   ```
3. **Keep `JWT_SECRET`, `SESSION_SECRET`, and `AUTH_SECRET` unique per environment**
4. **Update Discord OAuth callback URLs** in Discord Developer Portal
5. **Set CORS_ORIGIN** to your actual frontend domain in production

