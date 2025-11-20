import NextAuth, { type Session, type User, CredentialsSignin } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { AdapterUser } from "@auth/core/adapters";
import type { Account } from "@auth/core/types";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { AUTH_ERROR_CODES } from "./lib/auth-codes";

// Type extensions for custom properties
interface UserWithAccessToken extends User {
  role?: string;
  accessToken?: string | null;
}

interface SessionWithAccessToken extends Session {
  accessToken?: string;
}

// Error classes extending CredentialsSignin from NextAuth
// These errors will be automatically handled and stored in session.error
class MissingCredentialsError extends CredentialsSignin {
  override code = AUTH_ERROR_CODES.MISSING_CREDENTIALS;
}

class InvalidCredentialsError extends CredentialsSignin {
  override code = AUTH_ERROR_CODES.INVALID_CREDENTIALS;
}

class EmailNotVerifiedError extends CredentialsSignin {
  override code = AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED;
}

class AuthError extends CredentialsSignin {
  override code = AUTH_ERROR_CODES.AUTH_ERROR;
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string().optional(),
  trustedDeviceToken: z.string().optional(),
});

// Helper function to get backend URL for server-side calls
// Matches the pattern used in other route handlers:
// 1. Check API_URL first (public API at api.trayb.az)
// 2. Check BACKEND_URL (should be localhost for same container)
// 3. Fall back to localhost with BACKEND_PORT
function getBackendUrl(): string {
  // API_URL should be set to https://api.trayb.az for public API calls
  if (process.env.API_URL) return process.env.API_URL;
  
  // BACKEND_URL should be http://localhost:3001 for same-container calls
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  
  // Fall back to localhost with port
  const port = Number(process.env.BACKEND_PORT) || 3001;
  return `http://localhost:${port}`;
}

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  basePath: "/api/auth",
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  cookies: {
    sessionToken: {
      name: `authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `authjs.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `authjs.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
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

          // Get backend URL for server-side call (prioritizes localhost in same container)
          const backendUrl = getBackendUrl();

          // Call Backend API to verify credentials
          const res = await fetch(`${backendUrl}/auth/verify-credentials`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, deviceId, trustedDeviceToken }),
          });

          // Handle fetch errors (network issues, timeouts, etc.)
          if (!res.ok) {
            const errorText = await res.text().catch(() => "Unknown error");
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // If response is not JSON, use the text as error
              console.error(`[Auth] Backend request failed: ${res.status} ${res.statusText} - ${errorText}`);
              throw new AuthError();
            }

            if (errorData.error === "Email not verified") throw new EmailNotVerifiedError();
            if (errorData.requiresDeviceVerification) {
              // Device verification required - throw invalid credentials for now
              // Could create a specific error class for this later if needed
              throw new InvalidCredentialsError();
            }
            throw new InvalidCredentialsError();
          }

          const data = await res.json();

          // Store user data and access token
          const user: UserWithAccessToken = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.username,
            role: data.user.role || "user",
            accessToken: data.token || null,
          };

          return user;

        } catch (error) {
          // Re-throw CredentialsSignin errors as-is (NextAuth will handle them)
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          // Log unexpected errors
          if (error instanceof Error) {
            console.error("[Auth] Credentials verification error:", error.message, error.stack);
          }
          // For unexpected errors, throw AuthError
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
          // Get backend URL for server-side call (prioritizes localhost in same container)
          const backendUrl = getBackendUrl();
          const res = await fetch(`${backendUrl}/auth/oauth-callback`, {
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

          // Store complete user data and access token in user object
          // These will be available in the JWT callback
          const userWithToken = user as UserWithAccessToken;
          userWithToken.id = data.user.id;
          userWithToken.name = data.user.username;
          userWithToken.email = data.user.email;
          userWithToken.role = data.user.role;
          userWithToken.accessToken = data.token; // Store access token for backend API calls

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
    async jwt({ token, user, trigger, account }) {
      if (user) {
        // Initial sign-in - store user data and access token
        const userWithToken = user as UserWithAccessToken;
        token.id = user.id;
        token.email = user.email ?? undefined;
        token.username = user.name ?? undefined;
        token.role = userWithToken.role || "user";
        token.accessToken = userWithToken.accessToken ?? undefined;

        // Clear any previous errors on successful login
        token.error = undefined;
        }

      return token;
    },
    async session({ session, token }) {
      // If token has error, pass it to session (for i18n support)
      // Errors from CredentialsSignin in authorize() are caught by NextAuth
      // and stored in token.error by NextAuth's internal handling
      if (token.error) {
        const error = token.error as { code: string; message: string };
        if (error.code && error.message) {
          session.error = {
            code: error.code,
            message: error.message,
          };
          return session;
        }
      }

      // Check if access token exists (required for authenticated session)
      if (!token?.accessToken) {
        session.error = {
          code: AUTH_ERROR_CODES.TOKEN_MISSING,
          message: "No access token found",
        };
        return session;
      }

      // Populate session with user data from token
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = (token.username as string | null) ?? undefined;
        session.user.role = token.role as string;

        // Include access token in session for API calls
        const sessionWithToken = session as SessionWithAccessToken;
        sessionWithToken.accessToken = token.accessToken as string;
      }

      return session;
    },
  },
});

