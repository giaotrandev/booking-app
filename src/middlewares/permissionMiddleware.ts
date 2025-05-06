import { Request, Response, NextFunction } from 'express';
import { checkPermission } from '#services/permissionService';
import { sendForbidden } from '#utils/apiResponse';

// Enum để định nghĩa chiến lược kiểm tra quyền
export enum PermissionStrategy {
  ANY = 'any', // Chỉ cần 1 quyền là được
  ALL = 'all', // Phải có tất cả các quyền
  NONE = 'none', // Không được có bất kỳ quyền nào
  SELF = 'self', // Chỉ bản thân người dùng
  SELF_OR_ADMIN = 'self_or_admin', // Bản thân hoặc có quyền quản trị
}

// Kiểu dữ liệu cho tùy chọn kiểm tra quyền
export interface PermissionCheckOptions {
  userId: string;
  permissionCodes: string | string[];
  strategy?: PermissionStrategy;
  strict?: boolean; // Kiểm tra chặt chẽ
  targetUserId?: string; // ID của user đang bị tác động (dùng cho kiểm tra SELF)
}

/**
 * Middleware kiểm tra quyền linh hoạt
 * @param permissionCodes Mã quyền cần kiểm tra
 * @param strategy Chiến lược kiểm tra quyền
 * @param strict Chế độ kiểm tra chặt chẽ
 * @param paramIdField Tên trường chứa ID trong params (mặc định là 'id')
 */
export const validatePermissions = (
  permissionCodes: string | string[],
  strategy: PermissionStrategy = PermissionStrategy.ANY,
  strict: boolean = false,
  paramIdField: string = 'id'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Kiểm tra xem user đã đăng nhập chưa
      if (!req.user) {
        return sendForbidden(res, 'auth.noToken');
      }

      const userId = (req.user as { userId: string }).userId;
      const targetId = req.params[paramIdField];

      // Xử lý các chiến lược liên quan đến SELF
      if (strategy === PermissionStrategy.SELF) {
        // Chỉ cho phép người dùng tự truy cập dữ liệu của mình
        if (userId === targetId) {
          return next();
        }

        // Nếu không phải là chính mình
        if (strict) {
          console.warn(`Self permission check failed: userId=${userId}, targetId=${targetId}`);
          return sendForbidden(res, 'auth.notSelfAccess');
        }
        return sendForbidden(res, 'auth.insufficientPermissions');
      }

      // Xử lý chiến lược SELF_OR_ADMIN
      if (strategy === PermissionStrategy.SELF_OR_ADMIN) {
        // Nếu là chính mình
        if (userId === targetId) {
          return next();
        }

        // Nếu không phải là chính mình, kiểm tra quyền
        // Chuẩn hóa permissionCodes thành mảng
        const codes = Array.isArray(permissionCodes) ? permissionCodes : [permissionCodes];

        // Kiểm tra xem có ít nhất một quyền admin không
        const adminPermissionChecks = codes.map((code) => checkPermission({ userId, permissionCode: code }));
        const adminPermissionResults = await Promise.all(adminPermissionChecks);

        if (adminPermissionResults.some((result) => result)) {
          return next();
        }

        // Không phải chính mình và không có quyền
        if (strict) {
          console.warn(`Self or admin permission check failed: userId=${userId}, targetId=${targetId}`);
          return sendForbidden(res, 'auth.notSelfOrAdmin');
        }
        return sendForbidden(res, 'auth.insufficientPermissions');
      }

      // Chuẩn hóa permissionCodes thành mảng
      const codes = Array.isArray(permissionCodes) ? permissionCodes : [permissionCodes];

      // Kiểm tra quyền dựa trên chiến lược
      switch (strategy) {
        case PermissionStrategy.ANY:
          // Chỉ cần 1 quyền là được
          const anyPermissionChecks = codes.map((code) => checkPermission({ userId, permissionCode: code }));
          const anyPermissionResults = await Promise.all(anyPermissionChecks);

          if (anyPermissionResults.some((result) => result)) {
            return next();
          }
          break;

        case PermissionStrategy.ALL:
          // Phải có tất cả các quyền
          const allPermissionChecks = codes.map((code) => checkPermission({ userId, permissionCode: code }));
          const allPermissionResults = await Promise.all(allPermissionChecks);

          if (allPermissionResults.every((result) => result)) {
            return next();
          }
          break;

        case PermissionStrategy.NONE:
          // Không được có bất kỳ quyền nào
          const nonePermissionChecks = codes.map((code) => checkPermission({ userId, permissionCode: code }));
          const nonePermissionResults = await Promise.all(nonePermissionChecks);

          if (nonePermissionResults.every((result) => !result)) {
            return next();
          }
          break;

        default:
          throw new Error('Invalid permission strategy');
      }

      // Nếu không thỏa mãn và ở chế độ strict
      if (strict) {
        console.warn(`Permission check failed for user ${userId}`);
        return sendForbidden(res, 'auth.insufficientPermissions');
      }

      // Nếu không strict, cho phép qua
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      sendForbidden(res, 'auth.permissionCheckFailed');
    }
  };
};

// Hàm kiểm tra quyền nâng cao
export async function advancedPermissionCheck(options: PermissionCheckOptions): Promise<boolean> {
  const { userId, permissionCodes, strategy = PermissionStrategy.ANY, strict = false, targetUserId } = options;

  // Xử lý các chiến lược liên quan đến SELF
  if (strategy === PermissionStrategy.SELF) {
    return userId === targetUserId;
  }

  if (strategy === PermissionStrategy.SELF_OR_ADMIN) {
    // Nếu là chính mình
    if (userId === targetUserId) {
      return true;
    }

    // Nếu không phải là chính mình, kiểm tra quyền
    const codes = Array.isArray(permissionCodes) ? permissionCodes : [permissionCodes];
    const adminPermissionChecks = await Promise.all(
      codes.map((code) => checkPermission({ userId, permissionCode: code }))
    );
    return adminPermissionChecks.some((result) => result);
  }

  // Chuẩn hóa permissionCodes thành mảng
  const codes = Array.isArray(permissionCodes) ? permissionCodes : [permissionCodes];

  try {
    switch (strategy) {
      case PermissionStrategy.ANY:
        const anyChecks = await Promise.all(codes.map((code) => checkPermission({ userId, permissionCode: code })));
        return anyChecks.some((result) => result);

      case PermissionStrategy.ALL:
        const allChecks = await Promise.all(codes.map((code) => checkPermission({ userId, permissionCode: code })));
        return allChecks.every((result) => result);

      case PermissionStrategy.NONE:
        const noneChecks = await Promise.all(codes.map((code) => checkPermission({ userId, permissionCode: code })));
        return noneChecks.every((result) => !result);

      default:
        throw new Error('Invalid permission strategy');
    }
  } catch (error) {
    if (strict) {
      console.error('Advanced permission check failed:', error);
      throw error;
    }
    return false;
  }
}
