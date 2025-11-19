import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Get current user endpoint - uses Auth.js session
 * 
 * Returns:
 * - authenticated: boolean
 * - verified: boolean (emailVerified !== null)
 * - user: user object if authenticated
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { authenticated: false, verified: false },
        { status: 401 }
      );
    }

    // Check if email is verified (emailVerified is DateTime, null = not verified)
    // We need to check the database for this
    const { prisma } = await import("@trayb/db");
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { authenticated: false, verified: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      verified: user.emailVerified !== null,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        accounts: user.accounts,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { authenticated: false, verified: false },
      { status: 401 }
    );
  }
}

