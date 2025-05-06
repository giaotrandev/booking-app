import { prisma } from '#src/config/db';
import { hash } from 'bcrypt';
import { Gender, UserStatus } from '@prisma/client';

export const seedUsers = async () => {
  console.log('🌱 Seeding users...');

  const defaultPassword = await hash('password123', 10);

  const users = [
    {
      email: 'admin@example.com',
      name: 'System Admin',
      password: defaultPassword,
      roleName: 'ADMIN',
      age: 30,
      gender: Gender.MALE,
      phoneNumber: '0901234567',
      isEmailVerified: true,
      status: UserStatus.AVAILABLE,
      address: '123 Admin Street, Admin City',
    },
    {
      email: 'kh1@example.com',
      name: 'Khách hàng 1',
      password: defaultPassword,
      roleName: 'USER',
      age: 30,
      gender: Gender.MALE,
      phoneNumber: '0901234567',
      isEmailVerified: true,
      status: UserStatus.AVAILABLE,
      address: '456 User Street, User City',
    },
    {
      email: 'driver1@example.com',
      name: 'Tài xế 1',
      password: defaultPassword,
      roleName: 'USER',
      age: 25,
      gender: Gender.MALE,
      phoneNumber: '0909876543',
      isEmailVerified: true,
      status: UserStatus.AVAILABLE,
      address: '789 User Avenue, User City',
    },
    {
      email: 'driver2@example.com',
      name: 'Tài xế 2',
      password: defaultPassword,
      roleName: 'MODERATOR',
      age: 28,
      gender: Gender.MALE,
      phoneNumber: '0905555555',
      isEmailVerified: true,
      status: UserStatus.AVAILABLE,
      address: '321 Mod Road, Mod City',
    },
  ];

  try {
    const createdUsers = await Promise.all(
      users.map((user) =>
        prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: user,
        })
      )
    );

    console.log(`✅ Successfully seeded ${createdUsers.length} users`);
    return createdUsers;
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

export default seedUsers;
