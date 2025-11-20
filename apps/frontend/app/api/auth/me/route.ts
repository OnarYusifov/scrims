import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { config } from "@/lib/config";

/**
 * Get current user endpoint - uses Auth.js session
 * Now uses backend JWT token for authentication
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth() as any;

    if (!session?.user) {
      return NextResponse.json(
        { authenticated: false, verified: false },
        { status: 401 }
      );
    }

    // If we have a backend token (from OAuth), use it
    const backendToken = session.backendToken;

    if (backendToken) {
      // Call backend with JWT token
      const response = await fetch(`${config.backendUrl}/auth/me`, {
        headers: {
          "Authorization": `Bearer ${backendToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    }

    // If no backend token or backend call failed, return 401
    // We no longer fallback to session data as we want to enforce backend verification
    return NextResponse.json(
      { authenticated: false, verified: false },
      { status: 401 }
    );
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { authenticated: false, verified: false },
      { status: 401 }
    );
  }
}
