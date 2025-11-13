import Fastify from "fastify";
import cors from "@fastify/cors";
import { prisma } from "@trayb/db";
import { loginSchema, registerSchema } from "@trayb/types";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const fastify = Fastify({
  logger: true,
  trustProxy: true, // Trust Traefik proxy
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
  credentials: true,
});

// Health check
fastify.get("/health", async () => {
  return { status: "ok" };
});

// Login endpoint
fastify.post("/api/auth/login", async (request, reply) => {
  try {
    const body = loginSchema.parse(request.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(body.password, user.password);
    if (!isValidPassword) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(400).send({ error: "Invalid request" });
  }
});

// Register endpoint
fastify.post("/api/auth/register", async (request, reply) => {
  try {
    const body = registerSchema.parse(request.body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }],
      },
    });

    if (existingUser) {
      return reply.code(409).send({
        error: existingUser.email === body.email
          ? "Email already exists"
          : "Username already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: body.username,
        email: body.email,
        password: hashedPassword,
        role: "user",
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(400).send({ error: "Invalid request" });
  }
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || "0.0.0.0";
    
    await fastify.listen({ port, host });
    console.log(`🚀 Backend server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
