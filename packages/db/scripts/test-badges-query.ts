import { prisma } from "../src/index.js";

async function testBadgesQuery() {
  try {
    // First, find a user
    const user = await prisma.user.findFirst({
      select: { id: true, username: true },
    });

    if (!user) {
      console.log("No users found in database");
      return;
    }

    console.log(`Testing badges query for user: ${user.username} (${user.id})`);

    // Test the exact query from the API
    const userBadges = await prisma.userBadge.findMany({
      where: {
        userId: user.id,
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
      take: 3,
    });

    console.log(`Found ${userBadges.length} badges`);
    userBadges.forEach((ub) => {
      console.log(`- ${ub.badge.label} (${ub.badge.variant})`);
    });

    // Format badges like in the API
    const badges = userBadges.map((ub) => ({
      id: ub.badge.id,
      label: ub.badge.label,
      variant: ub.badge.variant as "default" | "secondary" | "destructive" | "outline",
      icon: ub.badge.icon || undefined,
    }));

    console.log("Formatted badges:", JSON.stringify(badges, null, 2));
  } catch (error) {
    console.error("Error testing badges query:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testBadgesQuery();


