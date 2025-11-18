import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@trayb/types";

// Helper function to get backend URL from env ports
function getBackendUrl(): string {
  if (process.env.API_URL) return process.env.API_URL;
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  const port = Number(process.env.BACKEND_PORT);
  if (!port) throw new Error("BACKEND_PORT must be set in root .env file");
  return `http://localhost:${port}`;
}

const API_BASE_URL = getBackendUrl();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);

    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to send password reset code" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}










