import { handlers } from "@/auth";

// Export all NextAuth.js handlers
// This handles all routes under /api/auth/*
// - /api/auth/signin
// - /api/auth/signout
// - /api/auth/callback/[provider]
// - /api/auth/providers
// - /api/auth/session
// - /api/auth/csrf
// - /api/auth/error
export const { GET, POST } = handlers;









