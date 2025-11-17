import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Get user badges endpoint
 * 
 * Query params:
 * - userId: optional, if not provided returns badges for current user
 * 
 * Returns:
 * - badges: array of badge objects
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Use dynamic import to ensure we get the latest Prisma client
    const { prisma } = await import("@trayb/db");

    // Get current user from database to get their ID
    let currentUserId: string | null = null;
    if (session?.user?.email) {
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      currentUserId = currentUser?.id || null;
    }

    // If userId is provided, check if user is admin or the same user
    // For now, only allow fetching own badges
    if (userId && currentUserId && userId !== currentUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const targetUserId = userId || currentUserId;

    if (!targetUserId) {
      return NextResponse.json(
        { badges: [] },
        { status: 200 }
      );
    }
    
    console.log("Fetching badges for userId:", targetUserId);
    console.log("Prisma client has userBadge:", "userBadge" in prisma);
    
    // Fetch user badges with badge details
    const userBadges = await prisma.userBadge.findMany({
      where: {
        userId: targetUserId,
      },
      include: {
        badge: {
          select: {
            id: true,
            label: true,
            variant: true,
            icon: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 3, // Limit to 3 badges
    });

    console.log("Found user badges:", userBadges.length);

    // Format badges for frontend
    const badges = userBadges.map((ub) => ({
      id: ub.badge.id,
      label: ub.badge.label,
      variant: ub.badge.variant as "default" | "secondary" | "destructive" | "outline",
      icon: ub.badge.icon || undefined,
    }));

    console.log("Returning badges:", badges);

    return NextResponse.json({ badges });
  } catch (error) {
    console.error("Error fetching badges:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { error: "Failed to fetch badges", details: errorMessage },
      { status: 500 }
    );
  }
}

