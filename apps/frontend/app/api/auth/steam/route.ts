import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveSteamOrigin } from "./utils";

/**
 * Helper function to get backend URL for browser redirects
 * For browser redirects, we need the public API URL, not localhost
 * Prioritizes API_URL (public API) for redirects
 */
function getBackendUrlForRedirect(): string {
  // For browser redirects, always use public API URL if available
  // API_URL should be set to https://api.trayb.az for public API calls
  if (process.env.API_URL) return process.env.API_URL;

  // Fallback to BACKEND_URL if API_URL not set
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;

  // Final fallback to localhost
  const port = Number(process.env.BACKEND_PORT) || 3001;
  return `http://localhost:${port}`;
}

/**
 * GET /api/auth/steam - Initiate Steam authentication
 * Redirects user to Steam OpenID login
 *
 * Query params:
 * - steamId: (dev only) Manual Steam ID for localhost development
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const manualSteamId = searchParams.get("steamId");
    const { origin, isLocalhost } = resolveSteamOrigin(request);

    // Development mode: Allow manual Steam ID input for localhost
    if (
      isLocalhost &&
      manualSteamId &&
      process.env.NODE_ENV === "development"
    ) {
      // Validate Steam ID format (should be 17 digits)
      if (!/^\d{17}$/.test(manualSteamId)) {
        return NextResponse.json(
          { error: "Invalid Steam ID format. Steam ID should be 17 digits." },
          { status: 400 }
        );
      }

      // Skip OpenID and directly link the account
      return NextResponse.redirect(
        new URL(
          `/api/auth/steam/callback?steamId=${manualSteamId}&dev=true`,
          origin
        )
      );
    }

    // Production mode: Use Steam OpenID
    // We redirect to the backend to initiate the Steam OpenID flow
    // The backend will handle generating the Steam URL and redirecting
    // IMPORTANT: For browser redirects, use public API URL (api.trayb.az), not localhost
    const backendUrl = getBackendUrlForRedirect();
    const backendSteamUrl = new URL(`${backendUrl}/auth/steam`);

    // Pass the frontend callback URL so the backend knows where to return
    const returnUrl = new URL("/api/auth/steam/callback", origin).toString();
    backendSteamUrl.searchParams.append("returnUrl", returnUrl);
    backendSteamUrl.searchParams.append("userId", session.user.id);

    return NextResponse.redirect(backendSteamUrl.toString());
  } catch (error) {
    console.error("Steam auth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Steam authentication" },
      { status: 500 }
    );
  }
}
