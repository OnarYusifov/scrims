/**
 * Environment Variable Loader
 * 
 * Always loads .env from the monorepo root directory.
 * This ensures consistent env loading across all apps for Dokploy deployment.
 * 
 * Usage:
 *   import "@trayb/config/load-env";
 * 
 * This should be imported at the very top of your entry file, before any other imports.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

/**
 * Finds the monorepo root directory by looking for package.json with workspaces
 */
function findRootDir(startDir: string): string {
  let currentDir = startDir;
  
  while (currentDir !== "/") {
    const packageJsonPath = join(currentDir, "package.json");
    
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        // Check if this is the root (has workspaces or is the monorepo root)
        if (packageJson.workspaces || packageJson.name === "trayb") {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }
    
    const parentDir = resolve(currentDir, "..");
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
  }
  
  // Fallback: return startDir if root not found
  return startDir;
}

/**
 * Loads environment variables from root .env file
 * 
 * @param fromFile - The file path calling this function (use import.meta.url)
 * @returns The root directory path
 */
export function loadEnvFromRoot(fromFile?: string | URL): string {
  let startDir: string;
  
  if (fromFile) {
    // If called from ESM context
    if (typeof fromFile === "string" && fromFile.startsWith("file://")) {
      const __filename = fileURLToPath(fromFile);
      startDir = dirname(__filename);
    } else if (fromFile instanceof URL) {
      const __filename = fileURLToPath(fromFile);
      startDir = dirname(__filename);
    } else {
      // CommonJS or other
      startDir = fromFile;
    }
  } else {
    // Try to detect from import.meta.url if available
    try {
      // @ts-ignore - import.meta.url may not be available in all contexts
      if (typeof import.meta !== "undefined" && import.meta.url) {
        const __filename = fileURLToPath(import.meta.url);
        startDir = dirname(__filename);
      } else {
        startDir = process.cwd();
      }
    } catch {
      startDir = process.cwd();
    }
  }
  
  const rootDir = findRootDir(startDir);
  
  // Helper function to load env file
  const loadEnvFile = (envFilePath: string, allowOverride: boolean = false): number => {
    if (!existsSync(envFilePath)) {
      return 0;
    }
    
    try {
      const envFile = readFileSync(envFilePath, "utf-8");
      let loadedCount = 0;
      
      for (const line of envFile.split("\n")) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith("#")) continue;
        
        // Parse KEY=VALUE (handle values with = in them)
        const equalIndex = trimmed.indexOf("=");
        if (equalIndex === -1) continue;
        
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Set variable if allowOverride is true OR if it doesn't exist in process.env
        if (key && (allowOverride || !process.env[key])) {
          process.env[key] = value;
          loadedCount++;
        }
      }
      
      return loadedCount;
    } catch (error) {
      console.warn(`⚠️  Could not load .env from ${envFilePath}:`, error);
      return 0;
    }
  };
  
  // Load .env (only set if not already in process.env, allows Dokploy override)
  const envPath = join(rootDir, ".env");
  const envCount = loadEnvFile(envPath, false);
  if (envCount > 0) {
    console.log(`✅ Loaded ${envCount} environment variable(s) from ${envPath}`);
  } else if (!existsSync(envPath)) {
    // Don't warn in production (Dokploy will inject env vars directly)
    if (process.env.NODE_ENV !== "production") {
      console.warn(`⚠️  .env file not found at ${envPath}. Using process.env only.`);
    }
  }
  
  return rootDir;
}

// Auto-load if this module is imported directly
// This allows: import "@trayb/config/load-env"
try {
  // @ts-ignore - import.meta.url may not be available
  if (typeof import.meta !== "undefined" && import.meta.url) {
    loadEnvFromRoot(import.meta.url);
  }
} catch {
  // Fallback: try to load from current working directory
  loadEnvFromRoot();
}








