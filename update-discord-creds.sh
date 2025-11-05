#!/bin/bash
# Quick script to update Discord OAuth credentials

echo "=== Discord OAuth Credentials Updater ==="
echo ""
read -p "Enter your Discord Client ID: " CLIENT_ID
read -p "Enter your Discord Client Secret: " CLIENT_SECRET

ENV_FILE="/home/yunar/trayb-customs/apps/backend/.env"

if [ -f "$ENV_FILE" ]; then
    # Update CLIENT_ID
    sed -i "s|DISCORD_CLIENT_ID=.*|DISCORD_CLIENT_ID=\"$CLIENT_ID\"|" "$ENV_FILE"
    
    # Update CLIENT_SECRET
    sed -i "s|DISCORD_CLIENT_SECRET=.*|DISCORD_CLIENT_SECRET=\"$CLIENT_SECRET\"|" "$ENV_FILE"
    
    echo ""
    echo "✅ Updated Discord credentials in $ENV_FILE"
    echo ""
    echo "Lines updated:"
    grep "DISCORD_CLIENT" "$ENV_FILE"
    echo ""
    echo "⚠️  Don't forget to restart your backend server!"
else
    echo "❌ Error: .env file not found at $ENV_FILE"
fi
