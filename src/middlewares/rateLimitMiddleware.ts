import { Request, Response, NextFunction } from 'express';
import { getRateLimitMiddlewareConfig } from '#services/systemConfigService';
import { sendTooManyRequests } from '#utils/apiResponse';
import { getRedisClient } from '#config/redis';

/**)
 * Tạo middleware giới hạn request
 * @param type Loại rate limit (general, email, v.v.)
 */
export function createRateLimiter(type: string = 'general') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Lấy cấu hình rate limit từ database
      const config = await getRateLimitMiddlewareConfig(type);

      // Khóa được tạo dựa trên IP và loại
      const key = `rate_limit:${type}:${req.ip}`;

      // Tăng số lần request
      const currentCount = (await incrementRequestCount(key, config)) || 0;

      // Kiểm tra vượt quá giới hạn
      if (currentCount > config.max) {
        return sendTooManyRequests(res, 'common.tooManyRequests');
      }

      next();
    } catch (error) {
      console.error(`Rate limit error for ${type}:`, error);
      next();
    }
  };
}

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

/**
 * Tăng số lần request và quản lý expiration
 * @param key Khóa Redis
 * @param config Cấu hình rate limit
 */
async function incrementRequestCount(key: string, config: RateLimitConfig) {
  const redisClient = getRedisClient();

  // Tăng số lần request
  const currentCount = await redisClient?.incr(key);

  // Đặt thời gian hết hạn nếu là request đầu tiên
  if (currentCount === 1) {
    await redisClient?.expire(key, config?.windowMs);
  }

  return currentCount;
}

// Các middleware rate limit được định nghĩa sẵn
export const rateLimiters = {
  // Giới hạn request chung
  general: createRateLimiter('general'),

  // Giới hạn gửi email
  email: createRateLimiter('email'),

  // Các loại rate limit khác
  login: createRateLimiter('login'),
};
