import { Request, Response, NextFunction } from 'express';
import { checkPermission } from '#services/permissionService';
import { sendForbidden } from '#utils/apiResponse';

type PermissionStrategy = 'any' | 'all';

export const validatePermissions = (permissionCodes: string | string[], strategy: PermissionStrategy = 'any') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Kiểm tra xem user đã đăng nhập chưa
      if (!req.user) {
        return sendForbidden(res, 'auth.noToken');
      }

      // Nếu là single permission
      if (typeof permissionCodes === 'string') {
        const hasPermission = await checkPermission({
          userId: (req.user as { userId: string }).userId, // Type assertion
          permissionCode: permissionCodes,
        });

        if (!hasPermission) {
          return sendForbidden(res, 'auth.insufficientPermissions');
        }

        return next();
      }

      // Xử lý multiple permissions
      if (strategy === 'any') {
        const hasPermission = await checkPermission({
          userId: (req.user as { userId: string }).userId,
          permissionCode: permissionCodes,
        });

        if (!hasPermission) {
          return sendForbidden(res, 'auth.insufficientPermissions');
        }
      } else {
        // Kiểm tra tất cả các quyền
        const permissionChecks = permissionCodes.map((code) =>
          checkPermission({
            userId: (req.user as { userId: string }).userId,
            permissionCode: code,
          })
        );

        const permissionResults = await Promise.all(permissionChecks);
        const hasAllPermissions = permissionResults.every((result) => result);

        if (!hasAllPermissions) {
          return sendForbidden(res, 'auth.insufficientPermissions');
        }
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      sendForbidden(res, 'auth.permissionCheckFailed');
    }
  };
};
