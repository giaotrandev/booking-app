import { prisma } from '#config/db';
import { cacheManager } from './manager';
import { CACHE_PREFIXES } from './constants';
import { userCacheService } from './user';

export const roleCacheService = {
  /**
   * Clear permissions cache for a specific role
   */
  async clearPermissionsCache(roleId: string) {
    await cacheManager.clearKey(CACHE_PREFIXES.ROLE_PERMISSIONS, roleId);
  },

  /**
   * Clear cache for all users with a specific role
   */
  async clearUsersWithRoleCache(roleId: string) {
    const usersWithRole = await prisma.user.findMany({
      where: { role: { id: roleId } },
      select: { id: true },
    });

    // Clear cache for each user
    await Promise.all(usersWithRole.map((user) => userCacheService.clearAllUserCaches(user.id)));
  },
};
