import { prisma } from '#src/config/db';

export async function seedRolesAndPermissions() {
  try {
    // Create Permissions
    const permissions = await Promise.all([
      // User Permissions
      prisma.permission.create({
        data: {
          code: 'USER_READ_SELF',
          name: 'Read Own Profile',
          description: 'Can read own user profile',
        },
      }),
      prisma.permission.create({
        data: {
          code: 'USER_UPDATE_SELF',
          name: 'Update Own Profile',
          description: 'Can update own user profile',
        },
      }),

      // Booking Permissions
      prisma.permission.create({
        data: {
          code: 'BOOKING_CREATE',
          name: 'Create Booking',
          description: 'Can create a new booking',
        },
      }),
      prisma.permission.create({
        data: {
          code: 'BOOKING_READ_SELF',
          name: 'Read Own Bookings',
          description: 'Can read own bookings',
        },
      }),

      // Admin Permissions
      prisma.permission.create({
        data: {
          code: 'ADMIN_USER_MANAGE',
          name: 'Manage Users',
          description: 'Can create, update, delete users',
        },
      }),
      prisma.permission.create({
        data: {
          code: 'ADMIN_BUS_MANAGE',
          name: 'Manage Buses',
          description: 'Can create, update, delete buses',
        },
      }),
    ]);

    // Create Roles with Permissions
    const userRole = await prisma.role.create({
      data: {
        name: 'USER',
        description: 'Standard user with basic booking capabilities',
        permissionIds: permissions
          .filter((p) => ['USER_READ_SELF', 'USER_UPDATE_SELF', 'BOOKING_CREATE', 'BOOKING_READ_SELF'].includes(p.code))
          .map((p) => p.id),
      },
    });

    const adminRole = await prisma.role.create({
      data: {
        name: 'ADMIN',
        description: 'Administrator with full system access',
        permissionIds: permissions.map((p) => p.id),
      },
    });

    console.log('Roles and Permissions seeded successfully');
    return { userRole, adminRole, permissions };
  } catch (error) {
    console.error('Error seeding roles and permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
