#!/usr/bin/env node

/**
 * Lightweight load-testing harness using autocannon.
 * Reads scenario configuration from loadtest/scenario.json (override with argv[2]).
 * Writes a JSON summary to loadtest/results/<timestamp>.json for audit trails.
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

function readScenario(configPath) {
  const resolvedPath = path.resolve(configPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Scenario file not found: ${resolvedPath}`);
  }

  const contents = fs.readFileSync(resolvedPath, 'utf-8');
  return JSON.parse(contents);
}

function assertSafety(baseUrl) {
  const allowedHosts = process.env.LOADTEST_ALLOWED_HOSTS
    ? process.env.LOADTEST_ALLOWED_HOSTS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  try {
    const url = new URL(baseUrl);
    if (allowedHosts.length > 0 && !allowedHosts.includes(url.hostname)) {
      throw new Error(`Host ${url.hostname} not in LOADTEST_ALLOWED_HOSTS (${allowedHosts.join(', ')})`);
    }

    if (
      ['production', 'prod'].includes(process.env.NODE_ENV || '') &&
      process.env.LOADTEST_ALLOW_PROD !== 'true'
    ) {
      throw new Error(
        'Running load tests in production is blocked. Set LOADTEST_ALLOW_PROD=true if this is intentional.',
      );
    }

    if (/trayb\.az$/.test(url.hostname) && process.env.LOADTEST_ALLOW_PROD !== 'true') {
      throw new Error(
        `Host ${url.hostname} looks like production. Set LOADTEST_ALLOW_PROD=true to continue.`,
      );
    }
  } catch (error) {
    throw new Error(`Base URL safety check failed: ${error.message}`);
  }
}

function withHeaders(req, headers) {
  if (!headers || Object.keys(headers).length === 0) {
    return req;
  }
  return {
    ...req,
    headers: {
      ...(req.headers || {}),
      ...headers,
    },
  };
}

async function runScenario(scenarioPath) {
  const scenario = readScenario(scenarioPath);
  const baseUrl = process.env.LOADTEST_BASE_URL || scenario.baseUrl;

  assertSafety(baseUrl);

  const warmup = scenario.warmup || null;
  const defaultHeaders = { ...(scenario.defaultHeaders || {}) };

  if (process.env.LOADTEST_BEARER) {
    defaultHeaders.Authorization = `Bearer ${process.env.LOADTEST_BEARER}`;
  }

  const requests = (scenario.requests || []).map((req) => {
    const mergedHeaders = { ...defaultHeaders, ...(req.headers || {}) };
    return withHeaders({ ...req }, mergedHeaders);
  });

  const options = {
    url: baseUrl,
    connections: Number(process.env.LOADTEST_CONNECTIONS || scenario.connections || 10),
    duration: Number(process.env.LOADTEST_DURATION || scenario.duration || 30),
    timeout: Number(process.env.LOADTEST_TIMEOUT || scenario.timeout || 10),
    pipelining: Number(process.env.LOADTEST_PIPELINING || scenario.pipelining || 1),
    requests,
    headers: defaultHeaders,
    title: scenario.name || 'trayb-loadtest',
  };

  if (warmup) {
    console.log(`🔥 Warm-up: ${warmup.duration}s @ ${warmup.connections} connections`);
    await autocannon({
      url: baseUrl,
      connections: warmup.connections,
      duration: warmup.duration,
      timeout: options.timeout,
      requests,
      headers: defaultHeaders,
      title: `${options.title}-warmup`,
    });
  }

  console.log(`🚀 Running load test against ${baseUrl}`);
  console.log(
    `Connections=${options.connections}, Duration=${options.duration}s, Requests=${requests.length}`,
  );

  const result = await autocannon({
    ...options,
  });

  const resultsDir = path.resolve(process.cwd(), 'loadtest', 'results');
  fs.mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(resultsDir, `autocannon-${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(`✅ Load test complete. Results saved to ${filePath}`);

  if (scenario.assertions && Array.isArray(scenario.assertions)) {
    scenario.assertions.forEach((assertion) => {
      const { metric, max, min } = assertion;
      const value = result[metric];
      if (value === undefined) {
        console.warn(`⚠️ Unknown metric "${metric}" in assertion`);
        return;
      }

      if (typeof max === 'number' && value > max) {
        throw new Error(`Assertion failed: ${metric}=${value} exceeds max ${max}`);
      }
      if (typeof min === 'number' && value < min) {
        throw new Error(`Assertion failed: ${metric}=${value} below min ${min}`);
      }
    });
    console.log('✅ Assertions passed');
  }

  return result;
}

async function main() {
  const scenarioPath =
    process.argv[2] || path.join(process.cwd(), 'loadtest', 'scenario.json');

  try {
    await runScenario(scenarioPath);
  } catch (error) {
    console.error(`❌ Load test failed: ${error.message}`);
    process.exit(1);
  }
}

main();

