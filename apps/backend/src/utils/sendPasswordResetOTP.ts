import { Resend } from "resend";
import { render } from "@react-email/render";
import { PasswordResetOTP } from "../emails/PasswordResetOTP.js";
// Ensure react-dom/server is available for @react-email/render
// Import and assign to global to ensure it's available
import * as reactDOMServer from "react-dom/server";

// Helper function to get frontend URL from env ports
function getFrontendUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const port = Number(process.env.FRONTEND_PORT);
  if (!port) throw new Error("FRONTEND_PORT must be set in root .env file");
  return `http://localhost:${port}`;
}

// Make reactDOMServer available globally for @react-email/render
if (
  typeof globalThis !== "undefined" &&
  !(globalThis as Record<string, unknown>).reactDOMServer
) {
  (globalThis as Record<string, unknown>).reactDOMServer = reactDOMServer;
}

/**
 * Resend wrapper for sending password reset OTP emails
 *
 * How it works:
 * 1. Generates a 6-digit OTP code (handled by caller via generateOTP)
 * 2. Stores OTP in VerificationToken table (handled by generateOTP)
 * 3. Renders React Email template with OTP
 * 4. Sends via Resend API
 */

// Lazy initialization - only create Resend instance when actually needed
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export interface SendPasswordResetOTPParams {
  email: string;
  username: string;
  otpCode: string;
  resetUrl?: string;
}

/**
 * Sends a branded password reset OTP email using Resend and React Email
 *
 * @param params - Email parameters including OTP code
 * @returns Promise resolving to Resend response
 * @throws Error if Resend API key is missing or email sending fails
 */
export async function sendPasswordResetOTP({
  email,
  username,
  otpCode,
  resetUrl,
}: SendPasswordResetOTPParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error("RESEND_FROM_EMAIL environment variable is not set");
  }

  // Render React Email template to HTML
  // Ensure react-dom/server is available before rendering
  if (
    typeof globalThis !== "undefined" &&
    !(globalThis as Record<string, unknown>).reactDOMServer
  ) {
    const reactDOMServer = await import("react-dom/server");
    (globalThis as Record<string, unknown>).reactDOMServer = reactDOMServer;
  }

  const emailHtml = await render(
    PasswordResetOTP({
      username,
      otpCode,
      resetUrl: resetUrl || `${getFrontendUrl()}/reset-password`,
    })
  );

  // Send via Resend
  const resend = getResend();
  console.log(
    `[Email] Sending password reset email to ${email} with code ${otpCode}`
  );
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Reset your Trayb password",
    html: emailHtml,
  });

  if (error) {
    console.error(`[Email] Failed to send password reset email:`, error);
    throw new Error(
      `Failed to send password reset OTP email: ${error.message}`
    );
  }

  console.log(
    `[Email] Password reset email sent successfully. ID: ${data?.id}`
  );
}
