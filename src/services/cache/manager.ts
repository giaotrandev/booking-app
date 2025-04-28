import { getRedisClient } from '#config/redis';

export const cacheManager = {
  /**
   * Clear a specific cache key
   */
  async clearKey(prefix: string, identifier: string) {
    const client = getRedisClient();
    if (!client) return;

    const cacheKey = `${prefix}${identifier}`;

    try {
      await client.del(cacheKey);
      console.log(`Cleared cache key: ${cacheKey}`);
    } catch (error) {
      console.error(`Error clearing cache key ${cacheKey}:`, error);
    }
  },

  /**
   * Clear all cache keys matching a specific prefix
   */
  async clearByPrefix(prefix: string) {
    const client = getRedisClient();
    if (!client) return;

    try {
      const stream = client.scanStream({
        match: `${prefix}*`,
      });

      const keys: string[] = [];
      stream.on('data', (resultKeys: string[]) => {
        for (let i = 0; i < resultKeys.length; i++) {
          keys.push(resultKeys[i]);
        }
      });

      return new Promise<void>((resolve, reject) => {
        stream.on('end', async () => {
          if (keys.length > 0) {
            try {
              await client.del(keys);
              console.log(`Cleared ${keys.length} cache keys with prefix: ${prefix}`);
              resolve();
            } catch (error) {
              console.error(`Error clearing cache with prefix ${prefix}:`, error);
              reject(error);
            }
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.error(`Error scanning cache with prefix ${prefix}:`, error);
    }
  },
};
