import Redis, { RedisOptions } from 'ioredis';

let redisCacheClient: Redis | null = null;
let redisQueueClient: Redis | null = null;

/**
 * Initialize Redis client for caching
 */
export const initRedisCache = async (): Promise<Redis | null> => {
  // Use REDIS_URL if available, otherwise construct from host/port
  const redisUrl =
    process.env.REDIS_URL ||
    (process.env.REDIS_HOST && process.env.REDIS_PORT ? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` : null);

  if (!redisUrl) {
    console.error('Redis cache URL or host/port not defined in environment variables');
    return null;
  }

  // const redisOptions: RedisOptions = {
  //   connectTimeout: 10000,
  //   retryStrategy: (times) => {
  //     const delay = Math.min(times * 50, 2000);
  //     return delay;
  //   },
  //   maxRetriesPerRequest: 3,
  //   // enableReadyCheck: false, // Reduces Redis commands for low-memory situations
  //   enableOfflineQueue: true, // Prevents command queue growing when Redis is down
  // };

  const redisOptions: RedisOptions = {
    connectTimeout: 20000, // Tăng thời gian kết nối
    reconnectOnError: (err) => {
      console.error('Redis reconnection error:', err);
      return true;
    },
    retryStrategy: (times) => {
      console.log(`Redis connection retry attempt: ${times}`);
      if (times > 20) {
        console.error('Max Redis connection retries reached');
        return null; // Dừng retry
      }
      return Math.min(times * 1000, 30000); // Tăng delay, max 30 giây
    },
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    // Tăng keepAlive và timeout
    keepAlive: 30000, // 30 giây
  };

  try {
    // Create Redis client with URL directly
    redisCacheClient = new Redis(redisUrl, redisOptions);

    // Wrap connection in a Promise
    await new Promise((resolve, reject) => {
      redisCacheClient?.once('connect', () => {
        console.log('✓ Redis cache initialized');
        resolve(true);
      });
      redisCacheClient?.once('error', (err) => {
        reject(err);
      });
    });

    return redisCacheClient;
  } catch (error) {
    console.error('Error creating Redis cache client:', error);
    return null;
  }
};

/**
 * Initialize Redis client for queue (Bull)
 */
export const initRedisQueue = async (): Promise<Redis | null> => {
  // Use REDIS_QUEUE_URL if available, otherwise construct from host/port
  const redisUrl =
    process.env.REDIS_QUEUE_URL ||
    (process.env.REDIS_QUEUE_HOST && process.env.REDIS_QUEUE_PORT
      ? `${process.env.REDIS_QUEUE_HOST}:${process.env.REDIS_QUEUE_PORT}`
      : // Fallback to standard Redis env vars
        process.env.REDIS_URL ||
        (process.env.REDIS_HOST && process.env.REDIS_PORT
          ? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
          : null));

  console.log('Redis URL:', redisUrl); // Log the Redis URL for debugging

  if (!redisUrl) {
    console.error('Redis queue URL or host/port not defined in environment variables');
    return null;
  }

  const redisOptions: RedisOptions = {
    enableReadyCheck: true,
    enableOfflineQueue: true,
    maxRetriesPerRequest: null,
    tls: {
      rejectUnauthorized: !(process.env.NODE_ENV == 'development'),
    },
    connectTimeout: 30000,
    retryStrategy: (times) => {
      console.log(`Redis connection retry attempt: ${times}`);

      // Ngừng retry sau 50 lần
      if (times > 50) {
        console.error('Max Redis connection retries reached');
        return null;
      }

      // Tăng delay, max 30 giây
      const delay = Math.min(times * 1000, 30000);
      console.log(`Retry delay: ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      console.error('Redis reconnection error:', err);
      // Luôn thử kết nối lại
      return true;
    },
    keepAlive: 30000, // Gửi keepalive mỗi 30 giây
  };

  try {
    // Create Redis client with URL directly
    redisQueueClient = new Redis(redisUrl, redisOptions);

    // Wrap connection in a Promise
    await new Promise((resolve, reject) => {
      redisQueueClient?.once('connect', () => {
        console.log('✓ Redis queue initialized');
        resolve(true);
      });
      redisQueueClient?.once('error', (err) => {
        reject(err);
      });
    });

    return redisQueueClient;
  } catch (error) {
    console.error('Error creating Redis queue client:', error);
    return null;
  }
};

/**
 * Get Redis client for caching
 */
export const getRedisCacheClient = (): Redis | null => {
  return redisCacheClient;
};

/**
 * Get Redis client for queue
 * This function returns the Redis URL instead of the client for Bull
 */
export const getRedisQueueUrl = (): string => {
  return process.env.REDIS_QUEUE_URL || `${process.env.REDIS_QUEUE_HOST}:${process.env.REDIS_QUEUE_PORT}`;
};

/**
 * Get Redis queue client
 */
export const getRedisQueueClient = (): Redis | null => {
  return redisQueueClient;
};

/**
 * Wait until Redis is connected
 * @param client Redis client
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise that resolves when connected
 */
export const waitForRedisConnection = async (client: Redis, timeoutMs = 5000): Promise<boolean> => {
  // If already connected, resolve immediately
  if (client.status === 'ready') {
    return true;
  }

  return new Promise((resolve) => {
    // Set a timeout to avoid waiting forever
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    // Handler for successful connection
    const connectHandler = () => {
      cleanup();
      resolve(true);
    };

    // Handler for error
    const errorHandler = () => {
      // Don't resolve on error - wait for connect or timeout
    };

    // Clean up event listeners
    const cleanup = () => {
      clearTimeout(timeout);
      client.removeListener('ready', connectHandler);
      client.removeListener('error', errorHandler);
    };

    // Set up event listeners
    client.once('ready', connectHandler);
    client.once('error', errorHandler);
  });
};

/**
 * Check if Redis client is connected
 * @param client Redis client to check
 * @returns True if connected
 */
export const isRedisConnected = (client: Redis | null): boolean => {
  if (!client) return false;
  return client.status === 'ready';
};

export { redisCacheClient, redisQueueClient };
