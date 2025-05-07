import 'module-alias/register';
import http from 'http';
import app from './app';
import { connectDB, prisma } from '#config/db';
import { initSocket } from '#services/socketService';
import { setupScheduledTasks } from '#services/scheduledTasks';
import { initRedis } from '#config/redis';
import { seedProvinceCityWard } from './seeds/provinceCityWard';
import seedUsers from './seeds/users';
import seedBusStops from './seeds/busStop';
import { seedVehicleTypes } from './seeds/vehicles';
import seedRoutesAndRouteStops from './seeds/routes';

// Connect to MongoDB
connectDB();

const port = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Setup scheduled tasks
setupScheduledTasks();

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

initRedis();

// Seed data
// seedSystemConfig();
// seedRolesAndPermissions();
// seedUsers();
// seedProvinceCityWard();
// seedBusStops();
// seedVehicleTypes();
// seedRoutesAndRouteStops();

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
