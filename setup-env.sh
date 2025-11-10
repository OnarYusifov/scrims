#!/bin/bash

# ==============================================
# Environment Setup Script for Trayb Customs
# ==============================================
# This script copies variables from root .env to app-specific .env files

set -e

echo "🔧 Setting up environment files..."

# Check if root .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found in root directory"
    echo "📝 Please copy config/env.example to .env and fill in your values:"
    echo "   cp config/env.example .env"
    exit 1
fi

# Validate required environment variables before proceeding
echo "🧪 Validating .env against config/env.schema.json..."
if ! node scripts/env/validate-env.cjs --context=local --file=.env > /tmp/env-check.log 2>&1; then
    cat /tmp/env-check.log
    rm -f /tmp/env-check.log
    exit 1
fi
cat /tmp/env-check.log
rm -f /tmp/env-check.log

# Source the root .env file
set -a
source .env
set +a

echo "✅ Found root .env file"

if [ -z "${AUTH_SECRET}" ]; then
    echo "⚠️ Warning: AUTH_SECRET is not set in root .env. NextAuth sessions require a strong secret."
fi

# ==============================================
# Create Backend .env
# ==============================================
echo "📝 Creating apps/backend/.env..."

cat > apps/backend/.env << EOF
# Auto-generated from root .env by setup-env.sh
# Last updated: $(date)

NODE_ENV=${NODE_ENV:-development}
PORT=${BACKEND_PORT:-4001}
HOST=0.0.0.0

# Logging & server behaviour
LOG_LEVEL=${LOG_LEVEL:-info}
PRETTY_LOGS=${PRETTY_LOGS:-true}
TRUST_PROXY=${TRUST_PROXY:-true}
RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-600}
RATE_LIMIT_WINDOW="${RATE_LIMIT_WINDOW:-1 minute}"
METRIC_PREFIX=${METRIC_PREFIX:-trayb_}

# Core URLs
FRONTEND_URL=${FRONTEND_URL}
FRONTEND_INTERNAL_URL=${FRONTEND_INTERNAL_URL:-http://localhost:4000}
CORS_ORIGIN=${CORS_ORIGIN}

# Secrets
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
AUTH_SECRET=${AUTH_SECRET}

# Datastores
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}

# Discord OAuth
DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
DISCORD_REDIRECT_URI=${DISCORD_REDIRECT_URI}

# Discord bot + roles
DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
DISCORD_GUILD_ID=${DISCORD_GUILD_ID}
DISCORD_LOBBY_CHANNEL_ID=${DISCORD_LOBBY_CHANNEL_ID}
DISCORD_TEAM_ALPHA_CHANNEL_ID=${DISCORD_TEAM_ALPHA_CHANNEL_ID}
DISCORD_TEAM_BRAVO_CHANNEL_ID=${DISCORD_TEAM_BRAVO_CHANNEL_ID}
DISCORD_RESULTS_CHANNEL_ID=${DISCORD_RESULTS_CHANNEL_ID}
DISCORD_ROLE_UNRANKED=${DISCORD_ROLE_UNRANKED}
DISCORD_ROLE_WOOD=${DISCORD_ROLE_WOOD}
DISCORD_ROLE_BRONZE=${DISCORD_ROLE_BRONZE}
DISCORD_ROLE_SILVER=${DISCORD_ROLE_SILVER}
DISCORD_ROLE_GOLD=${DISCORD_ROLE_GOLD}
DISCORD_ROLE_PLATINUM=${DISCORD_ROLE_PLATINUM}
DISCORD_ROLE_DIAMOND=${DISCORD_ROLE_DIAMOND}
DISCORD_ROLE_EMERALD=${DISCORD_ROLE_EMERALD}
DISCORD_ROLE_RUBY=${DISCORD_ROLE_RUBY}
DISCORD_ROLE_GOD=${DISCORD_ROLE_GOD}
DISCORD_WHITELISTED_IDS=${DISCORD_WHITELISTED_IDS}
DISCORD_ROOT_IDS=${DISCORD_ROOT_IDS}

