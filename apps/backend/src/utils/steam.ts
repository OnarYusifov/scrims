import openid from "openid";

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

// Steam Web API response types
interface SteamPlayerData {
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

interface SteamAPIResponse {
    response: {
        players: SteamPlayerData[];
    };
}

/**
 * Verify Steam OpenID assertion
 * @param params Query parameters from the callback request
 * @param requestUrl The full request URL (protocol + host + path + query) - required for verification
 * @returns Steam ID if verified, null otherwise
 */
export const verifySteamOpenId = async (
    params: Record<string, string>,
    requestUrl: string
): Promise<string | null> => {
    // The return_to URL must match what was sent in the original request
    // We extract it from the params themselves as Steam echoes it back
    const returnUrl = params["openid.return_to"];

    if (!returnUrl) {
        throw new Error("Missing openid.return_to parameter");
    }

    if (!requestUrl) {
        throw new Error("requestUrl is required for OpenID verification");
    }

    const relyingParty = new openid.RelyingParty(
        returnUrl,
        null, // Realm (optional, inferred from returnUrl)
        true, // Stateless
        false, // Strict
        [] // Extensions
    );

    // verifyAssertion can accept a URL string or a request object
    // We'll construct a request-like object that the library expects
    // The library checks for .method property, so we need to provide a request object
    const requestObject = {
        method: "GET",
        url: requestUrl,
        headers: {},
    };

    return new Promise((resolve, reject) => {
        relyingParty.verifyAssertion(requestObject, (error, result) => {
            if (error) {
                return reject(error);
            }
            if (!result || !result.authenticated || !result.claimedIdentifier) {
                return resolve(null);
            }

            // Extract Steam ID from claimed identifier
            // Format: https://steamcommunity.com/openid/id/76561198000000000
            const match = result.claimedIdentifier.match(/\/id\/(\d+)$/);
            return resolve(match?.[1] ?? null);
        });
    });
};

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
        const data = (await response.json()) as SteamAPIResponse;

        if (!data.response || !data.response.players || data.response.players.length === 0) {
            return null;
        }

        const player = data.response.players[0];
        if (!player) {
            return null;
        }

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
