/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at startup using Zod.
 * This ensures the application fails fast with clear error messages
 * if required configuration is missing.
 */

import { z } from "zod";

/**
 * Environment variable schema
 *
 * All required variables must be present for the application to start.
 * Optional variables have defaults or can be undefined.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // JWT Authentication
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Auth.js / NextAuth
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL").optional(),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters")
    .optional(),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .optional(),

  // Frontend URL
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").optional(),
  FRONTEND_PORT: z.coerce.number().int().positive().default(3000),

  // Backend Configuration
  BACKEND_PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // API URLs
  API_URL: z.string().url("API_URL must be a valid URL").optional(),

  // Redis (optional)
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),

  // Email Configuration (optional)
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Discord Bot Tokens (optional)
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_RECORDER_BOT_1_TOKEN: z.string().optional(),
  DISCORD_RECORDER_BOT_2_TOKEN: z.string().optional(),
  DISCORD_SERVER_ID: z.string().optional(),
  DISCORD_LOBBY_CHANNEL_ID: z.string().optional(),

  // External APIs (optional)
  RANDOM_ORG_API_KEY: z.string().optional(),
  GRID_API_KEY: z.string().optional(),
  STEAM_API_KEY: z.string().optional(),
});

/**
 * Validated environment variables
 *
 * Access this instead of process.env directly to ensure type safety
 * and that all required variables are present.
 */
export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

/**
 * Validates and returns environment variables
 *
 * @throws {z.ZodError} If validation fails
 * @returns Validated environment configuration
 */
export function getEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors
        .filter((e) => e.code === "invalid_type" && e.received === "undefined")
        .map((e) => e.path.join("."));

      const invalid = error.errors
        .filter((e) => e.code !== "invalid_type" || e.received !== "undefined")
        .map((e) => `${e.path.join(".")}: ${e.message}`);

      const messages: string[] = [];

      if (missing.length > 0) {
        messages.push(
          `Missing required environment variables:\n  - ${missing.join("\n  - ")}`
        );
      }

      if (invalid.length > 0) {
        messages.push(
          `Invalid environment variables:\n  - ${invalid.join("\n  - ")}`
        );
      }

      throw new Error(
        `Environment validation failed:\n\n${messages.join("\n\n")}`
      );
    }
    throw error;
  }
}

/**
 * Validates environment variables at module load time
 *
 * This should be called early in the application startup process,
 * ideally right after loading the .env file.
 */
export function validateEnv(): void {
  getEnv();
}
