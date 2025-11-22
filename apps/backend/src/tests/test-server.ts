import type { FastifyInstance } from "fastify";
import { buildServer } from "../index.js";

let testServer: FastifyInstance | null = null;

/**
 * Creates (or reuses) a Fastify instance for integration tests without listening on a TCP port.
 */
export async function createTestServer(): Promise<FastifyInstance> {
  if (!testServer) {
    testServer = await buildServer();
    await testServer.ready();
  }
  return testServer;
}

export async function closeTestServer() {
  if (testServer) {
    await testServer.close();
    testServer = null;
  }
}
