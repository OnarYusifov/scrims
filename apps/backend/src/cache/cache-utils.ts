import { redis } from '../lib/redis';

const CACHE_METRICS_HIT = 'metrics:cache:hits';
const CACHE_METRICS_MISS = 'metrics:cache:misses';
const CACHE_METRICS_INVALIDATIONS = 'metrics:cache:invalidations';

const DEFAULT_SET_TTL = 60 * 60; // 1 hour for key tracking sets

export async function readJsonCache<T>(key: string, metricPrefix: string): Promise<T | null> {
  const payload = await redis.get(key);
  if (!payload) {
    await redis.hincrby(CACHE_METRICS_MISS, metricPrefix, 1).catch(() => undefined);
    return null;
  }

  await redis.hincrby(CACHE_METRICS_HIT, metricPrefix, 1).catch(() => undefined);

  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    await redis.del(key).catch(() => undefined);
    return null;
  }
}

interface WriteJsonCacheOptions {
  ttlSeconds: number;
  tags?: string[];
  metricPrefix: string;
}

export async function writeJsonCache(
  key: string,
  value: unknown,
  { ttlSeconds, tags = [], metricPrefix }: WriteJsonCacheOptions,
): Promise<void> {
  const stringified = JSON.stringify(value);
  const pipeline = redis.multi();

  pipeline.set(key, stringified, 'EX', ttlSeconds);

  for (const tag of tags) {
    pipeline.sadd(tag, key);
    pipeline.expire(tag, DEFAULT_SET_TTL);
  }

  pipeline.hincrby('metrics:cache:writes', metricPrefix, 1);

  await pipeline.exec();
}

export async function invalidateTag(tag: string, metricPrefix: string): Promise<number> {
  const keys = await redis.smembers(tag);
  if (!keys.length) {
    return 0;
  }

  const pipeline = redis.multi();
  pipeline.del(tag);
  pipeline.unlink(...keys);
  pipeline.hincrby(CACHE_METRICS_INVALIDATIONS, metricPrefix, keys.length);

  await pipeline.exec();
  return keys.length;
}

export async function invalidateKeys(keys: string[], metricPrefix: string): Promise<void> {
  if (!keys.length) return;
  await redis
    .multi()
    .unlink(...keys)
    .hincrby(CACHE_METRICS_INVALIDATIONS, metricPrefix, keys.length)
    .exec();
}




