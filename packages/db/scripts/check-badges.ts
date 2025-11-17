import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkBadges() {
  const user = await prisma.user.findFirst({
    where: { username: "yunar" },
    include: {
      userBadges: {
        include: {
          badge: true,
        },
      },
    },
  });

  if (!user) {
    console.log("User 'yunar' not found");
    return;
  }

  console.log("User:", user.username);
  console.log("User ID:", user.id);
  console.log("Badges assigned:", user.userBadges.length);
  user.userBadges.forEach((ub) => {
    console.log(`- ${ub.badge.label} (${ub.badge.variant})`);
  });

  // Also check all badges
  const allBadges = await prisma.badge.findMany();
  console.log("\nAll badges in database:", allBadges.length);
  allBadges.forEach((b) => {
    console.log(`- ${b.label} (${b.variant})`);
  });
}

checkBadges()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


