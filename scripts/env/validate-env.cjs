#!/usr/bin/env node

/**
 * Validate environment variables against config/env.schema.json.
 *
 * Usage:
 *   node scripts/env/validate-env.cjs --context=local --file=.env
 *
 * Options:
 *   --context=<name>       Validation context (local | staging | production | ci). Default: local.
 *   --file=<path>          Path to .env file to parse. Default: .env.
 *   --require-file=<bool>  Whether the .env file must exist. Default: true.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const args = process.argv.slice(2);

function parseArgs(rawArgs) {
  return rawArgs.reduce(
    (acc, token) => {
      if (token.startsWith('--context=')) {
        acc.context = token.split('=')[1];
      } else if (token.startsWith('--file=')) {
        acc.file = token.split('=')[1];
      } else if (token.startsWith('--require-file=')) {
        const value = token.split('=')[1];
        acc.requireFile = value === 'true';
      } else if (token === '--help' || token === '-h') {
        acc.help = true;
      }
      return acc;
    },
    {
      context: 'local',
      file: '.env',
      requireFile: true,
      help: false,
    },
  );
}

const options = parseArgs(args);

if (options.help) {
  console.log(`Usage: node scripts/env/validate-env.cjs [--context=<local|staging|production|ci>] [--file=.env] [--require-file=true]`);
  process.exit(0);
}

const schemaPath = path.resolve(process.cwd(), 'config', 'env.schema.json');
if (!fs.existsSync(schemaPath)) {
  console.error('❌ config/env.schema.json not found.');
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const availableContexts = Object.keys(schema.contexts || {});

if (!availableContexts.includes(options.context)) {
  console.error(`❌ Unknown context "${options.context}". Available contexts: ${availableContexts.join(', ')}`);
  process.exit(1);
}

const envFilePath = path.resolve(process.cwd(), options.file);
let parsedEnv = {};

if (fs.existsSync(envFilePath)) {
  try {
    parsedEnv = dotenv.parse(fs.readFileSync(envFilePath));
  } catch (error) {
    console.error(`❌ Failed to parse ${options.file}: ${error.message}`);
    process.exit(1);
  }
} else if (options.requireFile) {
  console.error(`❌ Environment file ${options.file} not found. Pass --require-file=false to skip this check.`);
  process.exit(1);
}

const combinedEnv = {
  ...parsedEnv,
  ...process.env,
};

const missing = [];
const presentKeys = new Set(Object.keys(parsedEnv));
const schemaKeys = new Set(schema.variables.map((variable) => variable.key));

schema.variables.forEach((variable) => {
  const requiredMap = variable.required || {};
  const isRequired = Boolean(requiredMap[options.context]);
  const value = combinedEnv[variable.key];

  if (isRequired && (value === undefined || value === null || String(value).trim() === '')) {
    missing.push(variable);
  }
});

const extraKeys = Array.from(presentKeys).filter((key) => !schemaKeys.has(key));

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables for context "${options.context}":`);
  missing.forEach((variable) => {
    const contexts = Object.entries(variable.required || {})
      .filter(([, required]) => required)
      .map(([name]) => name)
      .join(', ');
    console.error(`  - ${variable.key} (${contexts}) ${variable.description ? `→ ${variable.description}` : ''}`);
    if (variable.example) {
      console.error(`      example: ${variable.example}`);
    }
  });
}

if (extraKeys.length > 0) {
  console.warn('⚠️  The following entries exist in the environment file but are not defined in config/env.schema.json:');
  extraKeys.forEach((key) => console.warn(`  - ${key}`));
}

if (missing.length === 0) {
  console.log(`✅ Environment validation passed for context "${options.context}".`);
  if (extraKeys.length === 0) {
    console.log(`ℹ️  All variables in ${options.file} align with config/env.schema.json.`);
  }
  process.exit(0);
}

process.exit(1);


