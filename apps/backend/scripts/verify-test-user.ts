import "@trayb/config/load-env";
import { prisma } from "@trayb/db";

async function main() {
  const id = "cmi892jzv0000ynvon7gaps7d";
  const user = await prisma.user.update({
    where: { id },
    data: {
      emailVerified: new Date(),
    },
    select: {
      id: true,
      email: true,
      emailVerified: true,
    },
  });

  console.table(user);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
