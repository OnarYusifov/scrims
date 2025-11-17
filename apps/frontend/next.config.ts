import type { NextConfig } from "next";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// Simple env loader - no await, no complexity
const rootDir = resolve(__dirname || process.cwd(), "../..");
const envPath = join(rootDir, ".env");

if (existsSync(envPath)) {
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
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Silent fail
  }
}

const nextConfig: NextConfig = {};

export default nextConfig;
