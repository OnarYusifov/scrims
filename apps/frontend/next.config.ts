import type { NextConfig } from "next";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// Simple env loader - no await, no complexity
// Loads .env from root directory
const rootDir = resolve(__dirname || process.cwd(), "../..");

const loadEnvFile = (envPath: string, allowOverride: boolean = false) => {
  if (!existsSync(envPath)) return;
  
  try {
    const envFile = readFileSync(envPath, "utf-8");
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
      if (key && (allowOverride || !process.env[key])) {
        process.env[key] = value;
      }
    }
  } catch {
    // Silent fail
  }
};

// Load .env from root
loadEnvFile(join(rootDir, ".env"), false);

// Next.js automatically reads PORT from process.env
// Set PORT from FRONTEND_PORT (required from root .env)
if (!process.env.FRONTEND_PORT) {
  throw new Error("FRONTEND_PORT must be set in root .env file");
}
process.env.PORT = process.env.FRONTEND_PORT;

// Set NEXT_PUBLIC_BACKEND_PORT from BACKEND_PORT for client-side code
if (!process.env.BACKEND_PORT) {
  throw new Error("BACKEND_PORT must be set in root .env file");
}
process.env.NEXT_PUBLIC_BACKEND_PORT = process.env.BACKEND_PORT;

const nextConfig: NextConfig = {};

export default nextConfig;
