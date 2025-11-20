import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { config } from "@/lib/config";

export async function GET() {
	try {
		const session = await auth() as any;
		if (!session?.user?.email || !session.user.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const backendToken = session.backendToken;

		if (!backendToken) {
			return NextResponse.json({ error: "No backend token available" }, { status: 401 });
		}

		// Call backend API
		const response = await fetch(`${config.backendUrl}/user/me/linked-accounts`, {
			headers: {
				"Authorization": `Bearer ${backendToken}`,
			},
		});

		if (!response.ok) {
			return NextResponse.json({ error: "Failed to fetch" }, { status: response.status });
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("linked-accounts GET error:", error);
		return NextResponse.json({ error: "Failed to load linked accounts" }, { status: 500 });
	}
}
