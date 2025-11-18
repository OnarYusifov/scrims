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
// If FRONTEND_PORT is set, use it; otherwise PORT; otherwise Next.js defaults to 3000
if (process.env.FRONTEND_PORT) {
  process.env.PORT = process.env.FRONTEND_PORT;
}

const nextConfig: NextConfig = {};

export default nextConfig;
