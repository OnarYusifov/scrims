import { NextRequest } from "next/server";

const envOrigin =
  process.env.FRONTEND_URL || process.env.NEXTAUTH_URL || process.env.AUTH_URL;

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

export function resolveSteamOrigin(request: NextRequest): {
  origin: string;
  isLocalhost: boolean;
} {
  if (envOrigin) {
    const normalized = normalizeOrigin(envOrigin);
    return {
      origin: normalized,
      isLocalhost:
        normalized.includes("localhost") || normalized.includes("127.0.0.1"),
    };
  }

  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ||
    (forwardedHost && forwardedHost.includes("localhost") ? "http" : "https");

  if (forwardedHost) {
    const origin = `${forwardedProto}://${forwardedHost}`;
    const normalized = normalizeOrigin(origin);
    return {
      origin: normalized,
      isLocalhost:
        forwardedHost.includes("localhost") ||
        forwardedHost.includes("127.0.0.1"),
    };
  }

  const fallback = normalizeOrigin(request.nextUrl.origin);
  return {
    origin: fallback,
    isLocalhost:
      fallback.includes("localhost") || fallback.includes("127.0.0.1"),
  };
}

export function buildExternalUrl(request: NextRequest, origin: string): string {
  return new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    origin
  ).toString();
}
