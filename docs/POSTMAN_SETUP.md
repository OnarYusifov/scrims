# Postman Collection Setup

## Import Collection

1. Open Postman
2. Click **Import** button
3. Select `Trayb_API.postman_collection.json`
4. Collection will be imported with all requests

## Environment Variables

The collection uses these variables (set them in Postman):

- **`base_url`**: Backend API URL (default: `http://localhost:3001`)
- **`test_email`**: Your email address for testing (e.g., `your-email@example.com`)
- **`otp_code`**: 6-digit OTP code from email (update this after receiving email)

## Testing Resend Email Flow

### Step 1: Check Environment

1. Run **"Debug Environment"** request
2. Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured

### Step 2: Register User (Sends OTP)

1. Set `test_email` variable to your email
2. Run **"Register User (Sends OTP via Resend)"** request
3. **Check your email inbox** - you should receive a branded OTP email from Resend
4. The email contains a 6-digit code (e.g., `123456`)

### Step 3: Verify Email

1. Copy the 6-digit OTP code from your email
2. Set `otp_code` variable in Postman to the code
3. Run **"Verify Email (Enter OTP)"** request
4. Should return success if code is valid

### Step 4: Resend (Optional)

1. If you need a new code, run **"Resend Verification Email"**
2. Check email again for new OTP code
3. Update `otp_code` variable and verify again

## Expected Email

You should receive an email with:

- **Subject**: "Verify your Trayb email address"
- **From**: Your `RESEND_FROM_EMAIL` address
- **Content**: Branded Trayb email template with:
  - Large 6-digit OTP code display
  - Verification link button
  - Expiry notice (15 minutes)

## Troubleshooting

- **No email received?**
  - Check spam folder
  - Verify `RESEND_API_KEY` is set correctly
  - Check `RESEND_FROM_EMAIL` is a verified domain in Resend
  - Run "Debug Environment" to check config

- **Invalid OTP code?**
  - Codes expire after 15 minutes
  - Use "Resend Verification Email" to get a new code
  - Make sure you're using the latest code from your inbox

- **Backend not running?**
  - Start backend: `cd apps/backend && bun run dev`
  - Verify health check returns `{"status":"ok"}`
