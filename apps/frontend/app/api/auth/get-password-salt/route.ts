import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

/**
 * Get password salt for a user (for client-side password hashing)
 * Now proxies to backend API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward to backend
    const response = await fetch(
      `${config.backendUrl}/auth/get-password-salt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Get password salt error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve password salt" },
      { status: 500 }
    );
  }
}
