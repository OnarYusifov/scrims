#!/bin/bash
set -euo pipefail
# Quick sync script for friend's machine

echo "🔄 Syncing environment configuration..."

# Check if on dev branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo "⚠️  Switching to dev branch..."
    git checkout dev
fi

# Fetch and pull
echo "📥 Fetching latest changes..."
git fetch origin
git pull origin dev

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating..."
    touch .env
fi

# Add port configuration if not present
if ! grep -q "FRONTEND_PORT" .env; then
    echo "📝 Adding port configuration to .env..."
    echo "" >> .env
    echo "# Port Configuration" >> .env
    echo "FRONTEND_PORT=5000" >> .env
    echo "BACKEND_PORT=5001" >> .env
    echo "" >> .env
    echo "# Update these URLs to match your ports" >> .env
    echo "# FRONTEND_URL=\"http://localhost:5000\"" >> .env
    echo "# BACKEND_URL=\"http://localhost:5001\"" >> .env
    echo "# API_URL=\"http://localhost:5001\"" >> .env
    echo "# NEXT_PUBLIC_API_URL=\"http://localhost:5001\"" >> .env
    echo "# AUTH_URL=\"http://localhost:5000\"" >> .env
    echo "# NEXTAUTH_URL=\"http://localhost:5000\"" >> .env
fi

echo "✅ Sync complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review .env file and uncomment/update URL variables"
echo "2. Run: bun install (if dependencies changed)"
echo "3. Run: bun run dev"
