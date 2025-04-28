import { prisma } from '#config/db';
import { cacheManager } from './manager';
import { CACHE_PREFIXES } from './constants';

export const userCacheService = {
  /**
   * Clear user permissions cache
   */
  async clearPermissionsCache(userId: string) {
    await cacheManager.clearKey(CACHE_PREFIXES.USER_PERMISSIONS, userId);
  },

  /**
   * Clear user profile cache
   */
  async clearProfileCache(userId: string) {
    await cacheManager.clearKey(CACHE_PREFIXES.USER_PROFILE, userId);
  },

  /**
   * Clear user login sessions cache
   */
  async clearSessionsCache(userId: string) {
    await cacheManager.clearKey(CACHE_PREFIXES.USER_SESSIONS, userId);
  },

  /**
   * Clear all user-related caches
   */
  async clearAllUserCaches(userId: string) {
    await Promise.all([
      this.clearPermissionsCache(userId),
      this.clearProfileCache(userId),
      this.clearSessionsCache(userId),
    ]);
  },
};
