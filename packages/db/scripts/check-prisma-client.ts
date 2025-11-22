import { prisma } from "../src/index";

// Check what models are available
const prismaKeys = Object.keys(prisma).filter(
  (k) =>
    !k.startsWith("$") &&
    !k.startsWith("_") &&
    typeof prisma[k as keyof typeof prisma] === "object"
);

console.log("Available Prisma models/properties:");
prismaKeys.forEach((key) => {
  const value = prisma[key as keyof typeof prisma];
  if (value && typeof value === "object" && "findMany" in value) {
    console.log(`  ✓ ${key} (has findMany)`);
  } else {
    console.log(`  - ${key}`);
  }
});

// Specifically check for userBadge
console.log("\nChecking for userBadge:");
console.log("  prisma.userBadge exists:", "userBadge" in prisma);
console.log("  typeof prisma.userBadge:", typeof (prisma as any).userBadge);

if ((prisma as any).userBadge) {
  console.log(
    "  prisma.userBadge.findMany exists:",
    typeof (prisma as any).userBadge.findMany === "function"
  );
}

// Test a query
try {
  const result = await (prisma as any).userBadge.findMany({ take: 1 });
  console.log("\n✓ userBadge.findMany works! Found", result.length, "records");
} catch (error) {
  console.error("\n✗ userBadge.findMany failed:", error);
}

await prisma.$disconnect();
