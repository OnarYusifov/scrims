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

		// Verify code via backend
		const res = await fetch(`${process.env.BACKEND_URL || "http://localhost:5001"}/api/auth/device/verify`, {
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


