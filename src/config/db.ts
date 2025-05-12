import { PrismaClient } from '@prisma/client';
import { seedRolesAndPermissions } from '#src/seeds/rolePermission';
// import { PrismaClient } from '@prisma/client/edge';

const prisma = new PrismaClient();

const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✓ Prisma connected to MongoDB successfully');
  } catch (error) {
    console.error(`Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
};
// Run the seed script
// seedRolesAndPermissions();

export { prisma, connectDB };
