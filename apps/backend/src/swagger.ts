import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

interface RegisterSwaggerOptions {
  serverUrl: string;
}

/**
 * Registers Swagger JSON and UI using a shared configuration.
 * Ensures every Fastify instance exposes the same OpenAPI metadata.
 */
export async function registerSwagger(
  fastify: FastifyInstance,
  options: RegisterSwaggerOptions
) {
  const { serverUrl } = options;

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
          url: serverUrl,
          description: "API server",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });
}