# Scaling & observability (optional overrides)
CLUSTER_WORKERS=${CLUSTER_WORKERS:-1}
UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY=${UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY:-1000}
UNDER_PRESSURE_MAX_HEAP_BYTES=${UNDER_PRESSURE_MAX_HEAP_BYTES:-268435456}
BULLMQ_METRICS_POLL_MS=${BULLMQ_METRICS_POLL_MS:-15000}

# Cache tuning (optional overrides)
CACHE_PROFILE_TTL=${CACHE_PROFILE_TTL:-60}
CACHE_PROFILE_FULL_TTL=${CACHE_PROFILE_FULL_TTL:-120}
CACHE_MATCH_LIST_TTL=${CACHE_MATCH_LIST_TTL:-15}
CACHE_MATCH_SNAPSHOT_TTL=${CACHE_MATCH_SNAPSHOT_TTL:-30}

# Real-time tuning (optional)
REALTIME_STREAM_KEY=${REALTIME_STREAM_KEY:-trayb:events:realtime}
REALTIME_STREAM_GROUP=${REALTIME_STREAM_GROUP:-realtime-consumers}
REALTIME_STREAM_MAXLEN=${REALTIME_STREAM_MAXLEN:-5000}
REALTIME_STREAM_READ_COUNT=${REALTIME_STREAM_READ_COUNT:-50}
REALTIME_STREAM_READ_BLOCK_MS=${REALTIME_STREAM_READ_BLOCK_MS:-5000}
SSE_HEARTBEAT_INTERVAL_MS=${SSE_HEARTBEAT_INTERVAL_MS:-15000}
SSE_CLIENT_QUEUE_LIMIT=${SSE_CLIENT_QUEUE_LIMIT:-100}

# Production data safety
PROD_REPLICA_URL=${PROD_REPLICA_URL}
SHADOW_DATABASE_URL=${SHADOW_DATABASE_URL}

# Load testing harness
LOADTEST_BASE_URL=${LOADTEST_BASE_URL:-http://localhost:${BACKEND_PORT:-4001}}
LOADTEST_ALLOWED_HOSTS=${LOADTEST_ALLOWED_HOSTS:-localhost}
LOADTEST_BEARER=${LOADTEST_BEARER}
LOADTEST_ALLOW_PROD=${LOADTEST_ALLOW_PROD:-false}
LOADTEST_CONNECTIONS=${LOADTEST_CONNECTIONS}
LOADTEST_DURATION=${LOADTEST_DURATION}
LOADTEST_TIMEOUT=${LOADTEST_TIMEOUT}
LOADTEST_PIPELINING=${LOADTEST_PIPELINING}

# Optional integrations
RANDOM_ORG_API_KEY=${RANDOM_ORG_API_KEY}
DEBUG_OPGG_HTML=${DEBUG_OPGG_HTML}
EOF

echo "✅ Created apps/backend/.env"

# ==============================================
# Create Frontend .env.local
# ==============================================
echo "📝 Creating apps/frontend/.env.local..."

cat > apps/frontend/.env.local << EOF
# Auto-generated from root .env by setup-env.sh
# Last updated: $(date)

NODE_ENV=${NODE_ENV:-development}
PORT=${FRONTEND_PORT:-4000}

NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-${FRONTEND_URL}}
AUTH_SECRET=${AUTH_SECRET}
NEXTAUTH_URL=${NEXTAUTH_URL:-${FRONTEND_URL}}
EOF

echo "✅ Created apps/frontend/.env.local"

# ==============================================
# Summary
# ==============================================
echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📋 Created files:"
echo "   ✓ apps/backend/.env"
echo "   ✓ apps/frontend/.env.local"
echo ""
echo "🚀 Next steps:"
echo "   1. Make sure PostgreSQL and Redis are running"
echo "   2. Run migrations: cd apps/backend && npx prisma migrate dev"
echo "   3. Start dev servers: npm run dev"
echo ""

