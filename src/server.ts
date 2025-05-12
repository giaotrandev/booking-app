import 'module-alias/register';
import moduleAliases from './module-alias';
require('module-alias').addAliases(moduleAliases);

import http from 'http';
import app from './app';
import { connectDB, prisma } from '#config/db';
import { setupScheduledTasks } from '#services/scheduledTasks';
import { initRedisCache, initRedisQueue } from '#config/redis';
import { initializeQueues, setupQueueProcessors, setupMemoryMonitoring } from '#queues/index';
import { setupPostScheduler } from '#services/posts/scheduledService';
import { seedProvinceCityWard } from './seeds/provinceCityWard';
import seedUsers from './seeds/users';
import seedBusStops from './seeds/busStop';
import { seedVehicles, seedVehicleTypes } from './seeds/vehicles';
import seedRoutesAndRouteStops from './seeds/routes';
import { initializeSocketIO } from '#services/socketService';

const port = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = initializeSocketIO(server);

// Attach Socket.IO instance to app for use in routes if needed
(app as any).io = io;

// Setup scheduled tasks
setupScheduledTasks();

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Socket.IO server initialized`);
});

// initRedisCache();
// initRedisQueue();

// Seed data when needed
// Uncomment these when you need to seed data
// seedSystemConfig();
// seedRolesAndPermissions();
// seedUsers();
// seedProvinceCityWard();
// seedBusStops();
// seedVehicleTypes();
// seedVehicles();
// seedRoutesAndRouteStops();

const initializeServices = async () => {
  try {
    // Kết nối cơ sở dữ liệu
    await connectDB();

    // Kết nối Redis và đợi kết nối thành công
    const [cacheClient, queueClient] = await Promise.all([initRedisCache(), initRedisQueue()]);

    if (!cacheClient || !queueClient) {
      throw new Error('Failed to initialize Redis services');
    }

    // Khởi tạo và đợi các services khác
    await Promise.all([
      new Promise<void>((resolve) => {
        initializeQueues();
        setupMemoryMonitoring();
        setupQueueProcessors();
        setupPostScheduler();
        resolve();
      }),
    ]);

    // Chỉ log khi tất cả đã hoàn thành
    console.log('\n===========================================');
    console.log('🚀 All systems initialized successfully!');
    console.log('===========================================\n');
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    process.exit(1);
  }
};

initializeServices();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.log(`Error: ${err.message}`);
  prisma.$disconnect(); // Disconnect Prisma
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
