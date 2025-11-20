import { NextRequest, NextResponse } from "next/server";
import { verifyLoginSchema } from "@trayb/types";

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
    const validatedData = verifyLoginSchema.parse(body);

    const response = await fetch(`${getBackendUrl()}/auth/verify-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Login verification failed" },
        { status: response.status }
      );
    }

    // Set HTTP-only cookie with token after successful login verification
    const nextResponse = NextResponse.json(data);
    if (data.token) {
      nextResponse.cookies.set("auth-token", data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
    }

    return nextResponse;
  } catch (error) {
    console.error("Verify login error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}










