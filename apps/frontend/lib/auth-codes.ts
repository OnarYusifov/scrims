/**
 * Authentication error codes and their user-friendly descriptions
 */
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  MISSING_CREDENTIALS: "MISSING_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  AUTH_ERROR: "AUTH_ERROR",
  TOKEN_MISSING: "TOKEN_MISSING",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  PASSWORD_MISMATCH: "PASSWORD_MISMATCH",
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/**
 * User-friendly error messages for each error code
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: "Invalid email or password. Please check your credentials and try again.",
  [AUTH_ERROR_CODES.MISSING_CREDENTIALS]: "Email and password are required to sign in.",
  [AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED]: "Email not verified. Please check your email for the verification code and verify your account before logging in.",
  [AUTH_ERROR_CODES.AUTH_ERROR]: "Authentication failed. Please try again.",
  [AUTH_ERROR_CODES.TOKEN_MISSING]: "Authentication token is missing. Please sign in again.",
  [AUTH_ERROR_CODES.USER_NOT_FOUND]: "No account found with this email address.",
  [AUTH_ERROR_CODES.PASSWORD_MISMATCH]: "Invalid password. Please check your password and try again.",
};

/**
 * Get user-friendly error message from error code
 */
export function getAuthErrorMessage(code: AuthErrorCode | null | undefined): string {
  if (!code) {
    return "An unexpected error occurred. Please try again.";
  }
  return AUTH_ERROR_MESSAGES[code] || "An unexpected error occurred. Please try again.";
}


