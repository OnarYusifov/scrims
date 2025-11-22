import type { FastifyInstance } from "fastify";
import { prisma } from "@trayb/db";
import {
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  verifyPasswordResetSchema,
  resetPasswordSchema,
  loginSchema,
  verifyLoginSchema,
} from "@trayb/types";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { randomInt } from "crypto";
import { z } from "zod";
import { generateOTP, verifyOTP, checkOTP } from "../../utils/generateOTP.js";
import { sendOTP } from "../../utils/sendOTP.js";
import { sendPasswordResetOTP } from "../../utils/sendPasswordResetOTP.js";
import { sendLoginOTP } from "../../utils/email.js";

function getFrontendUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const port = Number(process.env.FRONTEND_PORT);
  if (!port) throw new Error("FRONTEND_PORT must be set in root .env file");
  return `http://localhost:${port}`;
}

const deviceStartSchema = z.object({
  email: z.string().email(),
  deviceId: z.string().min(1),
  fingerprint: z.record(z.string(), z.unknown()).optional(),
});

const deviceVerifySchema = z.object({
  email: z.string().email(),
  deviceId: z.string().min(1),
  code: z.string().length(6),
});

const verifyCredentialsSchema = loginSchema.extend({
  deviceId: z.string().optional(),
  trustedDeviceToken: z.string().optional(),
});

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
}

type TrustedDevicePayload = {
  email?: string;
  deviceId?: string;
  expMs?: number;
};

