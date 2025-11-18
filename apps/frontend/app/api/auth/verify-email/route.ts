import { NextRequest, NextResponse } from "next/server";
import { verifyEmailSchema } from "@trayb/types";

// Helper function to get backend URL from env ports
function getBackendUrl(): string {
  if (process.env.API_URL) return process.env.API_URL;
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  const port = Number(process.env.BACKEND_PORT);
  if (!port) throw new Error("BACKEND_PORT must be set in root .env file");
  return `http://localhost:${port}`;
}

const API_BASE_URL = getBackendUrl();

/**
 * Verify email OTP endpoint
 * 
 * Flow:
 * 1. Verify OTP against VerificationToken table (via backend)
 * 2. Backend marks emailVerified = new Date()
 * 3. Sign in user with Auth.js credentials provider
 * 4. Auth.js creates session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyEmailSchema.parse(body);

    // Verify OTP via backend (checks VerificationToken table)
    const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Verification failed" },
        { status: response.status }
      );
    }

    // OTP verified - user is now verified
    // Frontend will handle sign-in after verification
    // User can now log in with their credentials
    return NextResponse.json({
      message: "Email verified successfully.",
      verified: true,
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}


