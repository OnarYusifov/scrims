import "next-auth";
import { AUTH_ERROR_CODES } from "./lib/auth-codes";

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    id: string;
    username?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      username?: string;
      email?: string | null;
      name?: string | null;
      role?: string;
    };
    error?: {
      code: string;
      message: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
    error?: {
      code: string;
      message: string;
    };
  }
}


