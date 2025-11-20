# Production Environment Configuration Guide

## Architecture Overview

The production setup uses two domains:

- **`beta.trayb.az`** → Frontend (Next.js) on port 3000
- **`api.trayb.az`** → Backend API (Fastify) on port 3001

Both frontend and backend run in the **same Docker container**.

## Environment Variables Configuration

### ✅ Correct Production Configuration

```env
# ============================================
# ENVIRONMENT
# ============================================
NODE_ENV="production"

# ============================================
# DOMAIN CONFIGURATION
# ============================================
# Frontend domain (for OAuth, email links, redirects)
FRONTEND_URL="https://beta.trayb.az"
AUTH_URL="https://beta.trayb.az"
NEXTAUTH_URL="https://beta.trayb.az"

# Backend API domain (PUBLIC API - use this for server-side calls and browser redirects)
API_URL="https://api.trayb.az"

# Backend URL (for server-side API calls)
# - If using public API: set to same as API_URL (https://api.trayb.az)
# - If optimizing for same-container: use http://localhost:3001 (faster, no SSL)
# - If not set, will fall back to API_URL or localhost
BACKEND_URL="https://api.trayb.az"

# Client-side API URL (browser -> backend)
NEXT_PUBLIC_API_URL="https://api.trayb.az"

# ============================================
# PORT CONFIGURATION
# ============================================
FRONTEND_PORT=3000
BACKEND_PORT=3001

# ============================================
# DATABASE & REDIS
# ============================================
DATABASE_URL="postgresql://user:password@host:5432/database"
REDIS_URL="redis://localhost:6379"  # Or service name if separate container

# ============================================
# AUTH & SECURITY
# ============================================
AUTH_SECRET="..."
NEXTAUTH_SECRET="..."  # Same as AUTH_SECRET
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"

# ============================================
# OAUTH PROVIDERS
# ============================================
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# ... other variables ...
```

## URL Resolution Logic

### Server-Side Calls (Next.js API Routes → Backend)

The frontend uses this priority order:
1. **`API_URL`** (if set) → `https://api.trayb.az` ✅ **Recommended**
2. **`BACKEND_URL`** (if set) → `https://api.trayb.az` or `http://localhost:3001`
3. **Fallback** → `http://localhost:${BACKEND_PORT || 3001}`

**Note:** Most routes check `API_URL` first, then `BACKEND_URL`, then localhost.

### Browser Redirects (Frontend → Backend Redirects)

For browser redirects (like Steam login), the frontend uses:
1. **`API_URL`** (if set) → `https://api.trayb.az` ✅ **Required for public redirects**
2. **`BACKEND_URL`** (if set) → Only if API_URL not set
3. **Fallback** → `http://localhost:${BACKEND_PORT || 3001}`

**Important:** Browser redirects MUST use public API URL (`https://api.trayb.az`), not localhost.

### Client-Side Calls (Browser → Backend)

Uses **`NEXT_PUBLIC_API_URL`** → `https://api.trayb.az`

## Configuration Options

### Option 1: Use Public API for Server-Side Calls (Recommended)

```env
API_URL="https://api.trayb.az"
# Don't set BACKEND_URL, or set it to same value
BACKEND_URL="https://api.trayb.az"
NEXT_PUBLIC_API_URL="https://api.trayb.az"
```

**Pros:**
- Consistent with client-side calls
- Works if frontend/backend are in separate containers later
- Uses reverse proxy/load balancer features

**Cons:**
- Slightly slower (goes through network stack)
- Requires SSL certificate validation

### Option 2: Use Localhost for Server-Side Calls (Fastest)

```env
API_URL="https://api.trayb.az"  # Still needed for backend config
BACKEND_URL="http://localhost:3001"  # For server-side calls
NEXT_PUBLIC_API_URL="https://api.trayb.az"
```

**Pros:**
- Fastest (direct localhost connection)
- No SSL overhead
- More reliable (no network issues)

**Cons:**
- Only works in same container
- Doesn't go through reverse proxy

## Current Issue Resolution

If you were getting authentication errors, it was likely because:

❌ **Wrong Configuration:**
```env
BACKEND_URL="https://beta.trayb.az"  # Wrong! This is the frontend domain
API_URL="https://beta.trayb.az"      # Wrong! Should be api.trayb.az
```

✅ **Correct Configuration (Current Setup):**
```env
# Frontend domain
FRONTEND_URL="https://beta.trayb.az"
AUTH_URL="https://beta.trayb.az"
NEXTAUTH_URL="https://beta.trayb.az"

# Backend API domain (PUBLIC - used for server-side calls and browser redirects)
API_URL="https://api.trayb.az"

# Backend URL (for server-side calls - can match API_URL or use localhost)
BACKEND_URL="https://api.trayb.az"  # Or "http://localhost:3001" for optimization

# Client-side calls (browser -> backend)
NEXT_PUBLIC_API_URL="https://api.trayb.az"
```

**Note:** With `BACKEND_URL="https://api.trayb.az"`, both server-side calls and browser redirects use the public API. This is consistent and works correctly.

## Route Mapping

### Frontend Routes (`beta.trayb.az`)
- `/` - Home page
- `/login` - Login page
- `/api/auth/[...nextauth]` - NextAuth.js routes
- `/api/auth/me` - Frontend API route (uses Auth.js session)
- `/api/user/badges` - Frontend API route (uses Prisma)

### Backend API Routes (`api.trayb.az`)
- `/auth/register` - User registration
- `/auth/login` - Login
- `/auth/verify-credentials` - Credentials verification (used by NextAuth)
- `/auth/verify-email` - Email verification
- `/auth/oauth-callback` - OAuth callback (Discord/Google)
- `/auth/steam` - Initiate Steam OpenID authentication (redirects to Steam)
- `/auth/steam/callback` - Handle Steam OpenID callback
- `/docs` - API documentation (Swagger UI)

## Testing

After deployment:
1. ✅ Backend API: `https://api.trayb.az/docs` should show Swagger UI
2. ✅ Frontend: `https://beta.trayb.az` should load
3. ✅ Login: Credentials login should work (calls `api.trayb.az/auth/verify-credentials`)
4. ✅ OAuth: Discord/Google login should work
5. ✅ Steam: Steam login should redirect to Steam (calls `api.trayb.az/auth/steam`)

## Important Notes

### Browser Redirects Must Use Public API

Routes that perform browser redirects (like Steam authentication) **must** use the public API URL (`https://api.trayb.az`), not localhost. This is because:
- The browser needs to reach the URL directly
- Localhost URLs won't work from the user's browser
- Steam OpenID requires a publicly accessible return URL

### When to Use API_URL vs BACKEND_URL

- **`API_URL`**: Always checked first. Use for:
  - Browser redirects (Steam, OAuth redirects)
  - Server-side calls when you want consistency
  - Backend internal configuration (CORS, Socket.io)

- **`BACKEND_URL`**: Checked second. Use for:
  - Server-side calls when optimizing for same-container performance
  - When you want to use localhost for faster internal calls

- **`NEXT_PUBLIC_API_URL`**: Always use for:
  - Client-side API calls from the browser
  - Must be publicly accessible (cannot be localhost)

