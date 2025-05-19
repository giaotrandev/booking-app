import { prisma } from '#src/config/db';
import { CommonStatus, VehicleStatus } from '@prisma/client';

interface SeatConfigParams {
  totalSeats: number;
  layout: '2+2' | '2+1' | '1+1' | '1+1+1';
  decks?: number;
  seatType: 'STANDARD' | 'BED' | 'PREMIUM' | 'ACCESSIBLE' | 'DRIVER';
  includeDriver?: boolean;
  premiumSeats?: number;
  accessibleSeats?: number;
}

/**
 * Generates a seat configuration for a vehicle type based on the specified layout and seat count.
 * @param params Configuration parameters for the seat layout
 * @returns Seat configuration object with decks, rows, and seats
 */
function generateSeatConfig(params: SeatConfigParams): any {
  const {
    totalSeats,
    layout,
    decks = 1,
    seatType,
    includeDriver = true,
    premiumSeats = 0,
    accessibleSeats = 0,
  } = params;

  const seatsPerDeck = Math.ceil(totalSeats / decks);
  let seatsPerRow: number;
  let aisleCount: number;
  let colsPerRow: number;

  switch (layout) {
    case '2+2':
      seatsPerRow = 4;
      aisleCount = 1;
      colsPerRow = 5; // 2 seats + aisle + 2 seats
      break;
    case '2+1':
      seatsPerRow = 3;
      aisleCount = 1;
      colsPerRow = 4; // 2 seats + aisle + 1 seat
      break;
    case '1+1':
      seatsPerRow = 2;
      aisleCount = 1;
      colsPerRow = 3; // 1 seat + aisle + 1 seat
      break;
    case '1+1+1':
      seatsPerRow = 3;
      aisleCount = 2;
      colsPerRow = 5; // 1 seat + aisle + 1 seat + aisle + 1 seat
      break;
    default:
      throw new Error(`Unsupported layout: ${layout}`);
  }

  const rowsPerDeck = Math.ceil(seatsPerDeck / seatsPerRow);
  let premiumCount = 0;
  let accessibleCount = 0;

  const seatConfig = {
    decks: Array(decks)
      .fill(null)
      .map((_, deckIndex) => ({
        deckId: deckIndex === 0 ? 'lower' : 'upper',
        name: deckIndex === 0 ? 'Lower Deck' : 'Upper Deck',
        rows: Array(rowsPerDeck)
          .fill(null)
          .map((_, rowIndex) => {
            const rowId = String.fromCharCode(65 + rowIndex); // A, B, C, ...
            const seats = [];

            if (layout === '1+1+1') {
              // 1+1+1: Left seat, aisle, middle seat, aisle, right seat
              let seatTypeForPosition = seatType;
              if (premiumCount < premiumSeats && rowIndex < 2 && deckIndex === 0) {
                seatTypeForPosition = 'PREMIUM';
                premiumCount++;
              } else if (accessibleCount < accessibleSeats && rowIndex === rowsPerDeck - 1) {
                seatTypeForPosition = 'ACCESSIBLE';
                accessibleCount++;
              }

              seats.push({
                number: `${deckIndex === 1 ? 'U' : ''}${rowId}1`,
                exists: true,
                type: seatTypeForPosition,
                position: 'window',
                x: 0,
                y: rowIndex,
              });
              seats.push({
                number: null,
                exists: false,
                type: null,
                position: 'aisle',
                x: 1,
                y: rowIndex,
              });
              seats.push({
                number: `${deckIndex === 1 ? 'U' : ''}${rowId}2`,
                exists: true,
                type: seatTypeForPosition,
                position: 'middle',
                x: 2,
                y: rowIndex,
              });
              seats.push({
                number: null,
                exists: false,
                type: null,
                position: 'aisle',
                x: 3,
                y: rowIndex,
              });
              seats.push({
                number: `${deckIndex === 1 ? 'U' : ''}${rowId}3`,
                exists: true,
                type: seatTypeForPosition,
                position: 'window',
                x: 4,
                y: rowIndex,
              });
            } else {
              // Other layouts (2+2, 2+1, 1+1)
              const seatsPerSide = layout === '2+2' ? 2 : layout === '2+1' ? 2 : 1;
              const rightSeats = layout === '2+1' ? 1 : seatsPerSide;

              // Left side seats
              for (let col = 1; col <= seatsPerSide; col++) {
                let seatTypeForPosition = seatType;
                if (premiumCount < premiumSeats && rowIndex < 2 && deckIndex === 0) {
                  seatTypeForPosition = 'PREMIUM';
                  premiumCount++;
                } else if (accessibleCount < accessibleSeats && rowIndex === rowsPerDeck - 1) {
                  seatTypeForPosition = 'ACCESSIBLE';
                  accessibleCount++;
                }
                seats.push({
                  number: `${deckIndex === 1 ? 'U' : ''}${rowId}${col}`,
                  exists: true,
                  type: seatTypeForPosition,
                  position: col === 1 ? 'window' : 'aisle',
                  x: col - 1,
                  y: rowIndex,
                });
              }

              // Aisle
              seats.push({
                number: null,
                exists: false,
                type: null,
                position: 'aisle',
                x: seatsPerSide,
                y: rowIndex,
              });

              // Right side seats
              for (let col = 1; col <= rightSeats; col++) {
                let seatTypeForPosition = seatType;
                if (premiumCount < premiumSeats && rowIndex < 2 && deckIndex === 0) {
                  seatTypeForPosition = 'PREMIUM';
                  premiumCount++;
                } else if (accessibleCount < accessibleSeats && rowIndex === rowsPerDeck - 1) {
                  seatTypeForPosition = 'ACCESSIBLE';
                  accessibleCount++;
                }
                seats.push({
                  number: `${deckIndex === 1 ? 'U' : ''}${rowId}${col + seatsPerSide}`,
                  exists: true,
                  type: seatTypeForPosition,
                  position: col === 1 ? 'aisle' : 'window',
                  x: col + seatsPerSide,
                  y: rowIndex,
                });
              }
            }

            return { rowId, seats };
          }),
      })),
  };

  // Add driver seat to first deck, first row
  if (includeDriver) {
    seatConfig.decks[0].rows[0].seats[0] = {
      number: 'A1',
      exists: true,
      type: 'DRIVER',
      position: 'window',
      x: 0,
      y: 0,
    };
  }

  return seatConfig;
}
export const seedVehicleTypes = async () => {
  console.log('🌱 Seeding vehicle types...');

  const vehicleTypes = [
    {
      name: 'Xe 16 chỗ ngồi',
      description: 'Xe khách cỡ nhỏ, ghế ngồi tiêu chuẩn, phù hợp cho đoàn nhỏ hoặc gia đình',
      seatConfiguration: generateSeatConfig({
        totalSeats: 16,
        layout: '2+2',
        seatType: 'STANDARD',
        includeDriver: true,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe 29 chỗ ngồi',
      description: 'Xe khách cỡ trung, ghế ngồi tiêu chuẩn, phù hợp cho đoàn trung bình',
      seatConfiguration: generateSeatConfig({
        totalSeats: 29,
        layout: '2+2',
        seatType: 'STANDARD',
        includeDriver: true,
        premiumSeats: 4,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe 45 chỗ ngồi',
      description: 'Xe khách cỡ lớn, ghế ngồi tiêu chuẩn, phù hợp cho đoàn lớn hoặc tour du lịch',
      seatConfiguration: generateSeatConfig({
        totalSeats: 45,
        layout: '2+2',
        seatType: 'STANDARD',
        includeDriver: true,
        premiumSeats: 8,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Limousine 9 chỗ ngồi VIP',
      description: 'Xe sang trọng, ghế ngồi cao cấp, phù hợp cho dịch vụ VIP hoặc chuyến đi sang trọng',
      seatConfiguration: generateSeatConfig({
        totalSeats: 9,
        layout: '2+1',
        seatType: 'PREMIUM',
        includeDriver: true,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe giường nằm 22 chỗ',
      description: 'Xe khách giường nằm thoải mái, phù hợp cho chuyến đi dài',
      seatConfiguration: generateSeatConfig({
        totalSeats: 22,
        layout: '1+1',
        seatType: 'BED',
        includeDriver: true,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe giường nằm đôi 40 chỗ',
      description: 'Xe khách giường nằm 2 tầng, phù hợp cho chuyến đi xuyên tỉnh dài ngày',
      seatConfiguration: generateSeatConfig({
        totalSeats: 40,
        layout: '2+2',
        decks: 2,
        seatType: 'BED',
        includeDriver: true,
        premiumSeats: 4,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe 34 chỗ ngồi',
      description: 'Xe khách cỡ trung, ghế ngồi tiêu chuẩn, phù hợp cho các chuyến đi trung và dài',
      seatConfiguration: generateSeatConfig({
        totalSeats: 34,
        layout: '2+2',
        seatType: 'STANDARD',
        includeDriver: true,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe limousine 22 chỗ ngồi',
      description: 'Xe limousine cao cấp với ghế rộng, phù hợp cho dịch vụ VIP hoặc đoàn nhỏ',
      seatConfiguration: generateSeatConfig({
        totalSeats: 22,
        layout: '2+1',
        seatType: 'PREMIUM',
        includeDriver: true,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe giường nằm 34 chỗ',
      description: 'Xe khách giường nằm với bố trí 1+1+1, phù hợp cho các chuyến đi dài thoải mái',
      seatConfiguration: generateSeatConfig({
        totalSeats: 34,
        layout: '1+1+1',
        seatType: 'BED',
        includeDriver: true,
        premiumSeats: 2,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe giường nằm đôi 48 chỗ',
      description: 'Xe khách giường nằm 2 tầng cỡ lớn, lý tưởng cho các chuyến đi dài ngày',
      seatConfiguration: generateSeatConfig({
        totalSeats: 48,
        layout: '2+2',
        decks: 2,
        seatType: 'BED',
        includeDriver: true,
        premiumSeats: 6,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe 29 chỗ ngồi (Wheelchair-Accessible)',
      description: 'Xe khách cỡ trung với không gian dành cho xe lăn, phù hợp cho hành khách khuyết tật',
      seatConfiguration: generateSeatConfig({
        totalSeats: 29,
        layout: '2+2',
        seatType: 'STANDARD',
        includeDriver: true,
      }),
      status: CommonStatus.ACTIVE,
    },
    {
      name: 'Xe 50 chỗ ngồi',
      description: 'Xe khách cỡ lớn cho tour du lịch, ghế ngồi tiêu chuẩn với hàng ghế cao cấp phía trước',
      seatConfiguration: generateSeatConfig({
        totalSeats: 50,
        layout: '2+2',
        seatType: 'STANDARD',
        includeDriver: true,
        premiumSeats: 8,
      }),
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
