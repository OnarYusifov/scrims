import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { config } from "@/lib/config";

/**
 * Get user badges endpoint
 * Now proxies to backend API
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Build query params for backend
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);

    // Call backend API with proper JWT token
    const backendToken = (session as any)?.backendToken;
    const response = await fetch(`${config.backendUrl}/user/badges?${params}`, {
      headers: backendToken ? {
        "Authorization": `Bearer ${backendToken}`,
      } : {},
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching badges:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch badges", details: errorMessage },
      { status: 500 }
    );
  }
}
