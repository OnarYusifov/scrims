import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@trayb/db";
import { extractSaltFromHash } from "@/lib/password-hash";

/**
 * Get password salt for a user (for client-side password hashing)
 * This allows the client to hash the password with the same salt as stored
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        emailVerified: true,
      },
    });

    // Don't reveal if user exists for security
    // Always return a salt (even if user doesn't exist)
    if (!user || !user.password) {
      // Return a dummy salt to prevent user enumeration
      const dummySalt = "$2a$10$dummySaltForSecurity123";
      return NextResponse.json({ salt: dummySalt });
    }

    // Extract salt from stored password hash
    const salt = extractSaltFromHash(user.password);
    
    if (!salt) {
      return NextResponse.json(
        { error: "Invalid password format" },
        { status: 500 }
      );
    }

    return NextResponse.json({ salt });
  } catch (error) {
    console.error("Get password salt error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve password salt" },
      { status: 500 }
    );
  }
}



