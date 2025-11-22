/**
 * Base HTTP error class for consistent error handling across the application.
 * All HTTP errors should extend this class to ensure consistent formatting.
 */
export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code ?? this.getDefaultCode(statusCode);
    this.details = details;
  }

  /**
   * Get default error code based on HTTP status code
   */
  private getDefaultCode(statusCode: number): string {
    const codeMap: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      500: "INTERNAL_SERVER_ERROR",
    };
    return codeMap[statusCode] ?? "HTTP_ERROR";
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Helper function to create HTTP errors with consistent formatting
 */
export function createHttpError(
  statusCode: number,
  message: string,
  code?: string,
  details?: unknown
): HttpError {
  return new HttpError(statusCode, message, code, details);
}

/**
 * Common HTTP error factories for frequently used errors
 */
export const HttpErrors = {
  badRequest: (message: string, details?: unknown) =>
    createHttpError(400, message, "BAD_REQUEST", details),
  unauthorized: (message: string = "Unauthorized", details?: unknown) =>
    createHttpError(401, message, "UNAUTHORIZED", details),
  forbidden: (message: string = "Forbidden", details?: unknown) =>
    createHttpError(403, message, "FORBIDDEN", details),
  notFound: (message: string, details?: unknown) =>
    createHttpError(404, message, "NOT_FOUND", details),
  conflict: (message: string, details?: unknown) =>
    createHttpError(409, message, "CONFLICT", details),
  unprocessableEntity: (message: string, details?: unknown) =>
    createHttpError(422, message, "UNPROCESSABLE_ENTITY", details),
  internalServerError: (
    message: string = "Internal server error",
    details?: unknown
  ) => createHttpError(500, message, "INTERNAL_SERVER_ERROR", details),
};