export async function registerAuthModule(fastify: FastifyInstance) {
  fastify.post("/auth/device/start", async (request, reply) => {
    try {
      const { email, deviceId } = deviceStartSchema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply
          .code(200)
          .send({ message: "If the account exists, a code was sent." });
      }

      const code = `${randomInt(100000, 999999)}`;
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
      return reply
        .code(400)
        .send({ error: "Failed to start device verification" });
    }
  });

  fastify.post("/auth/device/verify", async (request, reply) => {
    try {
      const { email, deviceId, code } = deviceVerifySchema.parse(request.body);
      const identifier = `${email}|${deviceId}`;
      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { identifier, token: code, expires: { gt: new Date() } },
      });

      if (!tokenRecord) {
        return reply.code(400).send({ error: "Invalid or expired code" });
      }

      await prisma.verificationToken.deleteMany({ where: { identifier } });

      const secret = getJwtSecret();
      const expMs = Date.now() + 14 * 24 * 60 * 60 * 1000;
      const token = await new SignJWT({ email, deviceId, expMs })
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

      return { success: true, token };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ error: "Verification failed" });
    }
  });

  fastify.post("/auth/login", async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user || !user.password) {
        return reply.code(401).send({ error: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(
        body.password,
        user.password
      );
      if (!isValidPassword) {
        return reply.code(401).send({ error: "Invalid email or password" });
      }

      if (!user.emailVerified) {
        return reply.code(403).send({
          error:
            "Email not verified. Please check your email for the verification link.",
          requiresVerification: true,
        });
      }

      const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
      const loginCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginCode,
          loginCodeExpiry,
        },
      });

      try {
        await sendLoginOTP({
          email: user.email,
          username: user.username,
          loginCode,
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to send login OTP email");
        return reply.code(500).send({
          error: "Failed to send login verification code. Please try again.",
        });
      }

      return {
        message:
          "Login verification code sent to your email. Please check your inbox.",
        requiresOTP: true,
        redirectTo: "/verify-email",
        email: user.email,
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400).send({
          error:
            error.message ||
            "Login failed. Please check your credentials and try again.",
        });
      }
      return reply.code(400).send({
        error: "Login failed. Please check your credentials and try again.",
      });
    }
  });

  fastify.post("/auth/verify-credentials", async (request, reply) => {
    try {
      const body = verifyCredentialsSchema.parse(request.body);

      if (body.deviceId) {
        if (!body.trustedDeviceToken) {
          return reply.code(403).send({
            error: "Device not trusted",
            requiresDeviceVerification: true,
          });
        }

        try {
          const secret = getJwtSecret();
          const { payload } = await jwtVerify(body.trustedDeviceToken, secret);

          const devicePayload = payload as TrustedDevicePayload;
          const valid =
            devicePayload.email === body.email &&
            devicePayload.deviceId === body.deviceId &&
            typeof devicePayload.expMs === "number" &&
            devicePayload.expMs > Date.now();

          if (!valid) {
            throw new Error("Invalid device token");
          }
        } catch {
          return reply.code(403).send({
            error: "Device not trusted",
            requiresDeviceVerification: true,
          });
        }
      }

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user || !user.password) {
        fastify.log.warn(
          `[Auth] Login failed: User not found or missing password for email ${body.email}`
        );
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(
        body.password,
        user.password
      );
      if (!isValidPassword) {
        fastify.log.warn(
          `[Auth] Login failed: Invalid password for user ${body.email}`
        );
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      if (!user.emailVerified) {
        fastify.log.warn(
          `[Auth] Login failed: Email not verified for user ${body.email}`
        );
        return reply.code(401).send({ error: "Email not verified" });
      }

      const secret = getJwtSecret();
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

  fastify.post("/auth/verify-login", async (request, reply) => {
    try {
      const body = verifyLoginSchema.parse(request.body);

      const user = await prisma.user.findFirst({
        where: {
          email: body.email,
          loginCode: body.code,
          loginCodeExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        return reply.code(400).send({
          error: "Invalid or expired login code",
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginCode: null,
          loginCodeExpiry: null,
        },
      });

      const secret = getJwtSecret();
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
        return reply.code(400).send({
          error:
            error.message ||
            "Login verification failed. Please check the code and try again.",
        });
      }
      return reply.code(400).send({
        error:
          "Login verification failed. Please check the code and try again.",
      });
    }
  });

  fastify.post("/auth/resend-login-otp", async (request, reply) => {
    try {
      const body = resendVerificationSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(200).send({
          message:
            "If an account exists with this email, a login code has been sent.",
        });
      }

      if (!user.emailVerified) {
        return reply.code(400).send({
          error: "Email is not verified. Please verify your email first.",
        });
      }

      const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
      const loginCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginCode,
          loginCodeExpiry,
        },
      });

      try {
        await sendLoginOTP({
          email: user.email,
          username: user.username,
          loginCode,
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to send login OTP email");
        return reply.code(500).send({
          error: "Failed to send login code",
        });
      }

      return {
        message: "Login code sent. Please check your inbox.",
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400).send({
          error:
            error.message || "Failed to resend login code. Please try again.",
        });
      }
      return reply.code(400).send({
        error: "Failed to resend login code. Please try again.",
      });
    }
  });

  fastify.get("/auth/me", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ authenticated: false, verified: false });
      }

      const token = authHeader.substring(7);
      const secret = getJwtSecret();

      let decoded;
      try {
        decoded = await jwtVerify(token, secret);
      } catch {
        return reply.code(401).send({ authenticated: false, verified: false });
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
        return reply.code(401).send({ authenticated: false, verified: false });
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
      return reply.code(401).send({ authenticated: false, verified: false });
    }
  });

  // Register endpoint - generates OTP and sends via Resend
  fastify.post("/auth/register", async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: body.email }, { username: body.username }],
        },
      });

      if (existingUser) {
        if (existingUser.email === body.email && !existingUser.emailVerified) {
          const { otpCode } = await generateOTP(body.email, 15);
          try {
            await sendOTP({
              email: existingUser.email,
              username: existingUser.username,
              otpCode,
              verificationUrl: `${getFrontendUrl()}/verify-email`,
            });
          } catch (error) {
            fastify.log.error({ err: error }, "Failed to send OTP email");
          }
          return {
            message:
              "Email already exists but not verified. Verification code sent to your email.",
            requiresVerification: true,
            redirectTo: "/verify-email",
            email: existingUser.email,
          };
        }
        return reply.code(409).send({
          error:
            existingUser.email === body.email
              ? "Email already exists"
              : "Username already exists",
        });
      }

      const hashedPassword = body.password;

      const user = await prisma.user.create({
        data: {
          username: body.username,
          email: body.email,
          password: hashedPassword,
          role: "user",
          emailVerified: null,
        },
      });

      const { otpCode } = await generateOTP(body.email, 15);

      try {
        await sendOTP({
          email: user.email,
          username: user.username,
          otpCode,
          verificationUrl: `${getFrontendUrl()}/verify-email`,
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to send OTP email");
      }

      return {
        message:
          "Registration successful. Please check your email for the verification code.",
        requiresVerification: true,
        redirectTo: "/verify-email",
        email: user.email,
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400).send({
          error:
            error.message ||
            "Registration failed. Please check your input and try again.",
        });
      }
      return reply.code(400).send({
        error: "Registration failed. Please check your input and try again.",
      });
    }
  });

  // Verify email endpoint - verifies OTP and marks email as verified
  fastify.post("/auth/verify-email", async (request, reply) => {
    try {
      const body = verifyEmailSchema.parse(request.body);

      const isValid = await verifyOTP(body.email, body.code);

      if (!isValid) {
        return reply.code(400).send({
          error: "Invalid or expired verification code",
        });
      }

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(404).send({
          error: "User not found",
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
        },
      });

      return {
        message: "Email verified successfully.",
        verified: true,
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400).send({
          error:
            error.message ||
            "Email verification failed. Please check the code and try again.",
        });
      }
      return reply.code(400).send({
        error:
          "Email verification failed. Please check the code and try again.",
      });
    }
  });

  fastify.post("/auth/resend-verification", async (request, reply) => {
    try {
      const body = resendVerificationSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(200).send({
          message:
            "If an account exists with this email, a verification code has been sent.",
        });
      }

      if (user.emailVerified) {
        return reply.code(400).send({
          error: "Email is already verified",
        });
      }

      const { otpCode } = await generateOTP(body.email, 15);

      try {
        await sendOTP({
          email: user.email,
          username: user.username,
          otpCode,
          verificationUrl: `${getFrontendUrl()}/verify-email`,
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to send OTP email");
        return reply.code(500).send({
          error: "Failed to send verification email",
        });
      }

      return {
        message: "Verification code sent. Please check your inbox.",
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400).send({
          error:
            error.message ||
            "Failed to resend verification code. Please try again.",
        });
      }
      return reply.code(400).send({
        error: "Failed to resend verification code. Please try again.",
      });
    }
  });

  fastify.post("/auth/forgot-password", async (request, reply) => {
    try {
      const body = forgotPasswordSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(200).send({
          message:
            "If an account exists with this email, a password reset code has been sent.",
        });
      }

      const { otpCode } = await generateOTP(user.email, 15);

      try {
        await sendPasswordResetOTP({
          email: user.email,
          username: user.username,
          otpCode,
          resetUrl: `${getFrontendUrl()}/reset-password?email=${encodeURIComponent(
            user.email
          )}`,
        });
      } catch (error) {
        fastify.log.error(
          { err: error },
          "Failed to send password reset OTP email"
        );
        return reply.code(500).send({
          error: "Failed to send password reset code. Please try again.",
        });
      }

      return {
        message:
          "Password reset code sent to your email. Please check your inbox.",
        redirectTo: "/reset-password",
        email: user.email,
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400).send({
          error:
            error.message ||
            "Failed to send password reset code. Please check your email and try again.",
        });
      }
      return reply.code(400).send({
        error:
          "Failed to send password reset code. Please check your email and try again.",
      });
    }
  });

  fastify.post("/auth/verify-password-reset", async (request, reply) => {
    try {
      const body = verifyPasswordResetSchema.parse(request.body);

      const isValid = await checkOTP(body.email, body.code);

      if (!isValid) {
        return reply.code(400).send({
          error: "Invalid or expired password reset code",
        });
      }

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(404).send({
          error: "User not found",
        });
      }

      return {
        message:
          "Password reset code verified. You can now set a new password.",
        verified: true,
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400).send({
          error:
            error.message ||
            "Password reset verification failed. Please check the code and try again.",
        });
      }
      return reply.code(400).send({
        error:
          "Password reset verification failed. Please check the code and try again.",
      });
    }
  });

  fastify.post("/auth/reset-password", async (request, reply) => {
    try {
      const body = resetPasswordSchema.parse(request.body);

      const isValid = await verifyOTP(body.email, body.code);

      if (!isValid) {
        return reply.code(400).send({
          error: "Invalid or expired password reset code",
        });
      }

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(404).send({
          error: "User not found",
        });
      }

      const hashedPassword = body.password;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          emailVerified: user.emailVerified ?? new Date(),
        },
      });

      return {
        message:
          "Password reset successfully. Your email has been verified. You can now log in with your new password.",
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400).send({
          error:
            error.message ||
            "Password reset failed. Please check your code and password, then try again.",
        });
      }
      return reply.code(400).send({
        error:
          "Password reset failed. Please check your code and password, then try again.",
      });
    }
  });

  fastify.post(
    "/auth/get-password-salt",
    {
      schema: {
        tags: ["auth"],
        summary: "Get password salt for a user",
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
              salt: { type: "string" },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { email } = request.body as { email: string };

        const user = await prisma.user.findUnique({
          where: { email },
          select: { password: true },
        });

        if (!user || !user.password) {
          return { salt: "$2a$10$dummySaltForSecurity123" };
        }

        const salt = user.password.substring(0, 29);

        if (!salt.startsWith("$2")) {
          return { salt: "$2a$10$dummySaltForSecurity123" };
        }

        return { salt };
      } catch (error) {
        fastify.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to retrieve password salt" });
      }
    }
  );
}
