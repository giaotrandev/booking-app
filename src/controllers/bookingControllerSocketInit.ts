import { Server, Socket } from 'socket.io';
import { prisma } from '#config/db';
import { SeatStatus } from '@prisma/client';
import { setSocketIOInstance } from './bookingControllerSocketInterface';

// Keep track of temporary seat reservations
interface SeatReservation {
  userId: string;
  tripId: string;
  seatId: string;
  expireAt: Date;
}

// In-memory store for temporary seat reservations (in production, use Redis)
const reservations: SeatReservation[] = [];

/**
 * Initialize Socket.IO connection handlers
 */
export const initializeSocketConnection = (io: Server): void => {
  // Store the io instance for later use
  setSocketIOInstance(io);

  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    // Join trip room to receive real-time updates
    socket.on('joinTripRoom', (tripId: string) => {
      socket.join(`trip:${tripId}`);
      console.log(`Client ${socket.id} joined trip room: ${tripId}`);
    });

    // Leave trip room
    socket.on('leaveTripRoom', (tripId: string) => {
      socket.leave(`trip:${tripId}`);
      console.log(`Client ${socket.id} left trip room: ${tripId}`);
    });

    // Handle seat selection
    socket.on('selectSeat', async (data: { tripId: string; seatId: string; userId: string; sessionId: string }) => {
      try {
        const { tripId, seatId, userId, sessionId } = data;

        // Get config
        const config = await getBookingConfig();

        // Check if seat is available
        const seat = await prisma.seat.findUnique({
          where: { id: seatId },
        });

        if (!seat || seat.status !== SeatStatus.AVAILABLE) {
          socket.emit('seatSelectionError', {
            seatId,
            error: 'Seat is not available',
          });
          return;
        }

        // Check if user has reached maximum seats
        const userReservations = reservations.filter((r) => r.userId === userId && r.tripId === tripId);

        if (userReservations.length >= config.maxSeatsPerBooking) {
          socket.emit('seatSelectionError', {
            seatId,
            error: `Maximum of ${config.maxSeatsPerBooking} seats per booking`,
          });
          return;
        }

        // Calculate expiration (default 15 minutes from now)
        const expireAt = new Date();
        expireAt.setMinutes(expireAt.getMinutes() + 15);

        // Add to reservations
        reservations.push({
          userId,
          tripId,
          seatId,
          expireAt,
        });

        // Update seat status to reserved
        await prisma.seat.update({
          where: { id: seatId },
          data: { status: SeatStatus.RESERVED },
        });

        // Notify all clients in the trip room
        io.to(`trip:${tripId}`).emit('seatStatusChanged', {
          seatId,
          status: SeatStatus.RESERVED,
          reservedBy: userId,
          sessionId,
        });

        // Respond to the requester
        socket.emit('seatSelectionConfirmed', { seatId });
      } catch (error) {
        console.error('Error in seat selection:', error);
        socket.emit('seatSelectionError', {
          error: 'Failed to select seat, please try again',
        });
      }
    });

    // Release seat if user cancels selection
    socket.on('releaseSeat', async (data: { tripId: string; seatId: string; userId: string }) => {
      try {
        const { tripId, seatId, userId } = data;

        // Find reservation
        const reservationIndex = reservations.findIndex((r) => r.seatId === seatId && r.userId === userId);

        if (reservationIndex !== -1) {
          // Remove from reservations
          reservations.splice(reservationIndex, 1);

          // Update seat status back to available
          await prisma.seat.update({
            where: { id: seatId },
            data: { status: SeatStatus.AVAILABLE },
          });

          // Notify all clients in the trip room
          io.to(`trip:${tripId}`).emit('seatStatusChanged', {
            seatId,
            status: SeatStatus.AVAILABLE,
          });

          socket.emit('seatReleased', { seatId });
        }
      } catch (error) {
        console.error('Error releasing seat:', error);
        socket.emit('seatReleaseError', {
          error: 'Failed to release seat',
        });
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Setup periodic cleanup of expired reservations
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredReservations = reservations.filter((r) => r.expireAt < now);

      for (const reservation of expiredReservations) {
        // Update seat status back to available
        await prisma.seat.update({
          where: { id: reservation.seatId },
          data: { status: SeatStatus.AVAILABLE },
        });

        // Notify all clients in the trip room
        io.to(`trip:${reservation.tripId}`).emit('seatStatusChanged', {
          seatId: reservation.seatId,
          status: SeatStatus.AVAILABLE,
        });

        // Remove from reservations array
        const index = reservations.findIndex((r) => r.seatId === reservation.seatId && r.userId === reservation.userId);

        if (index !== -1) {
          reservations.splice(index, 1);
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
    }
  }, 60000); // Run every minute
};

/**
 * Get current system config for booking settings
 */
async function getBookingConfig() {
  const systemConfig = await prisma.systemConfig.findFirst({
    where: { status: 'ACTIVE' },
  });

  const MAX_SEATS_PER_BOOKING = process.env.MAX_SEATS_PER_BOOKING ? parseInt(process.env.MAX_SEATS_PER_BOOKING) : 5;

  return {
    maxSeatsPerBooking: MAX_SEATS_PER_BOOKING,
    paymentTimeoutMinutes: 15,
    ...systemConfig,
  };
}
