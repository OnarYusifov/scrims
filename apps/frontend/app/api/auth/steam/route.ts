import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSteamAuthUrl } from "@/lib/steam-provider";
import { resolveSteamOrigin } from "./utils";

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
    if (isLocalhost && manualSteamId && process.env.NODE_ENV === "development") {
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
    const returnUrl = new URL("/api/auth/steam/callback", origin).toString();
    const steamAuthUrl = getSteamAuthUrl(returnUrl);

    return NextResponse.redirect(steamAuthUrl);
  } catch (error) {
    console.error("Steam auth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Steam authentication" },
      { status: 500 }
    );
  }
}

