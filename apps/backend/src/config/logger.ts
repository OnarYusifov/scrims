/**
 * Centralized Logging Configuration
 *
 * Uses Pino for structured logging with child loggers per module.
 * This ensures consistent logging across the application and makes
 * it easy to filter logs by module.
 */

import pino from "pino";
import type { Logger } from "pino";

/**
 * Root logger instance
 *
 * Configured based on environment:
 * - Development: Pretty printing enabled
 * - Production: JSON output for log aggregation
 */
const rootLogger = pino({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
});

/**
 * Creates a child logger for a specific module
 *
 * Child loggers automatically include the module name in all log entries,
 * making it easy to filter and search logs.
 *
 * @param module - Module name (e.g., "admin.players", "auth")
 * @returns Child logger instance
 *
 * @example
 * ```typescript
 * const log = createLogger("admin.players");
 * log.info({ userId: "123" }, "Player updated");
 * // Output: [admin.players] Player updated { userId: "123" }
 * ```
 */
export function createLogger(module: string): Logger {
  return rootLogger.child({ module });
}

/**
 * Default logger for general application logging
 */
export const log = rootLogger;
