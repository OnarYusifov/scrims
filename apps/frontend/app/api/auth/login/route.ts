import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { jwtVerify } from "jose";

/**
 * Login endpoint - uses Auth.js credentials provider
 * 
 * Flow:
 * 1. Validate credentials
 * 2. Auth.js checks emailVerified status
 * 3. If verified, creates session and sets cookies
 * 4. If not verified, returns error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, deviceId } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required. Please fill in all fields." },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Validate password is not empty (plain password expected)
    if (password.length === 0) {
      return NextResponse.json(
        { error: "Password cannot be empty." },
        { status: 400 }
      );
    }

    // Use Auth.js signIn with credentials provider
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error === "EMAIL_NOT_VERIFIED") {
      return NextResponse.json(
        { 
          error: "Email not verified. Please check your email for the verification code and verify your account before logging in.",
          requiresVerification: true 
        },
        { status: 403 }
      );
    }

    if (result?.error === "CredentialsSignin") {
      return NextResponse.json(
        { error: "Invalid email or password. Please check your credentials and try again." },
        { status: 401 }
      );
    }

    if (result?.error) {
      return NextResponse.json(
        { error: `Authentication failed: ${result.error}. Please try again.` },
        { status: 401 }
      );
    }

    // Device trust check
    try {
      const trusted = request.cookies.get("trusted_device")?.value;
      if (trusted && deviceId) {
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
        const { payload } = await jwtVerify(trusted, secret);
        
        // Type guard for trusted device payload
        type TrustedDevicePayload = {
          email?: string;
          deviceId?: string;
          expMs?: number;
        };
        
        const devicePayload = payload as TrustedDevicePayload;
        const valid =
          devicePayload.email === email &&
          devicePayload.deviceId === deviceId &&
          typeof devicePayload.expMs === "number" &&
          devicePayload.expMs > Date.now();
        if (valid) {
          return NextResponse.json({ message: "Login successful" });
        }
      }
    } catch {
      // ignore parse errors
    }

    // If untrusted device -> request device verification
    return NextResponse.json(
      {
        requiresDeviceVerification: true,
        email,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Login error:", error);
    
    // Provide more descriptive error messages
    if (error instanceof Error) {
      if (error.message.includes("JSON")) {
        return NextResponse.json(
          { error: "Invalid request format. Please try again." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Login failed: ${error.message}. Please try again.` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "An unexpected error occurred during login. Please try again later." },
      { status: 500 }
    );
  }
}

