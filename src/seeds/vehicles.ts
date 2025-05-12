import { prisma } from '#src/config/db';
import { CommonStatus, VehicleStatus } from '@prisma/client';

export const seedVehicleTypes = async () => {
  console.log('🌱 Seeding vehicle types...');

  const vehicleTypes = [
    {
      name: 'Xe 16 chỗ ngồi',
      description: 'Xe khách cỡ nhỏ, ghế ngồi tiêu chuẩn, phù hợp cho đoàn nhỏ hoặc gia đình',
      seatConfiguration: {
        rows: 4,
        columns: 4,
        seatType: 'NGỒi',
        seats: [
          { id: 'A1', name: 'A1', type: 'DRIVER', seatType: 'NGỒi' },
          { id: 'A2', name: 'A2', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'A3', name: 'A3', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'A4', name: 'A4', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'B1', name: 'B1', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'B2', name: 'B2', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'B3', name: 'B3', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'B4', name: 'B4', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'C1', name: 'C1', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'C2', name: 'C2', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'C3', name: 'C3', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'C4', name: 'C4', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'D1', name: 'D1', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'D2', name: 'D2', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'D3', name: 'D3', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'D4', name: 'D4', type: 'PASSENGER', seatType: 'NGỒi' },
        ],
      },
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe 29 chỗ ngồi',
      description: 'Xe khách cỡ trung, ghế ngồi tiêu chuẩn, phù hợp cho đoàn trung bình',
      seatConfiguration: {
        rows: 8,
        columns: 4,
        seatType: 'NGỒi',
        seats: Array(29)
          .fill(null)
          .map((_, index) => {
            if (index === 0) {
              return { id: 'A1', name: 'A1', type: 'DRIVER', seatType: 'NGỒi' };
            }
            const row = Math.floor((index - 1) / 4) + 1;
            const col = ((index - 1) % 4) + 1;
            const rowChar = String.fromCharCode(64 + row); // A, B, C, ...
            const id = `${rowChar}${col}`;
            return { id, name: id, type: 'PASSENGER', seatType: 'NGỒi' };
          }),
      },
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe 45 chỗ ngồi',
      description: 'Xe khách cỡ lớn, ghế ngồi tiêu chuẩn, phù hợp cho đoàn lớn hoặc tour du lịch',
      seatConfiguration: {
        rows: 12,
        columns: 4,
        seatType: 'NGỒi',
        seats: Array(45)
          .fill(null)
          .map((_, index) => {
            if (index === 0) {
              return { id: 'A1', name: 'A1', type: 'DRIVER', seatType: 'NGỒi' };
            }
            const row = Math.floor((index - 1) / 4) + 1;
            const col = ((index - 1) % 4) + 1;
            const rowChar = String.fromCharCode(64 + row); // A, B, C, ...
            const id = `${rowChar}${col}`;
            return { id, name: id, type: 'PASSENGER', seatType: 'NGỒi' };
          }),
      },
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Limousine 9 chỗ ngồi VIP',
      description: 'Xe sang trọng, ghế ngồi cao cấp, phù hợp cho dịch vụ VIP hoặc chuyến đi sang trọng',
      seatConfiguration: {
        rows: 3,
        columns: 3,
        seatType: 'NGỒi',
        seats: [
          { id: 'A1', name: 'A1', type: 'DRIVER', seatType: 'NGỒi' },
          { id: 'A2', name: 'A2', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'A3', name: 'A3', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'B1', name: 'B1', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'B2', name: 'B2', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'B3', name: 'B3', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'C1', name: 'C1', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'C2', name: 'C2', type: 'PASSENGER', seatType: 'NGỒi' },
          { id: 'C3', name: 'C3', type: 'PASSENGER', seatType: 'NGỒi' },
        ],
      },
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe giường nằm 22 chỗ',
      description: 'Xe khách giường nằm thoải mái, phù hợp cho chuyến đi dài',
      seatConfiguration: {
        rows: 11,
        columns: 2,
        seatType: 'NẰM',
        seats: [
          { id: 'A1', name: 'A1', type: 'DRIVER', seatType: 'NGỒi' },
          { id: 'A2', name: 'A2', type: 'PASSENGER', seatType: 'NGỒi' },
          ...Array(20)
            .fill(null)
            .map((_, index) => {
              const row = Math.floor(index / 2) + 2; // Start from B row
              const col = (index % 2) + 1;
              const rowChar = String.fromCharCode(64 + row); // B, C, ...
              const id = `${rowChar}${col}`;
              return { id, name: id, type: 'PASSENGER', seatType: 'NẰM' };
            }),
        ],
      },
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe giường nằm đôi 40 chỗ',
      description: 'Xe khách giường nằm 2 tầng, phù hợp cho chuyến đi xuyên tỉnh dài ngày',
      seatConfiguration: {
        rows: 10,
        columns: 4,
        seatType: 'NẰM',
        tiers: 2,
        seats: [
          { id: 'A1', name: 'A1', type: 'DRIVER', seatType: 'NGỒi', tier: 1 },
          { id: 'A2', name: 'A2', type: 'PASSENGER', seatType: 'NGỒi', tier: 1 },
          ...Array(38)
            .fill(null)
            .map((_, index) => {
              const tier = index < 19 ? 1 : 2;
              const tierIndex = index < 19 ? index : index - 19;
              const row = Math.floor(tierIndex / 4) + (tier === 1 ? 2 : 1); // Lower tier starts from B, upper from A
              const col = (tierIndex % 4) + 1;
              const rowChar = String.fromCharCode(64 + row);
              const id = `${tier === 2 ? 'U' : ''}${rowChar}${col}`; // Prefix U for upper tier
              return {
                id,
                name: id,
                type: 'PASSENGER',
                seatType: 'NẰM',
                tier: tier,
              };
            }),
        ],
      },
      status: CommonStatus.ACTIVE,
    },
  ];

  try {
    const createdVehicleTypes = await Promise.all(
      vehicleTypes.map(async (vehicleType) =>
        prisma.vehicleType.upsert({
          where: { name: vehicleType.name },
          update: {},
          create: {
            ...vehicleType,
            histories: {
              create: [
                {
                  //   action: 'CREATE',
                  changedFields: Object.keys(vehicleType),
                  changedBy: (await prisma.user.findUnique({ where: { email: 'anguynvn99@gmail.com' } }))?.id!!,
                  changeReason: 'Initial creation',
                  createdAt: new Date(),
                },
              ],
            },
          },
        })
      )
    );

    console.log(`✅ Successfully seeded ${createdVehicleTypes.length} vehicle types`);
    return createdVehicleTypes;
  } catch (error) {
    console.error('❌ Error seeding vehicle types:', error);
    throw error;
  }
};

