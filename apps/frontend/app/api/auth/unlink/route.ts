import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { config } from "@/lib/config";

const unlinkSchema = z.object({
  provider: z.enum(["google", "discord", "steam"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider } = unlinkSchema.parse(body);

    // Call backend API
    const accessToken = (session as { accessToken?: string }).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token available" },
        { status: 401 }
      );
    }

    const response = await fetch(`${config.backendUrl}/user/me/unlink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ provider }),
    });

    if (!response.ok) {
      const error = (await response.json()) as {
        error?: string;
        message?: string;
      };
      return NextResponse.json(error, { status: response.status });
    }

    const data = (await response.json()) as unknown;
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("unlink POST error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to unlink account" },
      { status: 500 }
    );
  }
}
