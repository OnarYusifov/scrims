import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./auth.js";
import { oauthRoutes } from "./oauth.js";
import { steamRoutes } from "./steam.js";
import { userRoutes } from "./user.js";
import { prisma } from "@trayb/db";
import { jwtVerify } from "jose";
import {
  loginSchema,
  verifyLoginSchema,
  resendVerificationSchema,
} from "@trayb/types";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { sendLoginOTP } from "../utils/email.js";
import { sendOTP } from "../utils/sendOTP.js";
import { randomInt } from "crypto";

// Helper function to get frontend URL from env ports
function getFrontendUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const port = Number(process.env.FRONTEND_PORT);
  if (!port) throw new Error("FRONTEND_PORT must be set in root .env file");
  return `http://localhost:${port}`;
}

export async function registerRoutes(fastify: FastifyInstance) {
  // Register CORS
  await fastify.register(cors, {
    origin: getFrontendUrl(),
    credentials: true,
  });

  // Start device verification (send OTP tied to deviceId)
  fastify.post("/auth/device/start", {
    schema: {
      tags: ["auth"],
      summary: "Start device verification by sending OTP via email",
      body: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          deviceId: { type: "string" },
          fingerprint: { type: "object", additionalProperties: true },
        },
        required: ["email", "deviceId"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { email, deviceId } = request.body as any;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(200).send({ message: "If the account exists, a code was sent." });
      }
      const code = ("" + randomInt(100000, 999999));
      const identifier = `${email}|${deviceId}`;
      const expires = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.verificationToken.upsert({
        where: { identifier_token: { identifier, token: code } },
        update: { expires },
        create: { identifier, token: code, expires },
      });
      await sendOTP({
        email: user.email,
        username: user.username,
        otpCode: code,
        verificationUrl: `${getFrontendUrl()}/device-verify`,
      });
      return { message: "Device verification code sent." };
    } catch (error) {
      fastify.log.error(error);
      return (reply as any).code(400).send({ error: "Failed to start device verification" });
    }
  });

  // Verify device OTP (validates code and clears token)
  fastify.post("/auth/device/verify", {
    schema: {
      tags: ["auth"],
      summary: "Verify device OTP code",
      body: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          deviceId: { type: "string" },
          code: { type: "string" },
        },
        required: ["email", "deviceId", "code"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            token: { type: "string" }
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { email, deviceId, code } = request.body as any;
      const identifier = `${email}|${deviceId}`;
      const vt = await prisma.verificationToken.findFirst({
        where: { identifier, token: code, expires: { gt: new Date() } },
      });
      if (!vt) {
        return reply.code(400 as any).send({ error: "Invalid or expired code" });
      }
      // One-time use
      await prisma.verificationToken.deleteMany({ where: { identifier } });

      // Generate trusted device token
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "your-secret-key"
      );
      const expMs = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days
      const token = await new SignJWT({ email, deviceId, expMs })
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

      return { success: true, token };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400 as any).send({ error: "Verification failed" });
    }
  });

  // Register auth routes
  await fastify.register(authRoutes);
  await fastify.register(oauthRoutes);
  await fastify.register(steamRoutes);
  await fastify.register(userRoutes);

  // Health check
  fastify.get("/health", {
    schema: {
      tags: ["system"],
      summary: "Health check",
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
          },
        },
      },
    },
  }, async () => {
    return { status: "ok" };
  });

  // Get current user endpoint (for auth check)
  fastify.get("/auth/me", {
    schema: {
      tags: ["auth"],
      summary: "Get current authenticated user",
      response: {
        200: {
          type: "object",
          properties: {
            authenticated: { type: "boolean" },
            verified: { type: ["boolean", "string", "null"] },
            user: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string" },
                username: { type: "string" },
                email: { type: "string" },
                role: { type: "string" },
              },
            },
          },
        },
        401: {
          type: "object",
          properties: {
            authenticated: { type: "boolean" },
            verified: { type: "boolean" },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401 as any).send({ authenticated: false, verified: false });
      }

      const token = authHeader.substring(7);
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "your-secret-key"
      );

      let decoded;
      try {
        decoded = await jwtVerify(token, secret);
      } catch {
        return reply.code(401 as any).send({ authenticated: false, verified: false });
      }

      const userId = decoded.payload.userId as string;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          emailVerified: true,
        },
      });

      if (!user) {
        return reply.code(401 as any).send({ authenticated: false, verified: false });
      }

      return {
        authenticated: true,
        verified: user.emailVerified,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(401 as any).send({ authenticated: false, verified: false });
    }
  });

  // Debug endpoint to check environment variables (without exposing passwords)
  fastify.get("/debug/env", async (request, reply) => {
    return {
      smtpConfigured: {
        host: process.env.SMTP_HOST || "NOT SET",
        port: process.env.SMTP_PORT || "NOT SET",
        secure: process.env.SMTP_SECURE || "NOT SET",
        user: process.env.SMTP_USER || "NOT SET",
        password: process.env.SMTP_PASSWORD ? "***SET***" : "NOT SET",
        from: process.env.SMTP_FROM || "NOT SET",
      },
      frontendUrl: process.env.FRONTEND_URL || process.env.NEXTAUTH_URL || "NOT SET",
      port: process.env.PORT || "3001 (default)",
      host: process.env.HOST || "0.0.0.0 (default)",
    };
  });

  // Login endpoint
  fastify.post("/auth/login", {
    schema: {
      tags: ["auth"],
      summary: "Start login with email/password (sends OTP)",
      body: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
        required: ["email", "password"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
            requiresOTP: { type: "boolean" },
            redirectTo: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(401 as any).send({ error: "Invalid email or password" });
      }

      // Verify password (password is required for credentials login)
      if (!user.password) {
        return reply.code(401 as any).send({ error: "Invalid email or password" });
      }
      const isValidPassword = await bcrypt.compare(body.password, user.password);
      if (!isValidPassword) {
        return reply.code(401 as any).send({ error: "Invalid email or password" });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return reply.code(403 as any).send({
          error: "Email not verified. Please check your email for the verification link.",
          requiresVerification: true
        });
      }

      // Generate 6-digit login OTP code
      const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
      const loginCodeExpiry = new Date();
      loginCodeExpiry.setMinutes(loginCodeExpiry.getMinutes() + 10); // 10 minutes expiry

      // Update user with login OTP
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginCode,
          loginCodeExpiry,
        },
      });

      // Send login OTP email
      try {
        await sendLoginOTP({
          email: user.email,
          username: user.username,
          loginCode,
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to send login OTP email");
        return reply.code(500 as any).send({
          error: "Failed to send login verification code. Please try again."
        });
      }

      return {
        message: "Login verification code sent to your email. Please check your inbox.",
        requiresOTP: true,
        redirectTo: "/verify-email",
        email: user.email,
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400 as any).send({
          error: error.message || "Login failed. Please check your credentials and try again."
        });
      }
      return reply.code(400 as any).send({
        error: "Login failed. Please check your credentials and try again."
      });
    }
  });
  // Verify credentials endpoint (for NextAuth Credentials provider)
  // This checks email/password and returns user info WITHOUT sending OTP
  // Used by frontend to establish session
  fastify.post("/auth/verify-credentials", {
    schema: {
      tags: ["auth"],
      summary: "Verify credentials for NextAuth",
      body: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
          deviceId: { type: "string" },
          trustedDeviceToken: { type: "string" },
        },
        required: ["email", "password"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "string" },
                username: { type: "string" },
                email: { type: "string" },
                role: { type: "string" },
              },
            },
          },
        },
        401: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        403: {
          type: "object",
          properties: {
            error: { type: "string" },
            requiresDeviceVerification: { type: "boolean" },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = request.body as any; // Using any to avoid strict schema validation issues for now

      // Device verification check
      if (body.deviceId) {
        if (!body.trustedDeviceToken) {
          return reply.code(403).send({
            error: "Device not trusted",
            requiresDeviceVerification: true
          });
        }

        try {
          const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || "your-secret-key"
          );
          const { payload } = await jwtVerify(body.trustedDeviceToken, secret);

          // Type guard for trusted device payload
          type TrustedDevicePayload = {
            email?: string;
            deviceId?: string;
            expMs?: number;
          };

          const devicePayload = payload as TrustedDevicePayload;
          const valid =
            devicePayload.email === body.email &&
            devicePayload.deviceId === body.deviceId &&
            typeof devicePayload.expMs === "number" &&
            devicePayload.expMs > Date.now();

          if (!valid) {
            throw new Error("Invalid device token");
          }
        } catch (err) {
          return reply.code(403).send({
            error: "Device not trusted",
            requiresDeviceVerification: true
          });
        }
      }

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        fastify.log.warn(`[Auth] Login failed: User not found for email ${body.email}`);
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      if (!user.password) {
        fastify.log.warn(`[Auth] Login failed: No password set for user ${body.email} (likely OAuth user)`);
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(body.password, user.password);
      if (!isValidPassword) {
        fastify.log.warn(`[Auth] Login failed: Invalid password for user ${body.email}`);
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      if (!user.emailVerified) {
        fastify.log.warn(`[Auth] Login failed: Email not verified for user ${body.email}`);
        return reply.code(401).send({ error: "Email not verified" });
      }

      // Generate JWT token (same as verify-login endpoint)
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "your-secret-key"
      );
      const token = await new SignJWT({
        userId: user.id,
        email: user.email,
        role: user.role,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
        .sign(secret);

      fastify.log.info(`[Auth] Login successful for user ${body.email}`);

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(401).send({ error: "Authentication failed" });
    }
  });
  // Verify login OTP endpoint
  fastify.post("/auth/verify-login", {
    schema: {
      tags: ["auth"],
      summary: "Verify login OTP",
      body: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          code: { type: "string" },
        },
        required: ["email", "code"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
            token: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "string" },
                username: { type: "string" },
                email: { type: "string" },
                role: { type: "string" },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = verifyLoginSchema.parse(request.body);

      // Find user by email and login code
      const user = await prisma.user.findFirst({
        where: {
          email: body.email,
          loginCode: body.code,
          loginCodeExpiry: {
            gt: new Date(), // Code not expired
          },
        },
      });

      if (!user) {
        return reply.code(400 as any).send({
          error: "Invalid or expired login code"
        });
      }

      // Clear login code
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginCode: null,
          loginCodeExpiry: null,
        },
      });

      // Generate JWT token for login
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "your-secret-key"
      );
      const token = await new SignJWT({
        userId: user.id,
        email: user.email,
        role: user.role,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
        .sign(secret);

      return {
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400 as any).send({
          error: error.message || "Login verification failed. Please check the code and try again."
        });
      }
      return reply.code(400 as any).send({
        error: "Login verification failed. Please check the code and try again."
      });
    }
  });

  // Resend login OTP endpoint
  fastify.post("/auth/resend-login-otp", {
    schema: {
      tags: ["auth"],
      summary: "Resend login OTP",
      body: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
        },
        required: ["email"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = resendVerificationSchema.parse(request.body);

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        return reply.code(200).send({
          message: "If an account exists with this email, a login code has been sent."
        });
      }

      if (!user.emailVerified) {
        return reply.code(400 as any).send({
          error: "Email is not verified. Please verify your email first."
        });
      }

      // Generate new 6-digit login OTP code
      const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
      const loginCodeExpiry = new Date();
      loginCodeExpiry.setMinutes(loginCodeExpiry.getMinutes() + 10); // 10 minutes expiry

      // Update user with new code
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginCode,
          loginCodeExpiry,
        },
      });

      // Send login OTP email
      try {
        await sendLoginOTP({
          email: user.email,
          username: user.username,
          loginCode,
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to send login OTP email");
        return reply.code(500 as any).send({
          error: "Failed to send login code"
        });
      }

      return {
        message: "Login code sent. Please check your inbox.",
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400 as any).send({
          error: error.message || "Failed to resend login code. Please try again."
        });
      }
      return reply.code(400 as any).send({
        error: "Failed to resend login code. Please try again."
      });
    }
  });
}

