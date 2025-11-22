import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { registerAuthModule } from "../modules/auth/routes.js";
import { registerOauthModule } from "../modules/oauth/routes.js";
import { registerSteamModule } from "../modules/steam/routes.js";
import { registerUserModule } from "../modules/user/routes.js";
import { registerSystemModule } from "../modules/system/routes.js";
import { registerAdminPlayersModule } from "../modules/admin/players/routes.js";
import { registerAdminAuditModule } from "../modules/admin/audit/routes.js";
import { registerAdminSettingsModule } from "../modules/admin/settings/routes.js";
import { registerAdminStatsModule } from "../modules/admin/stats/routes.js";

// Helper function to get frontend URL from env ports
function getFrontendUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const port = Number(process.env.FRONTEND_PORT);
  if (!port) throw new Error("FRONTEND_PORT must be set in root .env file");
  return `http://localhost:${port}`;
}

export async function registerRoutes(fastify: FastifyInstance) {
  // Register CORS
  await fastify.register(cors, {
    origin: getFrontendUrl(),
    credentials: true,
  });

  // Register auth routes
  await fastify.register(registerAuthModule);
  await fastify.register(registerOauthModule);
  await fastify.register(registerSteamModule);
  await fastify.register(registerUserModule);

  await fastify.register(registerSystemModule);
  await fastify.register(registerAdminPlayersModule);
  await fastify.register(registerAdminAuditModule);
  await fastify.register(registerAdminSettingsModule);
  await fastify.register(registerAdminStatsModule);
}
