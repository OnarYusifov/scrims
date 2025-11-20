import { NextRequest, NextResponse } from "next/server";
import { resendVerificationSchema } from "@trayb/types";

import { config } from "@/lib/config";

// Helper function to get backend URL from env ports
// Lazy evaluation - only called when route handler runs (not during build)
function getBackendUrl(): string {
  if (process.env.API_URL) return process.env.API_URL;
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  const port = Number(process.env.BACKEND_PORT);
  if (!port) {
    // Only throw error in development/runtime, not during build
    if (process.env.NODE_ENV !== "production" && !process.env.CI) {
      throw new Error("BACKEND_PORT must be set in root .env file");
    }
    // During build/CI, return a placeholder (won't be used)
    return config.backendUrl;
  }
  return `http://localhost:${port}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resendVerificationSchema.parse(body);

    const response = await fetch(`${getBackendUrl()}/auth/resend-verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to resend verification code" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}










