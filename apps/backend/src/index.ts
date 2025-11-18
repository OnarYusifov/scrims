// Load environment variables from root .env file (for Dokploy deployment)
// This ensures all apps use the same root .env file
import "@trayb/config/load-env";

// Ensure react-dom/server is available globally for @react-email/render
// This must be imported before any email utilities
// @react-email/render checks for reactDOMServer in various ways, so we need to ensure it's available
import * as reactDOMServer from "react-dom/server";

// Make reactDOMServer available in multiple ways for @react-email/render compatibility
if (typeof globalThis !== "undefined") {
  (globalThis as any).reactDOMServer = reactDOMServer;
  // Also set on global for Node.js compatibility
  if (typeof global !== "undefined") {
    (global as any).reactDOMServer = reactDOMServer;
  }
}

// Ensure the module is available for @react-email/render's internal checks
// @react-email/render uses Object.hasOwn to check for renderToReadableStream
// We need to ensure reactDOMServer is accessible when the module loads

import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import helmet from "@fastify/helmet";
import { Server } from "socket.io";
import { registerRoutes } from "./routes/index.js";

// Helper function to get backend URL from env ports
function getBackendUrl(): string {
  if (process.env.API_URL) return process.env.API_URL;
  if (process.env.NODE_ENV === "production") return "https://api.trayb.az";
  const port = Number(process.env.BACKEND_PORT);
  if (!port) throw new Error("BACKEND_PORT must be set in root .env file");
  return `http://localhost:${port}`;
}

// Helper function to get frontend URL from env ports
function getFrontendUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const port = Number(process.env.FRONTEND_PORT);
  if (!port) throw new Error("FRONTEND_PORT must be set in root .env file");
  return `http://localhost:${port}`;
}

export async function buildServer() {
  const fastify = Fastify({
    logger: true,
    trustProxy: true, // Trust Traefik proxy
  });

  // Register helmet for security headers
	await fastify.register(helmet);

	// Register Swagger (OpenAPI JSON)
	await fastify.register(swagger, {
		mode: "dynamic",
		openapi: {
			info: {
				title: "TRAYB Series API",
				description: "API documentation for the TRAYB Series",
				version: "1.0.0",
			},
			servers: [
				{
					url: getBackendUrl(),
					description: "API server",
				},
			],
		},
	});

	// Register Swagger UI (Docs portal)
  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

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

    // Use BACKEND_PORT from root .env file (required)
    const port = Number(process.env.BACKEND_PORT);
    if (!port) throw new Error("BACKEND_PORT must be set in root .env file");
    const host = process.env.HOST || "0.0.0.0";

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

start();
