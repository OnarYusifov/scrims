import { NextRequest, NextResponse } from "next/server";
import { verifyLoginSchema } from "@trayb/types";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyLoginSchema.parse(body);

    const response = await fetch(`${BACKEND_URL}/api/auth/verify-login`, {
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










