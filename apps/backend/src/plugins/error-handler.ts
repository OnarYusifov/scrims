import fp from "fastify-plugin";
import type {
  FastifyError,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import { HttpError } from "../errors/http-error.js";

/**
 * Centralized error handler plugin for Fastify.
 * Formats all errors consistently and handles:
 * - HttpError instances (custom HTTP errors)
 * - ZodError instances (validation errors)
 * - FastifyError instances (Fastify-specific errors)
 * - Generic Error instances (fallback)
 */
const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler(
    async (
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      // Log the error for debugging
      fastify.log.error(
        {
          err: error,
          url: request.url,
          method: request.method,
          statusCode: error.statusCode,
        },
        "Request error"
      );

      // Handle HttpError instances (our custom errors)
      // Check if error has 'code' property (indicates HttpError structure)
      if (
        "code" in error &&
        typeof error.code === "string" &&
        error.statusCode
      ) {
        const errorResponse: Record<string, unknown> = {
          error: error.message || "An error occurred",
          code: error.code,
        };
        if ("details" in error && error.details !== undefined) {
          errorResponse.details = error.details;
        }
        return reply.code(error.statusCode).send(errorResponse);
      }

      // Handle HttpError instances (fallback for instanceof check)
      if (error instanceof HttpError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return reply.code(400).send({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details,
        });
      }

      // Handle Fastify validation errors (from schema validation)
      if (error.validation) {
        return reply.code(400).send({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.validation,
        });
      }

      // Handle Fastify errors with status codes
      if (error.statusCode) {
        return reply.code(error.statusCode).send({
          error: error.message || "An error occurred",
          code: error.code || "HTTP_ERROR",
        });
      }

      // Fallback for unexpected errors
      fastify.log.error({ err: error }, "Unexpected error");
      return reply.code(500).send({
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : error.message || "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  );
};

export default fp(errorHandlerPlugin, {
  name: "error-handler",
});
