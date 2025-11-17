import { Resend } from "resend";
import { render } from "@react-email/render";
import { PasswordResetOTP } from "../emails/PasswordResetOTP.js";

/**
 * Resend wrapper for sending password reset OTP emails
 * 
 * How it works:
 * 1. Generates a 6-digit OTP code (handled by caller via generateOTP)
 * 2. Stores OTP in VerificationToken table (handled by generateOTP)
 * 3. Renders React Email template with OTP
 * 4. Sends via Resend API
 */

const resend = new Resend(process.env.RESEND_API_KEY);

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
  const emailHtml = await render(
    PasswordResetOTP({
      username,
      otpCode,
      resetUrl: resetUrl || `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password`,
    })
  );

  // Send via Resend
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Reset your Trayb password",
    html: emailHtml,
  });

  if (error) {
    throw new Error(`Failed to send password reset OTP email: ${error.message}`);
  }
}






