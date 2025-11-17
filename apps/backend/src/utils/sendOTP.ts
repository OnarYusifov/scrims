import { Resend } from "resend";
import { render } from "@react-email/render";
import { VerificationOTP } from "../emails/VerificationOTP.js";

/**
 * Resend wrapper for sending OTP verification emails
 * 
 * How it works:
 * 1. Generates a 6-digit OTP code (handled by caller)
 * 2. Stores OTP in VerificationToken table (handled by Auth.js)
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

export interface SendOTPParams {
  email: string;
  username: string;
  otpCode: string;
  verificationUrl?: string;
}

/**
 * Sends a branded OTP verification email using Resend and React Email
 * 
 * @param params - Email parameters including OTP code
 * @returns Promise resolving to Resend response
 * @throws Error if Resend API key is missing or email sending fails
 */
export async function sendOTP({
  email,
  username,
  otpCode,
  verificationUrl,
}: SendOTPParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error("RESEND_FROM_EMAIL environment variable is not set");
  }

  // Render React Email template to HTML
  const emailHtml = await render(
    VerificationOTP({
      username,
      otpCode,
      verificationUrl: verificationUrl || process.env.FRONTEND_URL + "/verify-email",
    })
  );

  // Send via Resend
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Verify your Trayb email address",
    html: emailHtml,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}








