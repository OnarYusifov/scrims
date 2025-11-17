# Auth.js + Resend Implementation Summary

## Overview

This document explains how authentication is implemented using **Auth.js** (next-auth v5), **Resend**, and **React Email** for branded OTP emails.

## Architecture

### Components

1. **Auth.js** (`apps/frontend/auth.ts`)
   - Handles authentication with Credentials, Discord, and Google providers
   - Manages sessions using JWT strategy
   - Uses Prisma adapter for database operations

2. **Resend + React Email** (`apps/backend/src/utils/sendOTP.ts`, `apps/backend/src/emails/VerificationOTP.tsx`)
   - Sends branded OTP verification emails
   - Uses React Email for templating

3. **Backend Auth Routes** (`apps/backend/src/routes/auth.ts`)
   - Registration: Generates OTP → Stores in VerificationToken → Sends via Resend
   - Verification: Validates OTP → Marks emailVerified = new Date()

## How OTP is Generated/Stored/Validated

### 1. Registration Flow (Email/Password)

```
User registers → Backend generates 6-digit OTP → Stores in VerificationToken table → Sends via Resend
```

**Step-by-step:**

1. **OTP Generation** (`apps/backend/src/utils/generateOTP.ts`):
   - Generates 6-digit code: `Math.floor(100000 + Math.random() * 900000)`
   - Stores in `VerificationToken` table with:
     - `identifier`: user's email
     - `token`: 6-digit OTP code
     - `expires`: 15 minutes from now

2. **Email Sending** (`apps/backend/src/utils/sendOTP.ts`):
   - Renders React Email template (`VerificationOTP.tsx`)
   - Sends via Resend API with branded HTML email

3. **OTP Validation** (`apps/backend/src/routes/auth.ts`):
   - User enters OTP → Backend verifies against `VerificationToken` table
   - Checks expiry (must be < 15 minutes)
   - If valid: Deletes token (one-time use) → Marks `emailVerified = new Date()`

### 2. Database Schema

**VerificationToken Table** (Auth.js required):
```prisma
model VerificationToken {
  identifier String   // Email address
  token      String   // 6-digit OTP code
  expires    DateTime // Expiry time (15 minutes)
  
  @@unique([identifier, token])
}
```

**User Table** (updated):
```prisma
model User {
  emailVerified DateTime? // null = not verified, Date = verified
  password      String?   // Nullable for social login users
  // ... other fields
}
```

## How Social Login Skips OTP

### Discord/Google OAuth Flow

1. **User clicks "Continue with Google/Discord"**:
   - Auth.js redirects to OAuth provider
   - User authorizes
   - OAuth provider returns user info (including verified email)

2. **Auth.js Callbacks** (`apps/frontend/auth.ts`):
   - `signIn` callback: Checks if user exists
     - **New user**: Creates account via Prisma adapter → Sets `emailVerified = new Date()` immediately
     - **Existing user**: If `emailVerified` is null, sets it to `new Date()`
   - `jwt` callback: Ensures `emailVerified` is set after user creation

3. **No OTP Required**:
   - OAuth providers (Google, Discord) verify emails during OAuth flow
   - We trust their verification → Auto-set `emailVerified = new Date()`
   - User is immediately logged in with verified email

### Code Flow

```typescript
// In auth.ts signIn callback
if (account?.provider === "discord" || account?.provider === "google") {
  const existingUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!existingUser) {
    // New user - adapter will create, emailVerified set in jwt callback
    return true;
  } else if (!existingUser.emailVerified) {
    // Existing user but not verified - verify now
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { emailVerified: new Date() },
    });
  }
  return true;
}
```

## How Resend Sends Branded Email

### 1. React Email Template (`apps/backend/src/emails/VerificationOTP.tsx`)

