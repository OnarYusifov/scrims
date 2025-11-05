# WSL Setup Guide for TRAYB Customs

## Option 1: Move Project to WSL (Recommended)

### Step 1: Copy Project to WSL

Open a PowerShell/Command Prompt and run:

```bash
# This copies your project from Windows to WSL home directory
wsl
cd ~
cp -r /mnt/c/Users/Onarbay/Documents/"trayb leaderboard" ~/trayb-customs
cd ~/trayb-customs
pwd
# Should show: /home/yourusername/trayb-customs
```

### Step 2: Open Cursor in WSL

In Cursor:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. Type: "WSL: Reopen Folder in WSL"
3. Or manually: `Ctrl+K Ctrl+O` and select `\\wsl$\Ubuntu\home\yourusername\trayb-customs`

**OR** from WSL terminal:
```bash
cd ~/trayb-customs
cursor .
# If cursor command not available, use: code .
```

### Step 3: Fix Docker Permissions in WSL

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or restart WSL)
newgrp docker

# Test Docker (should work without sudo now)
docker ps
docker --version
```

If Docker isn't installed in WSL:
```bash
# Install Docker in WSL
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker service
sudo service docker start

# Enable on WSL startup (add to ~/.bashrc)
echo "sudo service docker start" >> ~/.bashrc
```

---

## Option 2: Keep Project in Windows, Use WSL for Docker Only

If you want to keep working in Windows filesystem:

### Configure Docker Desktop

1. Open Docker Desktop
2. Go to Settings → Resources → WSL Integration
3. Enable integration with your WSL distro (Ubuntu, etc.)
4. Restart Docker Desktop

Then you can use Docker commands from Windows:
```powershell
docker ps
docker-compose up -d
```

**Note:** This works but is slower than Option 1.

---

## Full Setup in WSL (After Moving Project)

### 1. Check Docker is Working

```bash
# In WSL terminal
docker --version
docker ps
docker-compose --version
```

### 2. Stop Any Running Containers

```bash
cd ~/trayb-customs

# List all running containers
docker ps

# Stop all containers
docker-compose down

# Or stop specific containers
docker stop $(docker ps -q)

# Remove all containers (fresh start)
docker-compose down -v
```

### 3. Install Node.js in WSL (if not installed)

```bash
# Install Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verify
node --version  # Should show v18.x.x
npm --version
```

### 4. Install Project Dependencies

```bash
cd ~/trayb-customs

# Install root dependencies
npm install

# Install backend dependencies
cd apps/backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install

cd ../..
```

### 5. Create .env File

```bash
cd ~/trayb-customs

# Create .env file
nano .env
# Or use: vim .env
# Or use: code .env (opens in VS Code/Cursor)
```

Paste this configuration:

```env
# Database
DATABASE_URL="postgresql://trayb:password@localhost:5432/trayb_customs?schema=public"
REDIS_URL="redis://localhost:6379"

# Backend
PORT=3001
HOST="0.0.0.0"
NODE_ENV="development"

# JWT & Sessions
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"
JWT_EXPIRATION="7d"

# Discord OAuth (get from Discord Developer Portal)
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_CALLBACK_URL="http://localhost:3001/auth/discord/callback"
DISCORD_WHITELISTED_IDS="your-discord-user-id"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Elo System
ELO_START_RATING=800
ELO_CALIBRATION_MATCHES=10
ELO_CALIBRATION_K_FACTOR=48
ELO_NORMAL_K_FACTOR=32
ELO_HIGH_ELO_K_FACTOR=24
ELO_HIGH_ELO_THRESHOLD=1600
ELO_MAX_CHANGE_PER_SERIES=150

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW="1 minute"

# CORS
CORS_ORIGIN="http://localhost:3000"

# Logging
LOG_LEVEL="info"
PRETTY_LOGS="true"

# Docker (for docker-compose)
POSTGRES_USER="trayb"
POSTGRES_PASSWORD="password"
POSTGRES_DB="trayb_customs"
```

Save and exit (Ctrl+X, then Y, then Enter for nano)

### 6. Start PostgreSQL and Redis

```bash
cd ~/trayb-customs

# Start only databases
docker-compose up -d postgres redis

# Check they're running
docker-compose ps

# View logs
docker-compose logs -f postgres
# Press Ctrl+C to stop viewing logs
```

### 7. Set Up Database

```bash
cd ~/trayb-customs/apps/backend

# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# You should see:
# ✔ Generated Prisma Client
# ✔ The migration has been created successfully
```

### 8. Start Backend

Open a new terminal in WSL (or use tmux/screen):

```bash
cd ~/trayb-customs/apps/backend

# Start backend server
npm run dev

# Should see:
# ╔════════════════════════════════════════╗
# ║   TRAYB Customs Backend API Server    ║
# ║   Status: ✓ Running                    ║
# ║   Port: 3001                           ║
# ╚════════════════════════════════════════╝
```

### 9. Start Frontend

Open another terminal in WSL:

```bash
cd ~/trayb-customs/apps/frontend

# Start frontend server
npm run dev

