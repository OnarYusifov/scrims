#!/usr/bin/env node
/**
 * Dev script that loads root .env and sets PORT before starting Next.js
 * This ensures Next.js reads the correct port from FRONTEND_PORT
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find root directory (go up from apps/frontend/scripts to root)
// Script is at: apps/frontend/scripts/dev.js
// Root is at: ./
const rootDir = resolve(__dirname, "../../../");

// Load .env from root
const envPath = join(rootDir, ".env");
if (!existsSync(envPath)) {
  console.error(`❌ .env file not found at ${envPath}`);
  process.exit(1);
}

const envFile = readFileSync(envPath, "utf-8");
const env = {};

for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const equalIndex = trimmed.indexOf("=");
  if (equalIndex === -1) continue;
  const key = trimmed.substring(0, equalIndex).trim();
  let value = trimmed.substring(equalIndex + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (key) {
    env[key] = value;
  }
}

// Check for FRONTEND_PORT
if (!env.FRONTEND_PORT) {
  console.error("❌ FRONTEND_PORT must be set in root .env file");
  process.exit(1);
}

// Set PORT from FRONTEND_PORT
process.env.PORT = env.FRONTEND_PORT;

// Set NEXT_PUBLIC_BACKEND_PORT from BACKEND_PORT for client-side
if (!env.BACKEND_PORT) {
  console.error("❌ BACKEND_PORT must be set in root .env file");
  process.exit(1);
}
process.env.NEXT_PUBLIC_BACKEND_PORT = env.BACKEND_PORT;

// Also set other env vars from root .env
for (const [key, value] of Object.entries(env)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// Change to frontend directory before starting Next.js
process.chdir(resolve(__dirname, ".."));

// Start Next.js dev server
const nextDev = spawn("next", ["dev"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
  cwd: resolve(__dirname, ".."),
});

nextDev.on("exit", (code) => {
  process.exit(code || 0);
});

