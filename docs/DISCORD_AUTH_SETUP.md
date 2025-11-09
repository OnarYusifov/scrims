# Discord OAuth Setup Guide

## Overview
This guide explains how to set up Discord OAuth authentication for TRAYB CUSTOMS.

## Prerequisites
- Discord account
- Discord application created at https://discord.com/developers/applications

## Step 1: Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "TRAYB CUSTOMS" (or whatever you prefer)
4. Click "Create"

## Step 2: Configure OAuth2

1. In your application, go to "OAuth2" in the left sidebar
2. Click "Add Redirect" under "Redirects"
3. Add the following redirect URLs:
   - For local development: `http://localhost:3001/api/core-auth/discord/callback`
   - For production: `https://scrims.trayb.az/api/core-auth/discord/callback`

## Step 3: Get Your Credentials

1. Go to "OAuth2" → "General"
2. Copy your **Client ID**
3. Click "Reset Secret" to generate a new **Client Secret** (or copy existing one)
4. **IMPORTANT**: Save the Client Secret immediately - you won't be able to see it again!

## Step 4: Configure Backend Environment

1. Navigate to `/home/yunar/trayb-customs/apps/backend/`
2. Edit your `.env` file and add your Discord credentials:
   ```env
   DISCORD_CLIENT_ID="your_client_id_here"
   DISCORD_CLIENT_SECRET="your_client_secret_here"
   DISCORD_REDIRECT_URI="http://localhost:3001/api/core-auth/discord/callback"
   FRONTEND_URL="http://localhost:3000"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   ```

## Step 5: Configure Frontend Environment

1. Navigate to `/home/yunar/trayb-customs/apps/frontend/`
2. Edit your `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

## Step 6: Restart Services

If you're already running the dev servers, restart them:

```bash
# Stop current processes (Ctrl+C) then:

# In terminal 1 - Backend
cd /home/yunar/trayb-customs/apps/backend
npm run dev

# In terminal 2 - Frontend
cd /home/yunar/trayb-customs/apps/frontend
npm run dev
```

## Step 7: Test Authentication

1. Open http://localhost:3000 in your browser
2. Click "LOGIN" button
3. You should be redirected to Discord
4. Authorize the application
5. You should be redirected back to the dashboard

## How Authentication Works

### Backend Flow

1. **Initiate OAuth**: `GET /api/core-auth/discord`
   - Redirects user to Discord authorization page

2. **Callback**: `GET /api/core-auth/discord/callback?code=...`
   - Exchanges code for Discord access token
   - Fetches user info from Discord API
   - Creates or updates user in database
   - Generates JWT token
   - Redirects to frontend with token

3. **Get Current User**: `GET /api/core-auth/me`
   - Requires JWT token in Authorization header
   - Returns current user info

### Frontend Flow

1. User clicks "Login with Discord" button
2. Browser redirects to backend `/api/core-auth/discord`
3. Backend redirects to Discord
4. User authorizes
5. Discord redirects to backend callback
6. Backend redirects to frontend `/auth/callback?token=...`
7. Frontend saves token to localStorage
8. Frontend redirects to dashboard

### Token Storage

- JWT tokens are stored in `localStorage` with key `auth_token`
- The `useAuth()` hook manages authentication state
- Protected routes check for token presence

## Troubleshooting

### "Not Whitelisted" Error
- For now, all users are automatically whitelisted
- To implement whitelist, edit `/apps/backend/src/routes/auth.ts` and uncomment whitelist logic

### "Authentication Failed" Error
- Check that your Discord Client ID and Secret are correct
- Verify redirect URI matches exactly in Discord app settings
- Check backend logs for detailed error messages

### Token Not Saved
- Check browser console for errors
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Ensure cookies/localStorage aren't blocked

## Security Notes

⚠️ **Important Security Reminders:**

1. **Never commit `.env` files** - they are in `.gitignore`
2. **Use strong JWT_SECRET** in production (random 64+ character string)
3. **Change default database credentials** before deployment
4. **Use HTTPS** in production
5. **Implement rate limiting** on auth endpoints (already configured)
6. **Implement whitelist** before public deployment

## Production Deployment

For production:

1. Set environment variables in your hosting platform (not `.env` files)
2. Update `DISCORD_REDIRECT_URI` to your production domain
3. Add production redirect URI to Discord app settings
4. Update `FRONTEND_URL` to your production frontend domain
5. Generate a secure `JWT_SECRET`
6. Enable whitelist checking in auth routes

## API Endpoints

### Public Endpoints
- `GET /api/core-auth/discord` - Initiate Discord OAuth
- `GET /api/core-auth/discord/callback` - OAuth callback

### Protected Endpoints (require JWT token)
- `GET /api/core-auth/me` - Get current user
- `POST /api/core-auth/logout` - Logout (client-side token removal)

## Next Steps

Now that authentication is set up, you can:

1. Implement whitelist management in admin panel
2. Add role-based access control to routes
3. Implement user profile editing
4. Add team/match creation (requires authentication)
5. Add stats tracking for authenticated users

## Support

If you encounter issues:

1. Check backend logs: Look for errors in the terminal running the backend
2. Check frontend console: Open browser DevTools → Console
3. Verify environment variables are loaded correctly
4. Ensure all dependencies are installed: `npm install` in both apps

---

**Status**: ✅ Fully implemented and ready to test
**Last Updated**: November 5, 2025

