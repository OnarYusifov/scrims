import fp from "fastify-plugin";
import { jwtVerify } from "jose";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { HttpError, HttpErrors } from "../errors/http-error.js";

export type AdminRole = "organizer" | "admin" | "moderator";

export interface AdminJwtPayload {
  userId: string;
  email: string;
  role: AdminRole;
  [key: string]: unknown;
}

export interface AdminAuthPluginOptions {
  roles?: AdminRole[];
}

export type AdminFastifyRequest = FastifyRequest & {
  admin?: AdminJwtPayload;
};

export const DEFAULT_ADMIN_ROLES: AdminRole[] = [
  "organizer",
  "admin",
  "moderator",
];

declare module "fastify" {
  interface FastifyRequest {
    admin?: AdminJwtPayload;
  }
}

const adminAuthPlugin: FastifyPluginAsync<AdminAuthPluginOptions> = async (
  fastify,
  options
) => {
  const allowedRoles = new Set(options?.roles ?? DEFAULT_ADMIN_ROLES);
  const secret = getJwtSecret();

  fastify.decorateRequest("admin", null);

  fastify.addHook("preHandler", async (request, _reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw HttpErrors.unauthorized("Unauthorized");
    }

    try {
      const token = authHeader.substring(7);
      const { payload } = await jwtVerify(token, secret);
      const role = payload.role as AdminRole | undefined;
      if (!role || !allowedRoles.has(role)) {
        throw HttpErrors.forbidden("Forbidden");
      }
      request.admin = payload as AdminJwtPayload;
    } catch (error) {
      // If it's already an HttpError, rethrow it
      if (error instanceof HttpError) {
        throw error;
      }
      throw HttpErrors.unauthorized("Unauthorized");
    }
  });
};

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
}

export default fp(adminAuthPlugin, {
  name: "admin-auth-plugin",
});
