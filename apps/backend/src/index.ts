// Load environment variables from root .env file (for Dokploy deployment)
// This ensures all apps use the same root .env file
import "@trayb/config/load-env";

import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import helmet from "@fastify/helmet";
import { Server } from "socket.io";
import { registerRoutes } from "./routes/index.js";

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
					url: process.env.API_URL || "http://localhost:3001",
					description: "Development server",
				},
			],
		},
		exposeRoute: true,
		routePrefix: "/api/docs/json",
	});

	// Register Swagger UI (Docs portal)
  await fastify.register(swaggerUI, {
    routePrefix: "/api/docs",
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
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
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

    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || "0.0.0.0";

    // Start the server
    await fastify.listen({ port, host });

    console.log(`🚀 Backend server running on http://${host}:${port}`);
    console.log(`📚 API docs available at http://${host}:${port}/api/docs`);
    console.log(`🔌 Socket.io available on /ws path`);
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

start();
