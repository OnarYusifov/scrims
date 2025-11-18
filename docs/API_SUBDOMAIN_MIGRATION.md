# API Subdomain Migration Guide

## Overview

The backend API has been migrated from using `/api` path prefix to a dedicated subdomain `api.trayb.az`.

## Changes Made

### Backend Routes
- **Before**: `/api/auth/register`, `/api/auth/login`, etc.
- **After**: `/auth/register`, `/auth/login`, etc.
- **Swagger Docs**: Changed from `/api/docs` to `/docs`

### Frontend API Routes
- Frontend Next.js API routes that proxy to backend now use `API_URL` environment variable
- Client-side code uses `NEXT_PUBLIC_API_URL` environment variable

## Dokploy Configuration

### 1. Domain Configuration

Add a new domain in Dokploy:

**Domain**: `api.trayb.az`
- **Path**: `/` (root)
- **Port**: `3001` (backend port)
- **HTTPS**: Enabled
- **Cert**: Let's Encrypt

### 2. Environment Variables

Update these environment variables in Dokploy:

```env
# Backend API URL (for server-side calls and client-side calls)
API_URL="https://api.trayb.az"
NEXT_PUBLIC_API_URL="https://api.trayb.az"

# Backend URL (for internal server-side calls, same container)
BACKEND_URL="http://localhost:3001"

# Frontend URL (for OAuth, email links, etc.)
FRONTEND_URL="https://beta.trayb.az"
AUTH_URL="https://beta.trayb.az"
NEXTAUTH_URL="https://beta.trayb.az"
```

### 3. Remove Old Domain Configuration

You can remove the old `/api` path configuration:
- ~~`beta.trayb.az` with path `/api` → Port 3001~~ (REMOVE THIS)

### 4. Keep Frontend Domain

Keep the frontend domain as is:
- `beta.trayb.az` with path `/` → Port 3000 (KEEP THIS)

## Route Mapping

### Frontend Routes (beta.trayb.az)
- `/api/auth/[...nextauth]` - NextAuth.js routes (handled by frontend)
- `/api/auth/me` - Frontend API route (uses Auth.js session)
- `/api/user/badges` - Frontend API route (uses Prisma directly)
- All other `/api/*` routes in frontend proxy to backend

### Backend Routes (api.trayb.az)
- `/auth/register` - User registration
- `/auth/login` - Login
- `/auth/verify-email` - Email verification
- `/auth/forgot-password` - Password reset
- `/auth/me` - Get current user (backend version)
- `/docs` - API documentation (Swagger UI)

## Testing

After deployment:
1. Test backend API: `https://api.trayb.az/docs` should show Swagger UI
2. Test OAuth: Discord/Google login should work
3. Test registration: Should send emails correctly
4. Test frontend: `https://beta.trayb.az` should work normally

## Migration Checklist

- [x] Remove `/api` prefix from all backend routes
- [x] Update frontend API routes to use `API_URL` instead of `BACKEND_URL` with `/api` prefix
- [x] Update Swagger route prefix from `/api/docs` to `/docs`
- [ ] Add `api.trayb.az` domain in Dokploy
- [ ] Update environment variables in Dokploy
- [ ] Remove old `/api` path configuration from Dokploy
- [ ] Test OAuth login (Discord/Google)
- [ ] Test email sending
- [ ] Test API documentation at `https://api.trayb.az/docs`

