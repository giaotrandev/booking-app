import { prisma } from '#src/config/db';
import { SeatType, SeatStatus } from '@prisma/client';

export const seedSeats = async () => {
  console.log('🌱 Seeding seats...');

  try {
    const tripId = '6822e17be29951b9424a63b2';

    // Xóa tất cả seats khác
    const deletedSeats = await prisma.seat.deleteMany({
      where: {
        tripId,
      },
    });

    console.log(`Deleted ${deletedSeats.count} seats, kept 2 seats`);

    // Kiểm tra trip có tồn tại không
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: {
          include: {
            vehicleType: true,
          },
        },
      },
    });

    if (!trip) {
      throw new Error(`Trip with ID ${tripId} not found`);
    }

    if (!trip.vehicle?.vehicleType?.seatConfiguration) {
      throw new Error('Vehicle type seat configuration not found');
    }

    const seatConfig = trip.vehicle.vehicleType.seatConfiguration as any;
    const seats = [];

    // Duyệt qua từng deck (trong trường hợp này chỉ có lower deck)
    for (const deck of seatConfig.decks) {
      // Duyệt qua từng row, bỏ qua hàng đầu tiên (index 0)
      for (let i = 1; i < deck.rows.length; i++) {
        const row = deck.rows[i];
        // Duyệt qua từng seat trong row
        for (const seat of row.seats) {
          // Map seat type từ VehicleType sang Prisma enum
          let seatType: SeatType;
          switch (seat.type) {
            case 'PREMIUM':
              seatType = SeatType.PREMIUM;
              break;
            case 'BED':
              seatType = SeatType.BED;
              break;
            case 'STANDARD':
            default:
              seatType = SeatType.STANDARD;
              break;
          }

          seats.push({
            tripId: tripId,
            seatNumber: seat.number,
            seatType: seatType,
            status: SeatStatus.AVAILABLE,
            isDeleted: false,
          });
        }
      }
    }

    // Xóa seats cũ của trip này (nếu có)
    // await prisma.seat.deleteMany({
    //   where: { tripId: tripId },
    // });

    // Tạo seats mới
    const createdSeats = await prisma.seat.createMany({
      data: seats,
      //   skipDuplicates: true,
    });

    console.log(`✅ Successfully seeded ${createdSeats.count} seats for trip ${tripId}`);

    // Log thống kê theo loại ghế
    const seatStats = seats.reduce(
      (acc, seat) => {
        acc[seat.seatType] = (acc[seat.seatType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('📊 Seat statistics:');
    Object.entries(seatStats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} seats`);
    });

    return createdSeats;
  } catch (error) {
    console.error('❌ Error seeding seats:', error);
    throw error;
  }
};
