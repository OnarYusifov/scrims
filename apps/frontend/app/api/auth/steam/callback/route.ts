import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@trayb/db";
import { extractSteamId, getSteamProfile } from "@/lib/steam-provider";
import openid from "openid";

/**
 * GET /api/auth/steam/callback - Handle Steam OpenID callback
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const isDevMode = searchParams.get("dev") === "true";
    const manualSteamId = searchParams.get("steamId");

    let steamId: string | null = null;

    // Development mode: Use manual Steam ID (skip OpenID verification)
    if (isDevMode && manualSteamId && process.env.NODE_ENV === "development") {
      steamId = manualSteamId;
      console.log("[DEV MODE] Using manual Steam ID:", steamId);
    } else {
      // Production mode: Extract Steam ID from OpenID response
      const claimedId = searchParams.get("openid.claimed_id");
      steamId = extractSteamId(claimedId);

      if (!steamId) {
        return NextResponse.redirect(
          new URL("/profile?error=steam_auth_failed", request.url)
        );
      }

      // Verify OpenID response (skip in dev mode)
      const returnUrl = new URL("/api/auth/steam/callback", request.url).toString();
      const realm = new URL(request.url).origin;
      const relyingParty = new openid.RelyingParty(
        returnUrl,
        realm,
        true,
        true,
        []
      );

      // Build the assertion URL with all OpenID parameters
      const assertionUrl = request.url;

      const isValid = await new Promise<boolean>((resolve) => {
        relyingParty.verifyAssertion(assertionUrl, (error, result) => {
          if (error || !result || !result.authenticated) {
            console.error("OpenID verification error:", error);
            resolve(false);
            return;
          }
          resolve(true);
        });
      });

      if (!isValid) {
        return NextResponse.redirect(
          new URL("/profile?error=steam_verification_failed", request.url)
        );
      }
    }

    // Check if Steam account is already linked to another user
    const existingAccount = await prisma.account.findFirst({
      where: {
        provider: "steam",
        providerAccountId: steamId,
      },
    });

    if (existingAccount && existingAccount.userId !== session.user.id) {
      return NextResponse.redirect(
        new URL("/profile?error=steam_already_linked", request.url)
      );
    }

    // Get Steam profile (skip in dev mode if API key is not set)
    let steamProfile = null;
    if (isDevMode && !process.env.STEAM_API_KEY) {
      console.log("[DEV MODE] Skipping Steam profile fetch (no API key)");
      // Create a minimal profile for dev mode
      steamProfile = {
        steamid: steamId,
        personaname: `Steam User ${steamId.slice(-4)}`,
        profileurl: `https://steamcommunity.com/profiles/${steamId}`,
        avatar: "",
        avatarmedium: "",
        avatarfull: "",
        personastate: 0,
        communityvisibilitystate: 1,
        profilestate: 0,
        lastlogoff: Math.floor(Date.now() / 1000),
        commentpermission: 0,
      };
    } else {
      steamProfile = await getSteamProfile(steamId);
      if (!steamProfile) {
        return NextResponse.redirect(
          new URL("/profile?error=steam_profile_failed", request.url)
        );
      }
    }

    // Link or update Steam account
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "steam",
          providerAccountId: steamId,
        },
      },
      create: {
        userId: session.user.id,
        type: "oauth",
        provider: "steam",
        providerAccountId: steamId,
        access_token: steamId,
        expires_at: null,
        token_type: "bearer",
        scope: null,
        id_token: null,
        session_state: null,
      },
      update: {
        userId: session.user.id,
        access_token: steamId,
        expires_at: null,
        token_type: "bearer",
        scope: null,
        id_token: null,
        session_state: null,
      },
    });

    // Update user with Steam info if needed
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        // You can store Steam-specific data here if needed
      },
    });

    return NextResponse.redirect(new URL("/profile?steam_linked=true", request.url));
  } catch (error) {
    console.error("Steam callback error:", error);
    return NextResponse.redirect(
      new URL("/profile?error=steam_callback_failed", request.url)
    );
  }
}

