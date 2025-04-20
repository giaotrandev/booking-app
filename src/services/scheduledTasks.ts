import cron from 'node-cron';
import User from '#models/userModel';

/**
 * Hàm xóa các user chưa xác thực và đã hết hạn
 */
export const cleanupUnverifiedUsers = async (): Promise<void> => {
  try {
    const result = await User.deleteMany({
      isEmailVerified: false,
      emailVerificationExpire: { $lt: Date.now() },
    });

    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} unverified users`);
    }
  } catch (error) {
    console.error('Error cleaning up unverified users:', error);
  }
};

/**
 * Thiết lập schedule task
 * Chạy mỗi 5 phút để xóa các user chưa xác thực và đã hết hạn
 */
export const setupScheduledTasks = (): void => {
  // Chạy mỗi 5 phút
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running scheduled task: Cleanup unverified users');
    await cleanupUnverifiedUsers();
  });
};
