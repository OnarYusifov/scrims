/**
 * Generate and store OTP in VerificationToken table
 * 
 * How OTP is generated/stored/validated:
 * 1. Generate 6-digit OTP: Math.floor(100000 + Math.random() * 900000)
 * 2. Store in VerificationToken table with identifier (email), token (OTP), and expires (15 min)
 * 3. Send OTP via Resend using React Email template
 * 4. User enters OTP → Verify against VerificationToken → Mark emailVerified = new Date()
 */

import { prisma } from "@trayb/db";

export interface GenerateOTPResult {
  otpCode: string;
  expires: Date;
}

/**
 * Generates a 6-digit OTP code and stores it in VerificationToken table
 * 
 * @param identifier - Email address to associate with the OTP
 * @param expiresInMinutes - OTP expiry time in minutes (default: 15)
 * @returns OTP code and expiry date
 */
export async function generateOTP(
  identifier: string,
  expiresInMinutes: number = 15
): Promise<GenerateOTPResult> {
  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Calculate expiry
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + expiresInMinutes);

  // Delete any existing verification tokens for this email
  await prisma.verificationToken.deleteMany({
    where: {
      identifier,
    },
  });

  // Store in VerificationToken table (Auth.js format)
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: otpCode,
      expires,
    },
  });

  return {
    otpCode,
    expires,
  };
}

/**
 * Verifies an OTP code against VerificationToken table (without deleting it)
 * Use this for checking if OTP is valid before consuming it
 * 
 * @param identifier - Email address
 * @param token - OTP code to verify
 * @returns true if valid, false otherwise
 */
export async function checkOTP(
  identifier: string,
  token: string
): Promise<boolean> {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token,
      },
    },
  });

  if (!verificationToken) {
    return false;
  }

  // Check if expired
  if (verificationToken.expires < new Date()) {
    // Delete expired token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token,
        },
      },
    });
    return false;
  }

  // Valid token - don't delete yet (will be deleted when consumed)
  return true;
}

/**
 * Verifies and consumes an OTP code (deletes it after verification)
 * Use this when the OTP should be one-time use
 * 
 * @param identifier - Email address
 * @param token - OTP code to verify
 * @returns true if valid, false otherwise
 */
export async function verifyOTP(
  identifier: string,
  token: string
): Promise<boolean> {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token,
      },
    },
  });

  if (!verificationToken) {
    return false;
  }

  // Check if expired
  if (verificationToken.expires < new Date()) {
    // Delete expired token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token,
        },
      },
    });
    return false;
  }

  // Valid token - delete it (one-time use)
  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier,
        token,
      },
    },
  });

  return true;
}

