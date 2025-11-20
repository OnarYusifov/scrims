import NextAuth, { type Session, type User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { AdapterUser } from "@auth/core/adapters";
import type { Account } from "@auth/core/types";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { AUTH_ERROR_CODES } from "./lib/auth-codes";
import { config } from "./lib/config";

// Type extensions for custom properties
interface UserWithBackendToken extends User {
  role?: string;
  backendToken?: string;
}

interface SessionWithBackendToken extends Session {
  backendToken?: string;
}

interface ErrorWithCode extends Error {
  code: string;
}

// Custom error class for credentials signin errors
class CredentialsSigninError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "CredentialsSignin";
    this.code = code;
  }
}

class MissingCredentialsError extends CredentialsSigninError {
  constructor() {
    super("Missing credentials", AUTH_ERROR_CODES.MISSING_CREDENTIALS);
  }
}

class InvalidCredentialsError extends CredentialsSigninError {
  constructor() {
    super("Invalid credentials", AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }
}

class EmailNotVerifiedError extends CredentialsSigninError {
  constructor() {
    super("Email not verified", AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
  }
}

class AuthError extends CredentialsSigninError {
  constructor() {
    super("Authentication error", AUTH_ERROR_CODES.AUTH_ERROR);
  }
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string().optional(),
  trustedDeviceToken: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  basePath: "/api/auth",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-email",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new MissingCredentialsError();
          }

          const { email, password, deviceId, trustedDeviceToken } = loginSchema.parse(credentials);

          // Call Backend API to verify credentials
          const res = await fetch(`${config.backendUrl}/auth/verify-credentials`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, deviceId, trustedDeviceToken }),
          });

          const data = await res.json();

          if (!res.ok) {
            if (data.error === "Email not verified") throw new EmailNotVerifiedError();
            if (data.requiresDeviceVerification) {
              const error: ErrorWithCode = Object.assign(new Error("Device not trusted"), { code: "DEVICE_NOT_TRUSTED" });
              throw error;
            }
            throw new InvalidCredentialsError();
          }

          // Store backend token in user object if available
          const user: UserWithBackendToken = data.user;
          if (data.token) {
            user.backendToken = data.token;
          }

          return user;

        } catch (error) {
          if (error instanceof CredentialsSigninError) throw error;
          throw new AuthError();
        }
      },
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: "identify email" } },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }: { user: User | AdapterUser; account?: Account | null }) {
      if (account?.provider === "discord" || account?.provider === "google") {
        try {
          const res = await fetch(`${config.backendUrl}/auth/oauth-callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user: {
                email: user.email,
                name: user.name,
                image: user.image ?? undefined,
              },
              account: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                type: account.type,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            }),
          });

          console.log("[OAuth] Backend response status:", res.status);

          if (!res.ok) {
            const errorText = await res.text();
            console.error("[OAuth] Backend error:", res.status, errorText);
            return false;
          }

          const data = await res.json();
          console.log("[OAuth] Backend response data:", JSON.stringify(data, null, 2));

          // Check if we have the expected data structure
          if (!data.user) {
            console.error("[OAuth] Missing user in response:", data);
            return false;
          }

          // Store complete user data and JWT token in user object
          // These will be available in the JWT callback
          const userWithToken = user as UserWithBackendToken;
          userWithToken.id = data.user.id;
          userWithToken.name = data.user.username;
          userWithToken.email = data.user.email;
          userWithToken.role = data.user.role;
          userWithToken.backendToken = data.token; // Store JWT for backend API calls

          console.log("[OAuth] User data stored successfully for:", user.email);
          return true;
        } catch (e) {
          console.error("[OAuth] Callback error:", e);
          if (e instanceof Error) {
            console.error("[OAuth] Error stack:", e.stack);
          }
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }: { token: JWT; user?: User | AdapterUser; account?: Account | null }) {
      if (user) {
        // Initial sign-in - store user data and backend JWT token
        const userWithToken = user as UserWithBackendToken;
        token.id = user.id;
        token.email = user.email ?? undefined;
        token.username = user.name ?? undefined;
        token.role = userWithToken.role || "user";

        // Store backend JWT token if available (from OAuth login)
        if (userWithToken.backendToken) {
          token.backendToken = userWithToken.backendToken;
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token) {
        const sessionWithToken = session as SessionWithBackendToken;
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.name = (token.username as string | null) ?? undefined;

        // Include backend token in session for API calls
        sessionWithToken.backendToken = token.backendToken as string | undefined;
      }
      return session;
    },
  },
});

