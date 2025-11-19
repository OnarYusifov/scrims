// Steam authentication utilities
// Steam uses OpenID 2.0, not OAuth 2.0, so we handle it separately

export interface SteamProfile {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  personastate: number;
  communityvisibilitystate: number;
  profilestate: number;
  lastlogoff: number;
  commentpermission: number;
}

/**
 * Generate Steam OpenID authentication URL
 */
export function getSteamAuthUrl(returnUrl: string): string {
  const baseUrl = "https://steamcommunity.com/openid/login";
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnUrl,
    "openid.realm": new URL(returnUrl).origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Extract Steam ID from OpenID response
 */
export function extractSteamId(claimedId: string | null): string | null {
  if (!claimedId) return null;
  const match = claimedId.match(/\/id\/(\d+)$/);
  return match && match[1] ? match[1] : null;
}

/**
 * Get Steam user profile from Steam Web API
 */
export async function getSteamProfile(steamId: string): Promise<SteamProfile | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    throw new Error("STEAM_API_KEY is not configured");
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
    );
    const data = await response.json();

    if (!data.response || !data.response.players || data.response.players.length === 0) {
      return null;
    }

    const player = data.response.players[0];
    return {
      steamid: player.steamid,
      personaname: player.personaname,
      profileurl: player.profileurl,
      avatar: player.avatar,
      avatarmedium: player.avatarmedium,
      avatarfull: player.avatarfull,
      personastate: player.personastate,
      communityvisibilitystate: player.communityvisibilitystate,
      profilestate: player.profilestate,
      lastlogoff: player.lastlogoff,
      commentpermission: player.commentpermission,
    };
  } catch (error) {
    console.error("Steam API error:", error);
    throw error;
  }
}

