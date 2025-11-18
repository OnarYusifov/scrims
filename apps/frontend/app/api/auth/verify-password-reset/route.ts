import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordResetSchema } from "@trayb/types";

const API_BASE_URL = process.env.API_URL || process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyPasswordResetSchema.parse(body);

    const response = await fetch(`${API_BASE_URL}/auth/verify-password-reset`, {
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

    return NextResponse.json(data);
  } catch (error) {
    console.error("Verify password reset error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}










