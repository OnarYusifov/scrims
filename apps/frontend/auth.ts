import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@trayb/db";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AUTH_ERROR_CODES, getAuthErrorMessage } from "./lib/auth-codes";

// Custom error classes with error codes
class MissingCredentialsError extends CredentialsSignin {
  code = AUTH_ERROR_CODES.MISSING_CREDENTIALS;
}

class InvalidCredentialsError extends CredentialsSignin {
  code = AUTH_ERROR_CODES.INVALID_CREDENTIALS;
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED;
}

class AuthError extends CredentialsSignin {
  code = AUTH_ERROR_CODES.AUTH_ERROR;
}

/**
 * Auth.js Configuration
 * 
 * How OTP is generated/stored/validated:
 * 1. On email/password signup: Generate 6-digit OTP → Store in VerificationToken table → Send via Resend
 * 2. User enters OTP → Verify against VerificationToken → Mark emailVerified = new Date()
 * 3. OTP expires after 15 minutes (handled by VerificationToken.expires)
 * 
 * How social login skips OTP:
 * - Discord/Google providers automatically set emailVerified = new Date() on first login
 * - This happens in the signIn callback when account is created via OAuth
 * - No OTP is generated or sent for social logins
 * 
 * How Resend sends branded email:
 * - Backend utility (sendOTP.ts) renders React Email template (VerificationOTP.tsx)
 * - Template includes Trayb branding, styled OTP display, and verification link
 * - Resend API sends the rendered HTML email
 */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  trustHost: true, // Required for OAuth to work properly
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-email",
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
          // Check if credentials are provided
          if (!credentials?.email || !credentials?.password) {
            throw new MissingCredentialsError();
          }

          const { email, password } = loginSchema.parse(credentials);

          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            // Don't reveal if user exists for security - throw invalid credentials
            throw new InvalidCredentialsError();
          }

          if (!user.password) {
            // User exists but has no password (social login only)
            throw new InvalidCredentialsError();
          }

          // Verify password using bcrypt.compare
          // Login sends plain password (encrypted by HTTPS), registration sends hashed password
          // Check if the stored password is a bcrypt hash
          const storedIsBcryptHash = user.password.match(/^\$2[ayb]\$/);
          const providedIsBcryptHash = password.match(/^\$2[ayb]\$/);
          
          let isValidPassword = false;
          
          if (providedIsBcryptHash && storedIsBcryptHash) {
            // Both are bcrypt hashes - compare directly (for registration flow)
            isValidPassword = password === user.password;
          } else if (!providedIsBcryptHash && storedIsBcryptHash) {
            // Plain password provided, stored is bcrypt hash - use bcrypt.compare (for login)
            isValidPassword = await bcrypt.compare(password, user.password);
          } else {
            // Fallback: direct comparison (for backwards compatibility)
            isValidPassword = password === user.password;
          }
          
          if (!isValidPassword) {
            throw new InvalidCredentialsError();
          }

          // Check if email is verified (emailVerified is DateTime, null = not verified)
          if (!user.emailVerified) {
            // User exists but email not verified - throw error with code
            throw new EmailNotVerifiedError();
          }

          // Clear any previous errors on successful login
          return {
            id: user.id,
            email: user.email,
            name: user.username,
            role: user.role,
          };
        } catch (error) {
          // Re-throw CredentialsSignin errors as-is (they have error codes)
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          // For other errors, throw generic AuthError
          console.error("[auth] Authorize error:", error);
          throw new AuthError();
        }
      },
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify email",
        },
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    async signIn({ user, account, profile }) {
      // Social login (Discord/Google) - auto-verify email
      if (account?.provider === "discord" || account?.provider === "google") {
        // Ensure user has email
        if (!user.email) {
          console.error("OAuth user missing email:", user);
          return false;
        }

        // Try to find an existing user by email
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // If user with this email already exists, link the account and sign in as that user
        if (existingUser) {
          // Ensure email is verified
          if (!existingUser.emailVerified) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { emailVerified: new Date() },
            });
          }

          // Check if an account record already exists for this provider+providerAccountId
          const existingAccount = await prisma.account.findFirst({
            where: {
              provider: account.provider,
              providerAccountId: account.providerAccountId!,
            },
          });

          if (existingAccount) {
            // Account exists - check if it's linked to the correct user
            if (existingAccount.userId !== existingUser.id) {
              // Reassign account to this user (edge case if previously linked elsewhere)
              await prisma.account.update({
                where: { id: existingAccount.id },
                data: { userId: existingUser.id },
              });
            }
            // Account is already linked - set user.id so adapter uses existing user
            (user as any).id = existingUser.id;
          } else {
            // Account doesn't exist yet - create it manually linked to existing user
            // This prevents OAuthAccountNotLinked error from the adapter
            try {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId!,
                  access_token: (account as any).access_token || null,
                  refresh_token: (account as any).refresh_token || null,
                  expires_at: (account as any).expires_at || null,
                  token_type: (account as any).token_type || null,
                  scope: (account as any).scope || null,
                  id_token: (account as any).id_token || null,
                  session_state: (account as any).session_state || null,
                },
              });
            } catch (error: any) {
              // Handle race condition - account might have been created between check and create
              if (error?.code === "P2002" || error?.message?.includes("Unique constraint")) {
                // Account was created by another process - verify it's linked correctly
                const createdAccount = await prisma.account.findFirst({
                  where: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId!,
                  },
                });
                if (createdAccount && createdAccount.userId !== existingUser.id) {
                  // Reassign to correct user
                  await prisma.account.update({
                    where: { id: createdAccount.id },
                    data: { userId: existingUser.id },
                  });
                }
              } else {
                // Re-throw other errors
                throw error;
              }
            }
            // Set user.id so adapter uses existing user for session
            (user as any).id = existingUser.id;
          }
          // Allow sign in - account is now linked, adapter will create session
          return true;
        }
        // No existing user by email, proceed with normal OAuth flow (adapter will create user)
        return true;
      }

      // Credentials login - handled by authorize function
      return true;
    },
    async jwt({ token, user, account, trigger, error }) {
      // If there's an error from signIn, store it in the token
      if (error) {
        // Check if error is a CredentialsSignin with a code
        if (error instanceof CredentialsSignin && (error as any).code) {
          const errorCode = (error as any).code as string;
          token.error = {
            code: errorCode,
            message: getAuthErrorMessage(errorCode as any),
          };
        } else {
          // Generic error
          token.error = {
            code: AUTH_ERROR_CODES.AUTH_ERROR,
            message: getAuthErrorMessage(AUTH_ERROR_CODES.AUTH_ERROR),
          };
        }
        return token;
      }

      // Initial sign in - clear any previous errors
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "user";
        token.email = user.email;
        token.username = user.name;
        // Clear any previous errors on successful login
        token.error = undefined;
      }

      // Social login - set emailVerified after user is created
      if (account && (account.provider === "discord" || account.provider === "google")) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
        });

        if (dbUser && !dbUser.emailVerified) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              emailVerified: new Date(),
            },
          });
        }
      }

      return token;
    },
    async session({ session, token }) {
      // If token has error, pass it to session
      if (token.error) {
        session.error = {
          code: token.error.code,
          message: token.error.message,
        };
        return session;
      }

      // Set user data from token
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.name = token.username as string;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // This is called when a new user is created by the Prisma adapter
      // For OAuth logins, set emailVerified and username
      if (!user.email) {
        console.error("User created without email:", user);
        return;
      }

      const email = user.email;
      // Generate a username from email or use the name from OAuth provider
      const emailPrefix = email.split("@")[0] || "user";
      let username = (user.name || emailPrefix)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .substring(0, 20);
      
      // If username is empty or too short, use email prefix
      if (!username || username.length < 3) {
        username = emailPrefix.substring(0, 20);
      }
        
        // Ensure username is unique - append random number if needed
        let finalUsername = username;
        let counter = 0;
        while (counter < 100) {
          const existing = await prisma.user.findUnique({
            where: { username: finalUsername },
          });
          
          if (!existing) break;
          
          finalUsername = `${username}${Math.floor(Math.random() * 1000)}`;
          counter++;
        }

      // Update user with username and emailVerified
      await prisma.user.update({
        where: { id: user.id },
        data: {
          username: finalUsername,
          emailVerified: new Date(), // OAuth providers verify emails
        },
      });

      // For Discord, also save discord field if available
      // Check if this is a Discord login by checking accounts
      const account = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: "discord",
        },
      });

      if (account && user.name) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            discord: user.name, // Discord username
          },
        });
      }
    },
  },
});