export const seedVehicles = async () => {
  console.log('🌱 Seeding vehicles...');

  // Get drivers from seeded users
  const driver1 = await prisma.user.findUnique({ where: { email: 'driver1@example.com' } });
  const driver2 = await prisma.user.findUnique({ where: { email: 'driver2@example.com' } });

  // Get vehicle types
  const vehicleTypes = await prisma.vehicleType.findMany();

  const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });

  // Generate future expiry dates
  const getExpiryDate = (monthsAhead: any) => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthsAhead);
    return date;
  };

  const vehicles = [
    {
      plateNumber: '51A-12345',
      registrationCode: 'REG-001-2025',
      vehicleTypeId: vehicleTypes.find((vt) => vt.name === 'Xe 16 chỗ ngồi')?.id,
      driverId: driver1?.id,
      registrationExpiryDate: getExpiryDate(12),
      status: VehicleStatus.ACTIVE,
    },
    {
      plateNumber: '51B-67890',
      registrationCode: 'REG-002-2025',
      vehicleTypeId: vehicleTypes.find((vt) => vt.name === 'Xe 29 chỗ ngồi')?.id,
      driverId: driver2?.id,
      registrationExpiryDate: getExpiryDate(18),
      status: VehicleStatus.ACTIVE,
    },
    {
      plateNumber: '51C-11223',
      registrationCode: 'REG-003-2025',
      vehicleTypeId: vehicleTypes.find((vt) => vt.name === 'Xe 45 chỗ ngồi')?.id,
      driverId: null, // No driver assigned yet
      registrationExpiryDate: getExpiryDate(24),
      status: VehicleStatus.IDLE,
    },
    {
      plateNumber: '51D-44556',
      registrationCode: 'REG-004-2025',
      vehicleTypeId: vehicleTypes.find((vt) => vt.name === 'Limousine 9 chỗ ngồi VIP')?.id,
      driverId: driver1?.id,
      registrationExpiryDate: getExpiryDate(12),
      status: VehicleStatus.ACTIVE,
    },
    {
      plateNumber: '51E-77889',
      registrationCode: 'REG-005-2025',
      vehicleTypeId: vehicleTypes.find((vt) => vt.name === 'Xe giường nằm 22 chỗ')?.id,
      driverId: driver2?.id,
      registrationExpiryDate: getExpiryDate(9),
      status: VehicleStatus.ACTIVE,
    },
    {
      plateNumber: '51F-99001',
      registrationCode: 'REG-006-2025',
      vehicleTypeId: vehicleTypes.find((vt) => vt.name === 'Xe giường nằm đôi 40 chỗ')?.id,
      driverId: null, // No driver assigned yet
      registrationExpiryDate: getExpiryDate(15),
      status: VehicleStatus.MAINTENANCE,
    },
  ];

  try {
    const createdVehicles = await Promise.all(
      vehicles
        .filter((vehicle) => vehicle.vehicleTypeId)
        .map((vehicle) =>
          prisma.vehicle.upsert({
            where: { plateNumber: vehicle.plateNumber },
            update: {},
            create: {
              plateNumber: vehicle.plateNumber,
              registrationCode: vehicle.registrationCode,
              vehicleTypeId: vehicle.vehicleTypeId!,
              driverId: vehicle.driverId ?? null,
              registrationExpiryDate: vehicle.registrationExpiryDate,
              status: vehicle.status,
              histories: {
                create: {
                  // action: 'CREATE',
                  changedFields: Object.keys(vehicle),
                  changedBy: admin?.id!!,
                  changeReason: 'Initial vehicle registration',
                  createdAt: new Date(),
                },
              },
            },
          })
        )
    );

    console.log(`✅ Successfully seeded ${createdVehicles.length} vehicles`);
    return createdVehicles;
  } catch (error) {
    console.error('❌ Error seeding vehicles:', error);
    throw error;
  }
};

export default async function seedVehiclesData() {
  try {
    // Seed in sequence to ensure dependencies are met
    // await seedVehicleTypes();
    await seedVehicles();

    console.log('✅ All vehicle data seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding vehicle data:', error);
    throw error;
  }
}
