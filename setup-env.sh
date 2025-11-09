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
    echo "📝 Please copy .env.example to .env and fill in your values:"
    echo "   cp .env.example .env"
    exit 1
fi

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

DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}

DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
DISCORD_REDIRECT_URI=${DISCORD_REDIRECT_URI}

JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

FRONTEND_URL=${FRONTEND_URL}
CORS_ORIGIN=${CORS_ORIGIN}
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
AUTH_SECRET=${AUTH_SECRET}
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

