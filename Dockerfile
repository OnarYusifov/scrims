FROM oven/bun:alpine AS base
WORKDIR /app

# Copy package files for better layer caching
COPY package.json bun.lock* ./
COPY turbo.json tsconfig*.json ./

# Copy workspace packages (needed for bun to resolve workspace dependencies)
COPY packages ./packages
COPY apps/*/package.json ./apps/*/

# Install dependencies (install all workspace dependencies)
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Generate Prisma client (Prisma is in packages/db)
RUN cd packages/db && bun run db:generate

# Build everything using turbo (frontend, backend, bots, and all packages)
RUN bunx turbo run build

# Default command: runs migrations automatically, then starts both frontend and backend
CMD sh -c "if [ -n \"$DATABASE_URL\" ]; then echo 'Running database migrations...' && cd packages/db && bunx prisma migrate deploy || echo 'Migration failed or no migrations to run'; cd /app; fi && echo 'Starting backend and frontend...' && bun run --cwd apps/backend start & bun run --cwd apps/frontend start & wait"

