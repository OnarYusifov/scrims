/**
 * Centralized configuration for frontend application
 * Uses environment variables with sensible fallbacks
 */

export const config = {
    /**
     * Backend API base URL
     * Used for all API calls to the backend server
     */
    backendUrl:
        process.env.BACKEND_URL ||
        process.env.API_URL ||
        `http://localhost:${process.env.BACKEND_PORT || 3001}`,

    /**
     * Frontend URL
     * Used for callbacks, redirects, and CORS configuration
     */
    frontendUrl:
        process.env.FRONTEND_URL ||
        process.env.NEXTAUTH_URL ||
        `http://localhost:${process.env.FRONTEND_PORT || 3000}`,
} as const;
