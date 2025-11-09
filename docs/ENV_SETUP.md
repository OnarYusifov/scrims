# Environment Variables Setup Guide

## Quick Start

1. **Backend Environment** (`apps/backend/.env`):
   - Copy the template below
   - Fill in your Discord OAuth credentials
   - Update database password if needed

2. **Frontend Environment** (`apps/frontend/.env.local`):
   - Already created with default values
   - No changes needed for local development

## Backend `.env` File Location
`/home/yunar/trayb-customs/apps/backend/.env`

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/trayb_customs?schema=public"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# Server Configuration
PORT=4001
HOST="0.0.0.0"
NODE_ENV="development"

# JWT Configuration
# Generate secure secrets: openssl rand -base64 32
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"
JWT_EXPIRATION="7d"

# Discord OAuth Configuration
# ⚠️ REQUIRED: Get these from https://discord.com/developers/applications
DISCORD_CLIENT_ID="your-discord-client-id-here"
DISCORD_CLIENT_SECRET="your-discord-client-secret-here"
DISCORD_REDIRECT_URI="http://localhost:4001/api/core-auth/discord/callback"

# Whitelist (Optional - leave empty to allow all users)
DISCORD_WHITELISTED_IDS=""

# Frontend URL (for redirects after OAuth)
FRONTEND_URL="http://localhost:4000"

# Elo System Configuration
ELO_START_RATING=1000
ELO_CALIBRATION_MATCHES=10
ELO_CALIBRATION_K_FACTOR=48
ELO_NORMAL_K_FACTOR=32
ELO_HIGH_ELO_K_FACTOR=24
ELO_HIGH_ELO_THRESHOLD=1600
ELO_MAX_CHANGE_PER_SERIES=150

# Logging Configuration
LOG_LEVEL="info"
PRETTY_LOGS="true"

# CORS Configuration
CORS_ORIGIN="http://localhost:4000"

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW="1 minute"

# Random.org API (Optional - for true randomness)
# Get your free API key from https://api.random.org/api-keys
# Free tier: 1,000,000 bits/day
# If not set, system will fallback to Math.random()
RANDOM_ORG_API_KEY=""
```

## Frontend `.env.local` File Location
`/home/yunar/trayb-customs/apps/frontend/.env.local`

```env
# Backend API URL
NEXT_PUBLIC_API_URL="http://localhost:4001"

# Frontend App URL
NEXT_PUBLIC_APP_URL="http://localhost:4000"
```

## Getting Discord OAuth Credentials

1. Go to https://discord.com/developers/applications
2. Create a new application (or select existing)
3. Go to **OAuth2** → **General**
4. Copy **Client ID**
5. Copy **Client Secret** (click "Reset Secret" if needed)
6. Add redirect URI: `http://localhost:4001/api/core-auth/discord/callback`

## Important Notes

- **Whitelist**: Currently disabled (all users allowed). Set `DISCORD_WHITELISTED_IDS` to restrict access.
- **JWT Secrets**: Generate secure random strings for production
- **Database Password**: Update `DATABASE_URL` if you changed the PostgreSQL password
- **Random.org API**: Optional but recommended for true randomness in team assignments, captain selection, and coin flips. Get a free API key from https://api.random.org/api-keys (1,000,000 bits/day free tier). If not set, the system will fallback to Math.random().

## Troubleshooting

### NetworkError when attempting to fetch
- Check that backend is running on port 4001
- Verify `NEXT_PUBLIC_API_URL` matches backend URL (should be `http://localhost:4001`)
- Check CORS settings in backend `.env` (should allow `http://localhost:4000`)

### Authentication fails
- Verify Discord OAuth credentials are correct
- Check redirect URI matches exactly in Discord portal
- Ensure backend `.env` has all required Discord variables
