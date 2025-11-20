import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { config } from "@/lib/config";
import { resolveSteamOrigin } from "../utils";

/**
 * GET /api/auth/steam/callback - Handle Steam OpenID callback
 */
export async function GET(request: NextRequest) {
  const { origin } = resolveSteamOrigin(request);
  const buildUrl = (path: string) => new URL(path, origin);

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.redirect(buildUrl("/login?error=unauthorized"));
    }

    // Forward all search params to the backend
    const searchParams = request.nextUrl.searchParams;
    const backendUrl = new URL(`${config.backendUrl}/auth/steam/callback`);
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    // Add user ID to the backend request
    backendUrl.searchParams.append("userId", session.user.id);

    // Call backend to handle verification and linking
    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Pass the auth token if available, though the backend might rely on the openid params
        ...(session as { backendToken?: string }).backendToken ? { "Authorization": `Bearer ${(session as { backendToken?: string }).backendToken}` } : {}
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend Steam callback failed:", response.status, errorText);
      return NextResponse.redirect(buildUrl("/profile?error=steam_callback_failed"));
    }

    const data = await response.json() as { error?: string };

    if (data.error) {
      return NextResponse.redirect(buildUrl(`/profile?error=${data.error}`));
    }

    return NextResponse.redirect(buildUrl("/profile?steam_linked=true"));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Steam callback error:", error);
    return NextResponse.redirect(process.env.NEXTAUTH_URL + "/login?error=" + encodeURIComponent(errorMessage));
  }
}
