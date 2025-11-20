import "next-auth";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { AUTH_ERROR_CODES } from "@/types/auth_codes";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

class MissingCredentialsError extends CredentialsSignin {
  code = AUTH_ERROR_CODES.MISSING_CREDENTIALS;
}

class InvalidCredentialsError extends CredentialsSignin {
  code = AUTH_ERROR_CODES.INVALID_CREDENTIALS;
}

class AuthError extends CredentialsSignin {
  code = AUTH_ERROR_CODES.AUTH_ERROR;
}

async function handleLogin(username: string, password: string, request?: Request) {
  try {
    // Construct proxy URL - use app base URL if available, otherwise construct from request
    let proxyUrl = "/api/proxy/api/Auth/login";
    
    // If we have a request, construct full URL
    if (request) {
      const url = new URL(request.url);
      proxyUrl = `${url.origin}${proxyUrl}`;
    } else {
      // Fallback: use environment variable or construct from NEXT_PUBLIC_APP_URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
      proxyUrl = `${appUrl}${proxyUrl}`;
    }

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        throw new InvalidCredentialsError();
      }
      throw new AuthError();
    }

    const data = await response.json();

    return {
      username: username,
      accessToken: data.token || data.accessToken || null,
    };
  } catch (error) {
    // If it's already a CredentialsSignin error, re-throw it
    if (error instanceof CredentialsSignin) {
      throw error;
    }
    // For other errors, throw AuthError
    throw new AuthError();
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: { signIn: "/", error: "/error" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) {
          throw new MissingCredentialsError();
        }

        try {
          return await handleLogin(
            credentials.username as string,
            credentials.password as string,
            request
          );
        } catch (error) {
          // Re-throw CredentialsSignin errors as-is
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          // For unexpected errors, throw AuthError
          throw new AuthError();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.username = user.username;
        token.accessToken = user.accessToken;
        // Clear any previous errors on successful login
        token.error = undefined;
      }

      return token;
    },

    async session({ session, token }) {
      // If token has error, pass it to session
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

      if (!token?.accessToken) {
        session.error = {
          code: AUTH_ERROR_CODES.TOKEN_MISSING,
          message: "No access token found",
        };
        return session;
      }

      session.user.username = token.username as string;
      session.accessToken = token.accessToken as string;

      return session;
    },
  },
});
