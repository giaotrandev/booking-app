import Redis, { RedisOptions } from 'ioredis';

let redisClient: Redis | null = null;

export const initRedis = (): Redis | null => {
  const REDIS_URL = `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
  const redisUrl = REDIS_URL;
  if (!redisUrl) {
    console.error('REDIS_URL environment variable is not defined');
    return null;
  }

  const redisOptions: RedisOptions = {
    connectTimeout: 10000,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };

  try {
    redisClient = new Redis(redisUrl, redisOptions);

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
      redisClient = null;
    });

    return redisClient;
  } catch (error) {
    console.error('Error creating Redis client:', error);
    return null;
  }
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};

export default redisClient;
