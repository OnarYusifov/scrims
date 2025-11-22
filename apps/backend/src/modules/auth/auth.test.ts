import {
  describe,
  it,
  beforeAll,
  afterAll,
  afterEach,
  expect,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestServer, closeTestServer } from "../../tests/test-server.js";

describe("Auth routes", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  it("returns dummy salt when user is not found", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/auth/get-password-salt",
      payload: { email: "missing@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      salt: "$2a$10$dummySaltForSecurity123",
    });
  });

  it("rejects invalid registration payloads", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "user@example.com",
        username: "us",
        password: "Password1",
        confirmPassword: "different",
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as { error?: string };
    expect(body.error).toBeDefined();
  });
});
