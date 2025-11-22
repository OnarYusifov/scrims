import type { FastifyInstance } from "fastify";

function getFrontendUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  return "NOT SET";
}

export async function registerSystemModule(fastify: FastifyInstance) {
  fastify.get("/health", async () => ({ status: "ok" }));

  fastify.get("/debug/env", async () => ({
    smtpConfigured: {
      host: process.env.SMTP_HOST || "NOT SET",
      port: process.env.SMTP_PORT || "NOT SET",
      secure: process.env.SMTP_SECURE || "NOT SET",
      user: process.env.SMTP_USER || "NOT SET",
      password: process.env.SMTP_PASSWORD ? "***SET***" : "NOT SET",
      from: process.env.SMTP_FROM || "NOT SET",
    },
    frontendUrl: getFrontendUrl(),
    port: process.env.PORT || "3001 (default)",
    host: process.env.HOST || "0.0.0.0 (default)",
  }));
}
