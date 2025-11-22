/**
 * Authentication error codes and their user-friendly descriptions
 */
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  MISSING_CREDENTIALS: "MISSING_CREDENTIALS",
  AUTH_ERROR: "AUTH_ERROR",
  TOKEN_MISSING: "TOKEN_MISSING",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/**
 * User-friendly error messages for each error code
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]:
    "Invalid username or password. Please check your credentials and try again.",
  [AUTH_ERROR_CODES.MISSING_CREDENTIALS]:
    "Username and password are required to sign in.",
  [AUTH_ERROR_CODES.AUTH_ERROR]: "Authentication failed. Please try again.",
  [AUTH_ERROR_CODES.TOKEN_MISSING]:
    "Authentication token is missing. Please sign in again.",
};

/**
 * Get user-friendly error message from error code
 */
export function getAuthErrorMessage(
  code: AuthErrorCode | null | undefined
): string {
  if (!code) {
    return "An unexpected error occurred. Please try again.";
  }
  return (
    AUTH_ERROR_MESSAGES[code] ||
    "An unexpected error occurred. Please try again."
  );
}
