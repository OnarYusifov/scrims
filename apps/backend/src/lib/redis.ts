import Redis, { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const baseOptions: RedisOptions = {
  connectTimeout: 5000,
  retryStrategy: (times) => {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 200, 1000);
  },
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  lazyConnect: false,
};

export const redis = new Redis(redisUrl, baseOptions);

export const createRedisConnection = () => new Redis(redisUrl, baseOptions);

export type RedisConnection = ReturnType<typeof createRedisConnection>;

export const redisConfig = {
  url: redisUrl,
  options: baseOptions,
};



