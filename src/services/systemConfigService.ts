import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Lấy cấu hình hệ thống, tạo mới nếu chưa tồn tại
 */
export async function getSystemConfig() {
  let config = await prisma.systemConfig.findFirst();

  if (!config) {
    config = await prisma.systemConfig.create({
      data: {}, // Sử dụng giá trị mặc định từ model
    });
  }

  return config;
}

/**
 * Cập nhật cấu hình hệ thống
 * @param data Thông tin cấu hình cần cập nhật
 */
export async function updateSystemConfig(data: Prisma.SystemConfigUpdateInput) {
  const existingConfig = await getSystemConfig();

  return prisma.systemConfig.update({
    where: { id: existingConfig.id },
    data,
  });
}

/**
 * Kiểm tra cấu hình rate limit
 * @param type Loại rate limit (general hoặc email)
 */
export async function getRateLimitConfig(type = 'general') {
  const config = await getSystemConfig();

  return {
    limit: type === 'email' ? config.emailRateLimit : config.rateLimit,
    window: type === 'email' ? config.emailRateLimitWindow : config.rateLimitWindow,
  };
}

/**
 * Kiểm tra chế độ bảo trì
 */
export async function isMaintenanceModeActive() {
  const config = await getSystemConfig();

  if (!config.isMaintaining) return false;

  const now = new Date();
  return (
    (!config.maintenanceStartTime || now >= config.maintenanceStartTime) &&
    (!config.maintenanceEndTime || now <= config.maintenanceEndTime)
  );
}

/**
 * Lấy cấu hình rate limit cho middleware
 * @param type Loại rate limit
 */
export async function getRateLimitMiddlewareConfig(type = 'general') {
  const { limit, window } = await getRateLimitConfig(type);
  return { max: limit, windowMs: window };
}
