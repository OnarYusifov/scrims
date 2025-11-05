# TRAYB CUSTOMS

Modern esports-inspired Valorant customs and stats platform for closed-group competitions.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Dokploy deployment instructions.

## 📁 Project Structure

```
trayb-customs/
├── apps/
│   ├── frontend/     # Next.js frontend
│   └── backend/      # Fastify backend
├── prisma/           # Database schema
└── docker-compose.yml
```

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, React, TypeScript, TailwindCSS, Framer Motion
- **Backend:** Fastify, TypeScript, Prisma, PostgreSQL, Redis
- **Auth:** Discord OAuth
- **Deployment:** Dokploy, Docker, Cloudflare

## 📚 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide

## 🔐 Environment Variables

See `.env.example` files in each app directory for required variables.
