import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    // Use NextAuth's signOut to properly clear session cookies
    await signOut({ 
      redirect: false 
    });

    const response = NextResponse.json({ success: true });
    
    // Clear any additional auth cookies that might exist
    // NextAuth v5 uses different cookie names depending on configuration
    const cookieNames = [
      "authjs.session-token",
      "next-auth.session-token",
      "auth-token",
      "__Secure-authjs.session-token",
      "__Host-authjs.session-token",
    ];

    cookieNames.forEach((cookieName) => {
      response.cookies.set(cookieName, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Even if signOut fails, try to clear cookies
    const response = NextResponse.json({ success: true });
    response.cookies.set("authjs.session-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  }
}




