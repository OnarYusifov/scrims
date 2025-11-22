import { prisma } from "../src/index.js";

async function assignBadges() {
  console.log("Assigning badges to users...");

  // Get all badges
  const badges = await prisma.badge.findMany();

  if (badges.length === 0) {
    console.log("No badges found. Please run seed-badges.ts first.");
    return;
  }

  // Find user "yunar" (or any user you want to assign badges to)
  const user = await prisma.user.findFirst({
    where: {
      username: "yunar",
    },
  });

  if (!user) {
    console.log(
      "User 'yunar' not found. Please create the user first or change the username in this script."
    );
    return;
  }

  // Assign all badges to the user
  for (const badge of badges) {
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: user.id,
          badgeId: badge.id,
        },
      },
    });

    if (!existing) {
      await prisma.userBadge.create({
        data: {
          userId: user.id,
          badgeId: badge.id,
        },
      });
      console.log(`Assigned badge "${badge.label}" to user "${user.username}"`);
    } else {
      console.log(
        `Badge "${badge.label}" already assigned to user "${user.username}"`
      );
    }
  }

  console.log("Badge assignment completed!");
}

assignBadges()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
