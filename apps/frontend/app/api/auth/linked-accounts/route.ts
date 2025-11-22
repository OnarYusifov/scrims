import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { config } from "@/lib/config";

interface SessionWithToken {
  user?: {
    email?: string | null;
    id?: string;
  };
  accessToken?: string;
}

export async function GET() {
  try {
    const session = (await auth()) as SessionWithToken | null;
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = session.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token available" },
        { status: 401 }
      );
    }

    // Call backend API
    const response = await fetch(
      `${config.backendUrl}/user/me/linked-accounts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch" },
        { status: response.status }
      );
    }

    const data = (await response.json()) as unknown;
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("linked-accounts GET error:", error);
    return NextResponse.json(
      { error: "Failed to load linked accounts" },
      { status: 500 }
    );
  }
}
