/**
 * Auth routes for Fastify backend
 * Integrates with Auth.js flow:
 * - Registration: Generate OTP → Store in VerificationToken → Send via Resend
 * - Verification: Verify OTP → Mark emailVerified = new Date()
 * - Social login: Handled by Auth.js in frontend, backend just validates
 */

import type { FastifyInstance } from "fastify";
import { prisma } from "@trayb/db";
import bcrypt from "bcryptjs";
import { 
  registerSchema, 
  verifyEmailSchema, 
  resendVerificationSchema,
  forgotPasswordSchema,
  verifyPasswordResetSchema,
  resetPasswordSchema,
} from "@trayb/types";
import { generateOTP, verifyOTP, checkOTP } from "../utils/generateOTP.js";
import { sendOTP } from "../utils/sendOTP.js";
import { sendPasswordResetOTP } from "../utils/sendPasswordResetOTP.js";

export async function authRoutes(fastify: FastifyInstance) {
  // Register endpoint - generates OTP and sends via Resend
  fastify.post("/auth/register", async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: body.email }, { username: body.username }],
        },
      });

      if (existingUser) {
        // If email exists but not verified, send verification email instead
        if (existingUser.email === body.email && !existingUser.emailVerified) {
          // Generate OTP and send verification email
          const { otpCode } = await generateOTP(body.email, 15);
          try {
            await sendOTP({
              email: existingUser.email,
              username: existingUser.username,
              otpCode,
              verificationUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email`,
            });
          } catch (error) {
            fastify.log.error({ err: error }, "Failed to send OTP email");
          }
          return {
            message: "Email already exists but not verified. Verification code sent to your email.",
            requiresVerification: true,
            redirectTo: "/verify-email",
            email: existingUser.email,
          };
        }
        return reply.code(409 as any).send({
          error: existingUser.email === body.email
            ? "Email already exists"
            : "Username already exists",
        });
      }

      // Password is already hashed on the client side, store directly
      // No need to hash again on the server
      const hashedPassword = body.password;

      // Create user (emailVerified = null initially)
      const user = await prisma.user.create({
        data: {
          username: body.username,
          email: body.email,
          password: hashedPassword,
          role: "user",
          emailVerified: null, // Not verified yet
        },
      });

      // Generate OTP and store in VerificationToken
      const { otpCode } = await generateOTP(body.email, 15);

      // Send OTP via Resend with React Email template
      try {
        await sendOTP({
          email: user.email,
          username: user.username,
          otpCode,
          verificationUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email`,
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to send OTP email");
        // Still return success, but log the error
        // In production, you might want to handle this differently
      }

      return {
        message: "Registration successful. Please check your email for the verification code.",
        requiresVerification: true,
        redirectTo: "/verify-email",
        email: user.email,
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400 as any).send({ 
          error: error.message || "Registration failed. Please check your input and try again." 
        });
      }
      return reply.code(400 as any).send({ 
        error: "Registration failed. Please check your input and try again." 
      });
    }
  });

  // Verify email endpoint - verifies OTP and marks email as verified
  fastify.post("/auth/verify-email", async (request, reply) => {
    try {
      const body = verifyEmailSchema.parse(request.body);

      // Verify OTP against VerificationToken table
      const isValid = await verifyOTP(body.email, body.code);

      if (!isValid) {
        return reply.code(400 as any).send({
          error: "Invalid or expired verification code",
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(404 as any).send({
          error: "User not found",
        });
      }

      // Mark email as verified (set emailVerified = new Date())
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
        return reply.code(400 as any).send({ 
          error: error.message || "Email verification failed. Please check the code and try again." 
        });
      }
      return reply.code(400 as any).send({ 
        error: "Email verification failed. Please check the code and try again." 
      });
    }
  });

  // Resend verification email endpoint
  fastify.post("/auth/resend-verification", async (request, reply) => {
    try {
      const body = resendVerificationSchema.parse(request.body);

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        return reply.code(200).send({
          message: "If an account exists with this email, a verification code has been sent.",
        });
      }

      if (user.emailVerified) {
        return reply.code(400 as any).send({
          error: "Email is already verified",
        });
      }

      // Generate new OTP and store in VerificationToken
      const { otpCode } = await generateOTP(body.email, 15);

      // Send OTP via Resend
      try {
        await sendOTP({
          email: user.email,
          username: user.username,
          otpCode,
          verificationUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email`,
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to send OTP email");
        return reply.code(500 as any).send({
          error: "Failed to send verification email",
        });
      }

      return {
        message: "Verification code sent. Please check your inbox.",
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400 as any).send({ 
          error: error.message || "Failed to resend verification code. Please try again." 
        });
      }
      return reply.code(400 as any).send({ 
        error: "Failed to resend verification code. Please try again." 
      });
    }
  });

  // Forgot password endpoint - sends password reset OTP
  fastify.post("/auth/forgot-password", async (request, reply) => {
    try {
      const body = forgotPasswordSchema.parse(request.body);

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        return reply.code(200).send({ 
          message: "If an account exists with this email, a password reset code has been sent." 
        });
      }

      // Generate OTP and store in VerificationToken
      const { otpCode } = await generateOTP(user.email, 15);
      
      // Send password reset OTP via Resend with dedicated template
      try {
        await sendPasswordResetOTP({
          email: user.email,
          username: user.username,
          otpCode,
          resetUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?email=${encodeURIComponent(user.email)}`,
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to send password reset OTP email");
        return reply.code(500 as any).send({ 
          error: "Failed to send password reset code. Please try again." 
        });
      }

      return {
        message: "Password reset code sent to your email. Please check your inbox.",
        redirectTo: "/reset-password",
        email: user.email,
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400 as any).send({ 
          error: error.message || "Failed to send password reset code. Please check your email and try again." 
        });
      }
      return reply.code(400 as any).send({ 
        error: "Failed to send password reset code. Please check your email and try again." 
      });
    }
  });

  // Verify password reset OTP endpoint - uses VerificationToken (doesn't delete token yet)
  fastify.post("/auth/verify-password-reset", async (request, reply) => {
    try {
      const body = verifyPasswordResetSchema.parse(request.body);

      // Use checkOTP instead of verifyOTP - don't delete token yet, only when password is reset
      const isValid = await checkOTP(body.email, body.code);

      if (!isValid) {
        return reply.code(400 as any).send({ 
          error: "Invalid or expired password reset code" 
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(404 as any).send({
          error: "User not found",
        });
      }

      // Code is valid - return success (user can now set new password)
      // Token will be deleted when password is actually reset
      return {
        message: "Password reset code verified. You can now set a new password.",
        verified: true,
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400 as any).send({ 
          error: error.message || "Password reset verification failed. Please check the code and try again." 
        });
      }
      return reply.code(400 as any).send({ 
        error: "Password reset verification failed. Please check the code and try again." 
      });
    }
  });

  // Reset password endpoint - uses VerificationToken, auto-verifies email
  fastify.post("/auth/reset-password", async (request, reply) => {
    try {
      const body = resetPasswordSchema.parse(request.body);

      // Verify OTP against VerificationToken table (this deletes the token)
      const isValid = await verifyOTP(body.email, body.code);

      if (!isValid) {
        return reply.code(400 as any).send({ 
          error: "Invalid or expired password reset code" 
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.code(404 as any).send({
          error: "User not found",
        });
      }

      // Password is already hashed on the client side, store directly
      const hashedPassword = body.password;

      // Update user password and auto-verify email (if not verified)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          emailVerified: user.emailVerified ?? new Date(), // Auto-verify if not verified
        },
      });

      return {
        message: "Password reset successfully. Your email has been verified. You can now log in with your new password.",
      };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof Error) {
        return reply.code(400 as any).send({ 
          error: error.message || "Password reset failed. Please check your code and password, then try again." 
        });
      }
      return reply.code(400 as any).send({ 
        error: "Password reset failed. Please check your code and password, then try again." 
      });
    }
  });
}

