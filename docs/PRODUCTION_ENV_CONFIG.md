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

# Backend API domain (PUBLIC API - use this for server-side calls)
API_URL="https://api.trayb.az"

# Backend URL (for same-container internal calls - OPTIONAL, faster than public API)
# If not set, will fall back to API_URL or localhost
BACKEND_URL="http://localhost:3001"

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
1. **`API_URL`** (if set) → `https://api.trayb.az`
2. **`BACKEND_URL`** (if set) → `http://localhost:3001`
3. **Fallback** → `http://localhost:${BACKEND_PORT || 3001}`

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

✅ **Correct Configuration:**
```env
API_URL="https://api.trayb.az"              # Backend API domain
BACKEND_URL="http://localhost:3001"         # Same-container calls (optional)
NEXT_PUBLIC_API_URL="https://api.trayb.az"  # Client-side calls
FRONTEND_URL="https://beta.trayb.az"        # Frontend domain
```

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
- `/auth/oauth-callback` - OAuth callback
- `/docs` - API documentation (Swagger UI)

## Testing

After deployment:
1. ✅ Backend API: `https://api.trayb.az/docs` should show Swagger UI
2. ✅ Frontend: `https://beta.trayb.az` should load
3. ✅ Login: Credentials login should work (calls `api.trayb.az/auth/verify-credentials`)
4. ✅ OAuth: Discord/Google login should work

