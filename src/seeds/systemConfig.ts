import { prisma } from '#src/config/db';

export async function seedSystemConfig() {
  try {
    // Xóa dữ liệu cũ nếu muốn
    await prisma.systemConfig.deleteMany();

    // Tạo cấu hình mặc định
    const systemConfig = await prisma.systemConfig.create({
      data: {
        // Cấu hình rate limit
        rateLimit: 100, // 100 request
        rateLimitWindow: 3600, // trong 1 giờ

        // Cấu hình rate limit email
        emailRateLimit: 5, // 5 email
        emailRateLimitWindow: 3600, // trong 1 giờ

        // Cấu hình bảo trì
        isMaintaining: false,

        // Cấu hình đăng nhập
        maxLoginAttempts: 5,
        loginLockDuration: 900, // 15 phút
      },
    });

    console.log('System Config seeded successfully');
    return systemConfig;
  } catch (error) {
    console.error('Error seeding system config:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
