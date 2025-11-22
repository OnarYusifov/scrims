# llm.txt.md

## PROJECT: E-SPORTS LEAGUE PLATFORM (Turbo Monorepo)

### FRONTEND STACK

- Next.js (App Router, SSR + CSR)
- TypeScript
- TailwindCSS
- shadcn/ui
- zustand
- zod
- react-hook-form
- SWR
- tanstack-table (for admin tables)
- auth.js (Google, Discord, Email+Password)
- socket.io-client
- ESLint + Prettier

### BACKEND STACK

- Fastify
- TypeScript
- Zod
- Fastify-zod-openapi or zod-openapi + @fastify/swagger
- jose (JWT)
- bcrypt
- Prisma (Postgres 17)
- socket.io server
- Swagger or Scalar UI for docs (internal only)
- pm2 or node start (runtime)

### MONOREPO TOOLING

- TurboRepo
- Bun (package manager + runtime)
- Prisma as shared package under packages/prisma
- Docker + Dokploy
- Postgres running in isolated docker network
- Before run: prisma migrate deploy
- Build step must not connect to DB (only prisma generate)

---

## REQUIRED PACKAGES (install manually inside respective apps)

### root workspace

bun add -D turbo dotenv typescript

### frontend (apps/web)

bun add next react react-dom
bun add tailwindcss postcss autoprefixer
bun add zustand swr zod react-hook-form @tanstack/react-table socket.io-client
bun add auth.js
bun add @radix-ui/react-\* (shadcn dependencies)
bun add lucide-react
bun add axios
bun add -D @types/node @types/react @types/react-dom eslint prettier

### backend (apps/api)

bun add fastify fastify-cors fastify-helmet fastify-plugin
bun add zod
bun add @fastify/swagger @fastify/swagger-ui
bun add zod-openapi
bun add bcrypt jose
bun add socket.io socket.io-client
bun add @prisma/client
bun add -D prisma typescript ts-node-dev @types/bcrypt @types/node

### shared packages

bun add -w @prisma/client

---

## TURBO MONOREPO STRUCTURE

/repo
├─ turbo.json
├─ .env
├─ apps/
│ ├─ web/ # Next.js + Auth.js + SWR + Sockets
│ └─ api/ # Fastify + Prisma + Sockets
├─ packages/
│ ├─ prisma/ # schema + generate shared client
│ ├─ types/
│ └─ config/
└─ docker/

---

## turbo.json

{
"$schema": "https://turbo.build/schema.json",
"pipeline": {
"build": {
"dependsOn": [],
"outputs": ["dist/**", ".next/**", "build/**"],
"env": ["DATABASE_URL"],
"cache": true
},
"dev": {
"cache": false,
"persistent": true
},
"lint": {},
"generate": {
"outputs": []
}
}
}

---

## FRONTEND EXAMPLE NEXT AUTH CONFIG skeleton

# apps/web/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
providers: [
GoogleProvider({
clientId: process.env.GOOGLE_CLIENT_ID!,
clientSecret: process.env.GOOGLE_CLIENT_SECRET!
}),
DiscordProvider({
clientId: process.env.DISCORD_CLIENT_ID!,
clientSecret: process.env.DISCORD_CLIENT_SECRET!
}),
Credentials({
name: "credentials",
credentials: { email: {}, password: {} },
authorize: async (creds) => {
// call backend fastify login API
}
})
],
pages: {},
session: { strategy: "jwt" }
});

export { handler as GET, handler as POST };

---

## BACKEND FASTIFY BOOTSTRAP

# apps/api/src/server.ts

import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { Server } from "socket.io";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import prisma from "@acme/prisma";

export async function buildServer() {
const fastify = Fastify({ logger: true });

await fastify.register(swagger);
await fastify.register(swaggerUI);

await registerRoutes(fastify);

return fastify;
}

async function start() {
const fastify = await buildServer();
const httpServer = createServer(fastify.server);
const io = new Server(httpServer, { path: "/ws" });

io.on("connection", (socket) => {
console.log("socket connected", socket.id);
});

httpServer.listen({ port: process.env.PORT || 3001 });
}
start();

---

## PRISMA STRUCTURE (packages/prisma)

packages/prisma/schema.prisma
datasource db {
provider = "postgresql"
url = env("DATABASE_URL")
}

generator client {
provider = "prisma-client-js"
}

model User {
id String @id @default(uuid())
email String @unique
password String?
name String?
createdAt DateTime @default(now())
}

# generate command is run only at build

# migrate deploy will run before boot

---

## DOCKERFILE BACKEND (apps/api/Dockerfile)

FROM oven/bun:latest AS base
WORKDIR /app

COPY . .

RUN bun install
RUN bun run prisma generate

CMD ["sh", "-c", "bun run prisma migrate deploy && bun run start"]

---

## DOCKERFILE FRONTEND (apps/web/Dockerfile)

FROM oven/bun:latest AS base
WORKDIR /app

COPY . .

RUN bun install
RUN bun run build

CMD ["bun", "start"]

---

## railpack.json (dokploy)

{
"app": {
"name": "esports-league",
"run": "bun run start",
"build": "bun run build",
"postBuild": "bun run prisma generate"
},
"deploy": {
"postDeploy": "bun run prisma migrate deploy"
},
"network": {
"mode": "bridge",
"waitForDatabase": true
}
}

---

## NOTES FOR DOKPLOY & DATABASE

- backend container must depend on postgres service start
- build **never** runs migrations (no DB required)
- run phase executes: `bun run prisma migrate deploy`
- socket.io path `/ws`
- exposing ports: web:3000, api:3001

---

## NEXT STEPS AVAILABLE

- Generate example admin table UI
- Generate internal API docs portal
- Add event structure for esports match lifecycle
- Add redis pubsub if scaling sockets

END OF llm.txt.md
