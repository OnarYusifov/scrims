import "next-auth";

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    // id: string;
    username?: string;
    // email?: string | null;
    // name?: string | null;
    accessToken?: string | null;
  }

  interface Session {
    user: {
      // id: string;
      username?: string;
      // email?: string | null;
      // name?: string | null;
    };
    accessToken?: string;
    error?: {
      code: string;
      message: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // id?: string;
    username?: string;
    // email?: string | null;
    // name?: string | null;
    accessToken?: string | null;
    error?: {
      code: string;
      message: string;
    };
  }
}
