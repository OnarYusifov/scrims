import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const COOKIE_NAME = "trusted_device";
const DAYS_14 = 14 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email, deviceId, code } = body as { email: string; deviceId: string; code: string };

		if (!email || !deviceId || !code) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}

		// Helper function to get backend URL from env ports
		// Lazy evaluation - only called when route handler runs (not during build)
		function getBackendUrl(): string {
			if (process.env.API_URL) return process.env.API_URL;
			if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
			const port = Number(process.env.BACKEND_PORT);
			if (!port) {
				// Only throw error in development/runtime, not during build
				if (process.env.NODE_ENV !== "production" && !process.env.CI) {
					throw new Error("BACKEND_PORT must be set in root .env file");
				}
				// During build/CI, return a placeholder (won't be used)
				return "http://localhost:3001";
			}
			return `http://localhost:${port}`;
		}

		// Verify code via backend
		const res = await fetch(`${getBackendUrl()}/auth/device/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, deviceId, code }),
		});
		const data = await res.json();
		if (!res.ok || !data.success) {
			return NextResponse.json({ error: data.error || "Verification failed" }, { status: 400 });
		}

		// Issue trusted device cookie (signed JWT)
		const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
		const expMs = Date.now() + DAYS_14;
		const token = await new SignJWT({ email, deviceId, expMs })
			.setProtectedHeader({ alg: "HS256" })
			.sign(secret);

		const response = NextResponse.json({ success: true });
		response.cookies.set(COOKIE_NAME, token, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
			maxAge: DAYS_14 / 1000,
		});
		return response;
	} catch {
		return NextResponse.json({ error: "Unexpected error" }, { status: 400 });
	}
}


