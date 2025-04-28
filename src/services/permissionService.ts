import { getRedisClient } from '#config/redis';
import { prisma } from '#config/db';
import ms from 'ms';

export interface PermissionCheck {
  userId: string;
  permissionCode: string | string[];
}

const PERMISSION_PREFIX = 'user_permissions:';

export const checkPermission = async ({ userId, permissionCode }: PermissionCheck): Promise<boolean> => {
  const userPermissions = await getUserPermissions(userId);

  if (typeof permissionCode === 'string') {
    return userPermissions.includes(permissionCode);
  }

  // Nếu là multiple permissions
  // Kiểm tra xem có ít nhất một quyền trong danh sách không
  return permissionCode.some((code) => userPermissions.includes(code));
};

export const getUserPermissions = async (userId: string): Promise<string[]> => {
  const client = getRedisClient();

  const cacheKey = `${PERMISSION_PREFIX}${userId}`;

  const cachedPermissions = await client?.get(cacheKey);
  if (cachedPermissions) {
    return JSON.parse(cachedPermissions);
  }

  const CACHE_EXPIRATION = process.env.CACHE_EXPIRATION || '1h';

  const expirationSeconds = Math.floor(ms(CACHE_EXPIRATION as ms.StringValue) / 1000);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            select: { code: true },
          },
        },
      },
    },
  });

  if (!user) {
    return [];
  }

  const permissions = user.role.permissions.map((p) => p.code);

  await client?.set(cacheKey, JSON.stringify(permissions), 'EX', expirationSeconds);

  return permissions;
};
