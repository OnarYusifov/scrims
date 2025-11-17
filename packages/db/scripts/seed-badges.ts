import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedBadges() {
  console.log("Seeding badges...");

  // Create sample badges
  const badges = [
    {
      label: "Early Member",
      variant: "default",
      description: "Joined during the early access period",
    },
    {
      label: "Beta Tester",
      variant: "secondary",
      description: "Participated in beta testing",
    },
    {
      label: "Founder",
      variant: "outline",
      description: "One of the founding members",
    },
  ];

  for (const badgeData of badges) {
    const existing = await prisma.badge.findFirst({
      where: { label: badgeData.label },
    });

    if (!existing) {
      await prisma.badge.create({
        data: badgeData,
      });
      console.log(`Created badge: ${badgeData.label}`);
    } else {
      console.log(`Badge already exists: ${badgeData.label}`);
    }
  }

  console.log("Badge seeding completed!");
}

seedBadges()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


