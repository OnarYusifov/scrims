# OAuth Redirect URIs Configuration

## Google OAuth Setup

### Authorized JavaScript Origins
Add these in Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID:

```
http://localhost:3000
https://beta.trayb.az
https://trayb.az
```

### Authorized Redirect URIs
Add these in the same OAuth 2.0 Client ID settings:

```
http://localhost:3000/api/auth/callback/google
https://beta.trayb.az/api/auth/callback/google
https://trayb.az/api/auth/callback/google
```

## Discord OAuth Setup

### Redirect URIs
Add these in Discord Developer Portal → Your Application → OAuth2 → Redirects:

```
http://localhost:3000/api/auth/callback/discord
https://beta.trayb.az/api/auth/callback/discord
https://trayb.az/api/auth/callback/discord
```

## Step-by-Step Instructions

### Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID (or create one if you don't have it)
5. Under **Authorized JavaScript origins**, click **+ ADD URI** and add:
   - `http://localhost:3000`
   - `https://beta.trayb.az`
   - `https://trayb.az`
6. Under **Authorized redirect URIs**, click **+ ADD URI** and add:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://beta.trayb.az/api/auth/callback/google`
   - `https://trayb.az/api/auth/callback/google`
7. Click **SAVE**

### Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to **OAuth2** → **General**
4. Scroll down to **Redirects** section
5. Click **+ Add Redirect**
6. Add each of these URLs (one at a time):
   - `http://localhost:3000/api/auth/callback/discord`
   - `https://beta.trayb.az/api/auth/callback/discord`
   - `https://trayb.az/api/auth/callback/discord`
7. Click **Save Changes** after adding each one

## Important Notes

- **No trailing slashes**: Make sure URLs don't end with `/`
- **Exact match required**: OAuth providers require exact URL matches
- **HTTP vs HTTPS**: 
  - Use `http://` for localhost (development)
  - Use `https://` for production domains
- **Case sensitive**: URLs are case-sensitive, use lowercase
- **After updating**: 
  - Changes may take a few minutes to propagate
  - Restart your application after updating redirect URIs
  - Test each environment to ensure OAuth works

## Testing

After configuring, test OAuth in each environment:

1. **Development (localhost:3000)**:
   - Start dev server: `bun run dev` (in apps/frontend)
   - Go to `/login` or `/register`
   - Click Google/Discord button
   - Should redirect to OAuth provider and back to `http://localhost:3000`

2. **Beta (beta.trayb.az)**:
   - Ensure `AUTH_URL=https://beta.trayb.az` is set in Dokploy
   - Test OAuth login
   - Should redirect back to `https://beta.trayb.az`

3. **Production (trayb.az)**:
   - Ensure `AUTH_URL=https://trayb.az` is set in production environment
   - Test OAuth login
   - Should redirect back to `https://trayb.az`