- **Branded Design**:
  - Trayb logo/heading
  - Dark theme (background: #0a0a0a, container: #1a1a1a)
  - Styled OTP display (large, monospace, blue accent)
  - Verification button linking to `/verify-email`

- **Props**:
  - `username`: User's username
  - `otpCode`: 6-digit OTP code
  - `verificationUrl`: Link to verification page

### 2. Resend Wrapper (`apps/backend/src/utils/sendOTP.ts`)

```typescript
// Render React Email template to HTML
const emailHtml = await render(
  VerificationOTP({
    username,
    otpCode,
    verificationUrl: `${FRONTEND_URL}/verify-email`,
  })
);

// Send via Resend API
await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: email,
  subject: "Verify your Trayb email address",
  html: emailHtml,
});
```

### 3. Environment Variables Required

```env
# Resend
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@trayb.az

# Auth.js
AUTH_SECRET=your-secret-key-here

# OAuth Providers
DISCORD_CLIENT_ID=xxxxx
DISCORD_CLIENT_SECRET=xxxxx
GOOGLE_CLIENT_ID=xxxxx
GOOGLE_CLIENT_SECRET=xxxxx

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Registration Flow (Detailed)

1. **User submits registration form** → `POST /api/auth/register`
2. **Backend** (`apps/backend/src/routes/auth.ts`):
   - Validates input (username, email, password)
   - Checks for existing user
   - Hashes password with bcrypt
   - Creates user with `emailVerified = null`
   - Generates OTP via `generateOTP()` → Stores in `VerificationToken`
   - Sends OTP email via `sendOTP()` → Resend API
3. **User receives email** → Clicks link or enters OTP manually
4. **User enters OTP** → `POST /api/auth/verify-email`
5. **Backend verifies OTP**:
   - Checks `VerificationToken` table
   - Validates expiry
   - Deletes token (one-time use)
   - Updates user: `emailVerified = new Date()`
6. **User redirected to login** → Can now log in with credentials

## Login Flow (Detailed)

1. **User submits login form** → `POST /api/auth/login`
2. **Auth.js Credentials Provider** (`apps/frontend/auth.ts`):
   - Validates email/password
   - Checks `emailVerified` status
   - If not verified: Returns `EMAIL_NOT_VERIFIED` error
   - If verified: Creates JWT session → Sets HTTP-only cookie
3. **User redirected to home** → Authenticated

## Social Login Flow (Detailed)

1. **User clicks "Continue with Google/Discord"** → `signIn("google")` or `signIn("discord")`
2. **Auth.js OAuth Flow**:
   - Redirects to OAuth provider
   - User authorizes
   - Provider returns user info
3. **Auth.js Callbacks**:
   - `signIn`: Sets `emailVerified = new Date()` (OAuth emails are pre-verified)
   - `jwt`: Creates session token
   - `session`: Returns user data
4. **User redirected to home** → Authenticated with verified email

## Key Files

- `apps/frontend/auth.ts` - Auth.js configuration
- `apps/frontend/app/api/auth/[...nextauth]/route.ts` - Auth.js API handler
- `apps/backend/src/routes/auth.ts` - Registration/verification endpoints
- `apps/backend/src/utils/generateOTP.ts` - OTP generation/validation
- `apps/backend/src/utils/sendOTP.ts` - Resend email sending
- `apps/backend/src/emails/VerificationOTP.tsx` - React Email template
- `packages/db/prisma/schema.prisma` - Database schema (Account, Session, VerificationToken)

## Migration Steps

1. **Update Prisma schema**:
   ```bash
   cd packages/db
   bunx prisma migrate dev --name add_authjs_tables
   bunx prisma generate
   ```

2. **Set environment variables** (see above)

3. **Test flows**:
   - Email/password registration → OTP verification
   - Social login (Google/Discord) → Auto-verified
   - Email/password login → Requires verified email

## Notes

- **Password is optional** for social login users (`password` field is nullable)
- **Email verification is required** for credentials login
- **OTP expires after 15 minutes** (configurable in `generateOTP()`)
- **OTP is one-time use** (deleted after verification)
- **Social logins skip OTP** (OAuth providers verify emails)








