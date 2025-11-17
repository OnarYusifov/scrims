FROM oven/bun:alpine AS base
WORKDIR /app

# Copy package files for better layer caching
COPY package.json bun.lock* ./
COPY turbo.json tsconfig*.json ./
COPY apps/*/package.json ./apps/*/
COPY packages/*/package.json ./packages/*/

# Install dependencies (install all workspace dependencies)
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Generate Prisma client (Prisma is in packages/db)
RUN cd packages/db && bun run db:generate

# Build both frontend and backend using turbo
RUN bunx turbo run build --filter=@trayb/backend --filter=@trayb/frontend

# Expose ports (backend: 3001, frontend: 3000)
EXPOSE 3000 3001

