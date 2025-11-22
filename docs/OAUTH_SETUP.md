# OAuth Setup Guide for Google and Discord Sign-In

This guide will help you set up Google and Discord OAuth authentication step by step.

## Step 1: Set Up Google OAuth

### 1.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose **External** user type (unless you have a Google Workspace)
   - Fill in the required information:
     - App name: Your app name (e.g., "Trayb")
     - User support email: Your email
     - Developer contact information: Your email
   - Add scopes (at minimum: `email`, `profile`, `openid`)
   - Add test users if your app is in testing mode
   - Save and continue through the summary

### 1.2 Create OAuth Client ID

1. Application type: **Web application**
2. Name: e.g., "Trayb Web Client"
3. **Authorized JavaScript origins**:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
4. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### 1.3 Add Environment Variables

Add these to your `.env.local` file (or environment variables):

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 2: Set Up Discord OAuth

### 2.1 Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Give it a name (e.g., "Trayb")
4. Click **Create**

### 2.2 Configure OAuth2 Settings

1. In your application, go to **OAuth2** → **General**
2. Copy the **Client ID**
3. Click **Reset Secret** to generate a **Client Secret** (copy it immediately)
4. In **Redirects**, add these URLs:
   - `http://localhost:3000/api/auth/callback/discord` (for development)
   - `https://yourdomain.com/api/auth/callback/discord` (for production)
5. Click **Save Changes**

### 2.3 Add Environment Variables

Add these to your `.env.local` file:

```env
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
```

## Step 3: Additional Environment Variables

Make sure you also have these environment variables set:

```env
# NextAuth.js Configuration
AUTH_SECRET=your-auth-secret-here
# Generate a random secret: openssl rand -base64 32

# Frontend URL (REQUIRED for OAuth redirects)
# This must match exactly where your app is running
AUTH_URL=http://localhost:3000
# OR use NEXTAUTH_URL (both work, but AUTH_URL is preferred in NextAuth v5)
# In production: https://yourdomain.com

# Database (if not already set)
DATABASE_URL=your-database-url
```

**IMPORTANT**: The `AUTH_URL` or `NEXTAUTH_URL` must match your app's URL exactly. For local development, use `http://localhost:3000` (or whatever port you're using). This is critical for OAuth to work!

## Step 4: Verify Configuration

### 4.1 Check Auth Configuration

Your `apps/frontend/auth.ts` should already have:

```typescript
Discord({
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
}),
Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
}),
```

### 4.2 Check API Routes

Your `apps/frontend/app/api/auth/[...nextauth]/route.ts` should export handlers:

```typescript
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### 4.3 Check SessionProvider

Make sure your `apps/frontend/app/layout.tsx` wraps children with `<Providers>` which includes `SessionProvider`.

## Step 5: Test the Implementation

1. Start your development server:

   ```bash
   cd apps/frontend
   npm run dev
   # or
   bun dev
   ```

2. Navigate to `/login` or `/register`

3. Click the **Google** or **Discord** button

4. You should be redirected to the OAuth provider's login page

5. After authorization, you should be redirected back to your app and logged in

## Troubleshooting

### Issue: "redirect_uri_mismatch" or "401: invalid_client" Error

**Solution**:

- **Check `AUTH_URL` or `NEXTAUTH_URL` environment variable**:
  - Must be set to `http://localhost:3000` (or your actual URL)
  - Must match exactly where your app is running
  - Restart your dev server after setting this
- **Check that the redirect URI in your OAuth provider matches exactly**:
  - Google: `http://localhost:3000/api/auth/callback/google`
  - Discord: `http://localhost:3000/api/auth/callback/discord`
  - Make sure there are no trailing slashes
  - Use `http://` for localhost (not `https://`)
- **Verify Client ID and Secret are correct**:
  - Copy them exactly from the OAuth provider console
  - No extra spaces or quotes
- **Check your `.env.local` file** is in the `apps/frontend` directory
- **Restart your dev server** after changing environment variables

### Issue: "Invalid client" or "Invalid credentials"

**Solution**:

- Verify your Client ID and Client Secret are correct
- Make sure environment variables are loaded (restart dev server after adding them)
- Check that you're using the correct credentials for the correct environment (dev vs prod)

### Issue: Session not persisting

**Solution**:

- Make sure `AUTH_SECRET` is set
- Verify `SessionProvider` is wrapping your app in the layout
- Check that cookies are enabled in your browser

### Issue: "Email not verified" after OAuth login

**Solution**:

- This should not happen with OAuth providers (they auto-verify emails)
- Check your `auth.ts` callbacks - they should set `emailVerified` automatically
- If using Google/Discord, emails should be verified automatically

## Production Checklist

- [ ] Update OAuth redirect URIs to production URLs
- [ ] Set `NEXTAUTH_URL` to production URL
- [ ] Use strong `AUTH_SECRET` in production
- [ ] Enable HTTPS (required for OAuth in production)
- [ ] Update OAuth consent screen to production status (Google)
- [ ] Remove test user restrictions (Google)
- [ ] Verify all environment variables are set in production environment

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)
