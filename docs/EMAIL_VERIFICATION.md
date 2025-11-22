# Email Verification System

This backend now includes a complete email verification system using **nodemailer** (lightweight, open-source) with SMTP support for your Spaceship custom domain email.

## Features

- ✅ Email verification required before login
- ✅ Secure token-based verification (32-byte random tokens)
- ✅ 24-hour token expiry
- ✅ Resend verification email endpoint
- ✅ HTML email templates with plain text fallback

## Database Migration

After updating the Prisma schema, you need to apply the migration:

```bash
cd packages/db
bunx prisma migrate dev --name add_email_verification
```

Or for quick development (applies changes directly without migration files):

```bash
cd packages/db
bunx prisma db push
```

Then regenerate the Prisma client:

```bash
bunx prisma generate
```

## Environment Variables

Add these to your `.env` file (or Dokploy environment configuration):

```env
# SMTP Configuration (Spaceship Email)
SMTP_HOST=smtp.spaceship.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=your-email@yourdomain.com

# Frontend URL (for verification links)
FRONTEND_URL=http://localhost:3000
# or in production:
# FRONTEND_URL=https://trayb.az
```

### Spaceship Email SMTP Settings

For Spaceship email, typical SMTP settings are:

- **Host**: `smtp.spaceship.email` or your custom SMTP server
- **Port**: `587` (TLS) or `465` (SSL)
- **Secure**: `false` for port 587, `true` for port 465
- **User**: Your full email address
- **Password**: Your email account password

## API Endpoints

### 1. Register (Updated)

**POST** `/api/auth/register`

Now returns a message instead of auto-logging in. User must verify email before login.

**Response:**

```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "requiresVerification": true
}
```

### 2. Verify Email

**POST** `/api/auth/verify-email`

**Body:**

```json
{
  "token": "verification-token-from-email"
}
```

**Response:**

```json
{
  "message": "Email verified successfully. You can now log in."
}
```

### 3. Resend Verification Email

**POST** `/api/auth/resend-verification`

**Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "message": "Verification email sent. Please check your inbox."
}
```

### 4. Login (Updated)

**POST** `/api/auth/login`

Now checks if email is verified. Returns 403 if email is not verified.

**Error Response (unverified):**

```json
{
  "error": "Email not verified. Please check your email for the verification link.",
  "requiresVerification": true
}
```

## Frontend Integration

You'll need to:

1. **Update registration flow** - Show message after registration instead of auto-login
2. **Create verification page** - Handle `/verify-email?token=...` route
3. **Update login error handling** - Show resend verification option when email not verified
4. **Add resend verification UI** - Allow users to request new verification emails

## Email Template

The verification email includes:

- Personalized greeting with username
- Clickable verification button
- Plain text link as fallback
- 24-hour expiry notice

You can customize the template in `apps/backend/src/utils/email.ts`.
