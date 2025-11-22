// Load environment variables from root .env file (for Dokploy deployment)
// This ensures all apps use the same root .env file
import "@trayb/config/load-env";

// Validate environment variables at startup
import { validateEnv, getEnv } from "./config/env.js";
validateEnv();

// Ensure react-dom/server is available globally for @react-email/render
// This must be imported before any email utilities
// @react-email/render checks for reactDOMServer in various ways, so we need to ensure it's available
import * as reactDOMServer from "react-dom/server";

// Make reactDOMServer available in multiple ways for @react-email/render compatibility
if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>).reactDOMServer = reactDOMServer;
  // Also set on global for Node.js compatibility
  if (typeof global !== "undefined") {
    (global as Record<string, unknown>).reactDOMServer = reactDOMServer;
  }
}

// Ensure the module is available for @react-email/render's internal checks
// @react-email/render uses Object.hasOwn to check for renderToReadableStream
// We need to ensure reactDOMServer is accessible when the module loads

import Fastify from "fastify";
import helmet from "@fastify/helmet";
import { Server } from "socket.io";
import { registerRoutes } from "./routes/index.js";
import { registerSwagger } from "./swagger.js";
import errorHandlerPlugin from "./plugins/error-handler.js";

// Helper function to get backend URL from env ports
function getBackendUrl(): string {
  const env = getEnv();
  if (env.API_URL) return env.API_URL;
  if (env.NODE_ENV === "production") return "https://api.trayb.az";
  return `http://localhost:${env.BACKEND_PORT}`;
}

// Helper function to get frontend URL from env ports
function getFrontendUrl(): string {
  const env = getEnv();
  if (env.NEXTAUTH_URL) return env.NEXTAUTH_URL;
  if (env.FRONTEND_URL) return env.FRONTEND_URL;
  return `http://localhost:${env.FRONTEND_PORT}`;
}

export async function buildServer() {
  const fastify = Fastify({
    logger: true,
    trustProxy: true, // Trust Traefik proxy
  });

  // Register error handler first (before routes) to catch all errors
  await fastify.register(errorHandlerPlugin);

  // Register helmet for security headers
  await fastify.register(helmet);

  // Register Swagger + Docs using shared config
  await registerSwagger(fastify, { serverUrl: getBackendUrl() });

  // Register all routes
  await registerRoutes(fastify);

  return fastify;
}

async function start() {
  try {
    const fastify = await buildServer();

    // Get the underlying Node.js HTTP server from Fastify
    const httpServer = fastify.server;

    // Initialize Socket.io server on /ws path
    const io = new Server(httpServer, {
      path: "/ws",
      cors: {
        origin: getFrontendUrl(),
        credentials: true,
      },
    });

    // Socket.io connection handler
    io.on("connection", (socket) => {
      console.log("socket connected", socket.id);

      socket.on("disconnect", () => {
        console.log("socket disconnected", socket.id);
      });
    });

    // Use validated environment variables
    const env = getEnv();
    const port = env.BACKEND_PORT;
    const host = env.HOST;

    // Start the server
    await fastify.listen({ port, host });

    console.log(`🚀 Backend server running on http://${host}:${port}`);
    console.log(`📚 API docs available at http://${host}:${port}/docs`);
    console.log(`🔌 Socket.io available on /ws path`);
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  start();
}
