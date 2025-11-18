import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./auth.js";
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

export async function registerRoutes(fastify: FastifyInstance) {
  // Register CORS
  await fastify.register(cors, {
    origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    credentials: true,
  });

  // Start device verification (send OTP tied to deviceId)
  fastify.post("/api/auth/device/start", {
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
        verificationUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/device-verify`,
      });
      return { message: "Device verification code sent." };
    } catch (error) {
      fastify.log.error(error);
      return (reply as any).code(400).send({ error: "Failed to start device verification" });
    }
  });

  // Verify device OTP (validates code and clears token)
  fastify.post("/api/auth/device/verify", {
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
          properties: { success: { type: "boolean" } },
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
      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400 as any).send({ error: "Verification failed" });
    }
  });

  // Register auth routes
  await fastify.register(authRoutes);

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
  fastify.get("/api/auth/me", {
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
  fastify.get("/api/debug/env", async (request, reply) => {
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
  fastify.post("/api/auth/login", {
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

  // Verify login OTP endpoint
  fastify.post("/api/auth/verify-login", {
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
  fastify.post("/api/auth/resend-login-otp", {
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

  // Proxy NextAuth.js routes to frontend
  // These routes are handled by NextAuth.js in the frontend, not the backend
  // NextAuth.js routes that need to be proxied:
  const nextAuthRoutes = [
    "/api/auth/error",
    "/api/auth/providers",
    "/api/auth/signin",
    "/api/auth/signout",
    "/api/auth/session",
    "/api/auth/csrf",
  ];

  // Helper function to proxy request to frontend
  const proxyToFrontend = async (request: any, reply: any, path: string) => {
    // Use localhost for same-container communication, not the public URL
    const frontendPort = process.env.FRONTEND_PORT || process.env.PORT || 3000;
    const frontendUrl = `http://localhost:${frontendPort}`;
    const targetUrl = `${frontendUrl}${path}${request.url.includes('?') ? request.url.substring(request.url.indexOf('?')) : ''}`;
    
    try {
      const headers: Record<string, string> = {};
      // Copy relevant headers, excluding connection-specific ones
      for (const [key, value] of Object.entries(request.headers)) {
        if (!['host', 'connection', 'content-length'].includes(key.toLowerCase()) && value) {
          headers[key] = Array.isArray(value) ? value[0] : value;
        }
      }

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' && request.body
          ? JSON.stringify(request.body)
          : undefined,
      });

      const data = await response.text();
      const contentType = response.headers.get('content-type') || 'application/json';
      
      reply.code(response.status as any);
      reply.header('content-type', contentType);
      
      // Copy other relevant headers
      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
          reply.header(key, value);
        }
      });
      
      // Try to parse as JSON, otherwise send as text
      try {
        const jsonData = JSON.parse(data);
        return jsonData;
      } catch {
        return data;
      }
    } catch (error) {
      fastify.log.error({ err: error, url: targetUrl }, "Failed to proxy to frontend");
      return reply.code(502 as any).send({ 
        error: "Bad Gateway",
        message: "Failed to proxy request to frontend"
      });
    }
  };

  // Register NextAuth.js routes that should be proxied to frontend
  for (const route of nextAuthRoutes) {
    fastify.all(route, async (request, reply) => {
      return proxyToFrontend(request, reply, route);
    });
  }

  // Proxy OAuth callback routes (dynamic: /api/auth/callback/[provider])
  fastify.all("/api/auth/callback/:provider", async (request, reply) => {
    const provider = (request.params as any).provider;
    return proxyToFrontend(request, reply, `/api/auth/callback/${provider}`);
  });
}