# Should see:
# ▲ Next.js 15.1.0
# - Local:        http://localhost:3000
```

### 10. Test Everything

Open browser on Windows to:
- Frontend: http://localhost:3000
- Backend Health: http://localhost:3001/health
- Prisma Studio: Run `npx prisma studio` in backend folder → http://localhost:5555

---

## Daily Workflow in WSL

### Start Everything

```bash
# Terminal 1: WSL bash
cd ~/trayb-customs
docker-compose up -d postgres redis

# Terminal 2: Backend
cd ~/trayb-customs/apps/backend
npm run dev

# Terminal 3: Frontend
cd ~/trayb-customs/apps/frontend
npm run dev
```

### Stop Everything

```bash
# Ctrl+C in backend and frontend terminals

# Stop databases
cd ~/trayb-customs
docker-compose stop postgres redis

# Or completely shut down
docker-compose down
```

---

## Useful WSL Commands

### Docker Commands

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop all containers
docker stop $(docker ps -q)

# Remove all containers
docker rm $(docker ps -aq)

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart postgres

# Fresh start (deletes volumes!)
docker-compose down -v
docker-compose up -d
```

### File Management

```bash
# Access Windows files from WSL
cd /mnt/c/Users/Onarbay/Documents

# Access WSL files from Windows
# In File Explorer: \\wsl$\Ubuntu\home\yourusername

# Copy files between Windows and WSL
cp /mnt/c/path/to/file ~/destination
```

### WSL Management

```bash
# From PowerShell/CMD:

# List WSL distributions
wsl --list

# Shutdown WSL
wsl --shutdown

# Restart WSL
wsl

# Check WSL version
wsl --status
```

---

## Troubleshooting

### Issue: "Cannot connect to Docker daemon"

```bash
# Start Docker service
sudo service docker start

# Or add to auto-start
echo "sudo service docker start > /dev/null 2>&1" >> ~/.bashrc
```

### Issue: "Permission denied" for Docker

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, or:
newgrp docker

# Test
docker ps
```

### Issue: Port already in use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Or kill all node processes
pkill -f node
```

### Issue: WSL2 uses too much memory

Create `C:\Users\Onarbay\.wslconfig`:

```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
```

Then restart WSL:
```powershell
wsl --shutdown
wsl
```

### Issue: Slow file system performance

Make sure project is in WSL filesystem (`~/trayb-customs`), NOT in `/mnt/c/...`

---

## Cursor/VS Code WSL Integration

### Install WSL Extension

1. In Cursor, open Extensions (Ctrl+Shift+X)
2. Search for "WSL"
3. Install "WSL" extension by Microsoft

### Connect to WSL

Method 1 - Command Palette:
1. Press `Ctrl+Shift+P`
2. Type "WSL: Reopen Folder in WSL"
3. Select your project folder

Method 2 - From Terminal:
```bash
cd ~/trayb-customs
cursor .
```

Method 3 - Remote Explorer:
1. Click Remote Explorer icon (bottom left)
2. Select "WSL Targets"
3. Connect to Ubuntu
4. Open folder

### Verify You're in WSL

Look at the bottom-left corner of Cursor:
- Should say "WSL: Ubuntu" (or your distro name)
- If it says "Windows", you're not in WSL mode

---

## Performance Tips

1. **Keep project in WSL filesystem** (`~/` not `/mnt/c/`)
2. **Use WSL2** (not WSL1): `wsl --set-version Ubuntu 2`
3. **Allocate enough RAM** (edit `.wslconfig`)
4. **Use Docker in WSL** (better than Docker Desktop integration)
5. **Install Node/NPM in WSL** (don't rely on Windows versions)

---

## Quick Reference

### Start Services
```bash
docker-compose up -d postgres redis    # Databases
npm run dev                             # Backend + Frontend (from root)
```

### Check Status
```bash
docker ps                               # Running containers
docker-compose logs -f                  # View logs
curl http://localhost:3001/health       # Test backend
```

### Stop Services
```bash
docker-compose down                     # Stop all
pkill -f node                          # Stop Node processes
```

### Database
```bash
cd apps/backend
npx prisma studio                       # View database
npx prisma migrate dev                  # Create migration
npx prisma generate                     # Generate client
```

---

## Next Steps

1. ✅ Move project to WSL or configure Docker Desktop
2. ✅ Open project in Cursor with WSL mode
3. ✅ Run `docker-compose up -d postgres redis`
4. ✅ Run `npx prisma migrate dev` in backend
5. ✅ Start backend with `npm run dev`
6. ✅ Start frontend with `npm run dev`
7. ✅ Test at http://localhost:3000

See LOCAL_SETUP.md and PROJECT_STATUS.md for more details!

---

## Summary

**Recommended: Move project to WSL for best performance and compatibility.**

The project is ready to run - just follow the steps above and you'll have:
- ✅ PostgreSQL + Redis running in Docker
- ✅ Backend API on port 3001
- ✅ Frontend on port 3000
- ✅ Full hot-reload development environment
- ✅ Matrix-themed UI with animations

Good luck! 🚀

