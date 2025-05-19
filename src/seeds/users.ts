import { prisma } from '#src/config/db';
import { hash } from 'bcrypt';
import { Gender, UserStatus } from '@prisma/client';

export const seedUsers = async () => {
  console.log('🌱 Seeding users...');

  const defaultPassword = await hash('password123', 10);

  const users = [
    {
      email: 'admin@example.com',
      firstName: 'System Admin',
      lastName: '',
      password: defaultPassword,
      roleName: 'ADMIN',
      birthday: new Date('2001-01-01'),
      gender: Gender.MALE,
      phoneNumber: '0901234567',
      isEmailVerified: true,
      status: UserStatus.AVAILABLE,
      address: '123 Admin Street, Admin City',
    },
    {
      email: 'kh1@example.com',
      firstName: 'Khách hàng',
      lastName: '1',
      password: defaultPassword,
      roleName: 'USER',
      birthday: new Date('1993-01-01'),
      gender: Gender.MALE,
      phoneNumber: '0901234567',
      isEmailVerified: true,
      status: UserStatus.AVAILABLE,
      address: '456 User Street, User City',
    },
    {
      email: 'driver1@example.com',
      firstName: 'Tài xế',
      lastName: '1',
      password: defaultPassword,
      roleName: 'USER',
      birthday: new Date('2000-01-01'),
      gender: Gender.MALE,
      phoneNumber: '0909876543',
      isEmailVerified: true,
      status: UserStatus.AVAILABLE,
      address: '789 User Avenue, User City',
    },
    {
      email: 'driver2@example.com',
      firstName: 'Tài xế',
      lastName: '2',
      password: defaultPassword,
      roleName: 'MODERATOR',
      birthday: new Date('1999-01-01'),
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
