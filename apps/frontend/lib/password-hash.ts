import bcrypt from "bcryptjs";

/**
 * Hash password with bcrypt before sending to API
 * Uses bcrypt.hashSync for browser compatibility
 */
export async function hashPassword(
  password: string,
  salt?: string
): Promise<string> {
  try {
    let saltToUse: string;

    if (salt) {
      // Use provided salt (for login - use the salt from stored hash)
      saltToUse = salt;
    } else {
      // Generate new salt (for registration/reset)
      saltToUse = bcrypt.genSaltSync(10);
    }

    // Hash password with salt
    const hashedPassword = bcrypt.hashSync(password, saltToUse);
    return hashedPassword;
  } catch (error) {
    console.error("Password hashing error:", error);
    throw new Error("Password hashing failed");
  }
}

/**
 * Extract salt from bcrypt hash
 * Bcrypt hashes format: $2a$10$saltAndHash (first 29 characters are salt)
 */
export function extractSaltFromHash(hash: string): string | null {
  if (hash.match(/^\$2[ayb]\$/)) {
    // Extract first 29 characters (salt)
    return hash.substring(0, 29);
  }
  return null;
}
