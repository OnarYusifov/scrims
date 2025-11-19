# Steam Authentication Setup

## Overview

Steam authentication has been implemented for connecting Counter-Strike 2 accounts. Steam uses OpenID 2.0 (not OAuth 2.0), so it's handled separately from other OAuth providers.

## Required Environment Variables

Add the following to your `.env` file:

```env
STEAM_API_KEY=your_steam_api_key_here
```

### How to Get Steam API Key

1. Go to https://steamcommunity.com/dev/apikey
2. Log in with your Steam account
3. Register a new API key
4. Enter your domain name (e.g., `localhost:3000` for development)
5. Copy the API key and add it to your `.env` file

## How It Works

1. **User clicks "Connect" on Counter-Strike 2** in the profile page
2. **Redirects to `/api/auth/steam`** which initiates Steam OpenID authentication
3. **User authenticates with Steam** on Steam's website
4. **Steam redirects back** to `/api/auth/steam/callback`
5. **System verifies OpenID response** and extracts Steam ID
6. **Fetches user profile** from Steam Web API
7. **Links Steam account** to user's account in database
8. **Redirects back to profile** with success message

## Files Created/Modified

### New Files
- `apps/frontend/lib/steam-provider.ts` - Steam authentication utilities
- `apps/frontend/app/api/auth/steam/route.ts` - Initiates Steam auth
- `apps/frontend/app/api/auth/steam/callback/route.ts` - Handles Steam callback

### Modified Files
- `apps/frontend/app/profile/page.tsx` - Updated Connect button to use Steam auth for CS2
- `apps/frontend/app/api/auth/me/route.ts` - Added accounts info to user response

## Database

Steam accounts are stored in the `Account` table with:
- `provider`: "steam"
- `providerAccountId`: Steam ID (64-bit integer as string)
- `access_token`: Steam ID (same as providerAccountId)

## Localhost Development

**Steam OpenID doesn't work with `localhost` directly.** We've added a development mode to work around this.

### Option 1: Manual Steam ID Entry (Easiest for Testing)

When running on `localhost`, the app will automatically detect this and show a prompt:

1. Make sure `STEAM_API_KEY` is set in `.env`
2. Log in to your account
3. Go to Profile page
4. Click "Connect a game"
5. Click "Connect" on Counter-Strike 2
6. A prompt will appear asking for your Steam ID
7. Get your Steam ID from https://steamid.io/ (enter your Steam profile URL)
8. Enter the 17-digit Steam ID
9. Your Steam account will be linked (OpenID verification is skipped in dev mode)

### Option 2: Use ngrok for Full OpenID Support

For full Steam OpenID support on localhost:

1. Install ngrok: https://ngrok.com/download
2. Start your development server: `bun run dev`
3. In another terminal, run: `ngrok http 3000` (or your port)
4. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
5. Update your `.env`:
   ```env
   AUTH_URL=https://abc123.ngrok.io
   NEXTAUTH_URL=https://abc123.ngrok.io
   FRONTEND_URL=https://abc123.ngrok.io
   ```
6. Restart your dev server
7. Now Steam OpenID will work normally through the ngrok URL

## Production Testing

1. Make sure `STEAM_API_KEY` is set in `.env`
2. Log in to your account
3. Go to Profile page
4. Click "Connect a game"
5. Click "Connect" on Counter-Strike 2
6. You should be redirected to Steam login
7. After authentication, you'll be redirected back and see "Steam account linked successfully!"

## Error Handling

The implementation handles various error cases:
- `steam_auth_failed` - Failed to initiate Steam auth
- `steam_verification_failed` - OpenID verification failed
- `steam_already_linked` - Steam account already linked to another user
- `steam_profile_failed` - Failed to fetch Steam profile (check API key)
- `steam_callback_failed` - General callback error

All errors are displayed as toast notifications to the user.

