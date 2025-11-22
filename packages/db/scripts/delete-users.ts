import { prisma } from "../src/index.js";

/**
 * Delete all users from the database
 * This will cascade delete:
 * - Accounts (onDelete: Cascade)
 * - Sessions (onDelete: Cascade)
 * - PasswordHistory (onDelete: Cascade)
 * - VerificationTokens (will be cleaned up)
 */
async function deleteAllUsers() {
  try {
    console.log("Deleting all users...");

    // Delete all users (cascades to accounts, sessions, passwordHistory)
    const deletedUsers = await prisma.user.deleteMany({});

    // Also clean up verification tokens
    const deletedTokens = await prisma.verificationToken.deleteMany({});

    console.log(`✅ Deleted ${deletedUsers.count} user(s)`);
    console.log(`✅ Deleted ${deletedTokens.count} verification token(s)`);
    console.log("✅ Database cleaned successfully!");
  } catch (error) {
    console.error("❌ Error deleting users:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllUsers();
