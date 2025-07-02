// import { Server, Socket } from 'socket.io';
// import { prisma } from '#config/db';
// import { BookingStatus, SeatStatus } from '@prisma/client';
// import { getSocketIOInstance, setSocketIOInstance } from './bookingControllerSocketInterface';

// // Keep track of temporary seat reservations
// interface SeatReservation {
//   userId: string;
//   tripId: string;
//   seatId: string;
//   expireAt: Date;
//   sessionId?: string;
// }

// // In-memory store for temporary seat reservations (in production, use Redis)
// const reservations: SeatReservation[] = [];

// /**
//  * Initialize Socket.IO connection handlers
//  */
// export const initializeSocketConnection = (io: Server): void => {
//   // Store the io instance for later use
//   setSocketIOInstance(io);

//   io.on('connection', (socket: Socket) => {
//     console.log('New client connected:', socket.id);

//     // Join trip room to receive real-time updates
//     socket.on('joinTripRoom', (tripId: string) => {
//       socket.join(`trip:${tripId}`);
//       console.log(`Client ${socket.id} joined trip room: ${tripId}`);

//       // Send current seat statuses to the newly joined client
//       sendCurrentSeatStatuses(socket, tripId);
//     });

//     // Leave trip room
//     socket.on('leaveTripRoom', (tripId: string) => {
//       socket.leave(`trip:${tripId}`);
//       console.log(`Client ${socket.id} left trip room: ${tripId}`);
//     });

//     // Handle seat selection
//     socket.on('selectSeat', async (data: { tripId: string; seatId: string; userId: string; sessionId?: string }) => {
//       try {
//         const { tripId, seatId, userId, sessionId } = data;

//         // Get config
//         const config = await getBookingConfig();

//         // Check if seat exists and get current status
//         const seat = await prisma.seat.findUnique({
//           where: { id: seatId },
//         });

//         if (!seat) {
//           socket.emit('seatSelectionError', {
//             seatId,
//             error: 'Seat not found',
//           });
//           return;
//         }

//         // Check if seat is available for selection
//         if (seat.status !== SeatStatus.AVAILABLE) {
//           let errorMessage = '';
//           switch (seat.status) {
//             case SeatStatus.BOOKED:
//               errorMessage = 'Seat is already booked';
//               break;
//             case SeatStatus.RESERVED:
//               errorMessage = 'Seat is currently reserved by another user';
//               break;
//             case SeatStatus.BLOCKED:
//               errorMessage = 'Seat is blocked and not available';
//               break;
//             default:
//               errorMessage = 'Seat is not available for selection';
//           }

//           socket.emit('seatSelectionError', {
//             seatId,
//             error: errorMessage,
//           });
//           return;
//         }

//         // Check if user has reached maximum seats
//         const userReservations = reservations.filter((r) => r.userId === userId && r.tripId === tripId);

//         if (userReservations.length >= config.maxSeatsPerBooking) {
//           socket.emit('seatSelectionError', {
//             seatId,
//             error: `Maximum of ${config.maxSeatsPerBooking} seats per booking exceeded`,
//           });
//           return;
//         }

//         // Check if seat is already reserved by this user
//         const existingReservation = reservations.find(
//           (r) => r.seatId === seatId && r.userId === userId && r.tripId === tripId
//         );

//         if (existingReservation) {
//           socket.emit('seatSelectionError', {
//             seatId,
//             error: 'You have already reserved this seat',
//           });
//           return;
//         }

//         // Calculate expiration (default 15 minutes from now)
//         const expireAt = new Date();
//         expireAt.setMinutes(expireAt.getMinutes() + config.paymentTimeoutMinutes);

//         // Add to reservations
//         const newReservation: SeatReservation = {
//           userId,
//           tripId,
//           seatId,
//           expireAt,
//           sessionId,
//         };

//         reservations.push(newReservation);

//         console.log('New reservation added:', newReservation);
//         console.log('Total reservations:', reservations.length);

//         // Update seat status to reserved in database
//         await prisma.seat.update({
//           where: { id: seatId },
//           data: { status: SeatStatus.RESERVED },
//         });

//         console.log(`Seat ${seatId} status updated to RESERVED in database`);

//         // Notify all clients in the trip room about the status change
//         io.to(`trip:${tripId}`).emit('seatStatusChanged', {
//           seatId,
//           status: SeatStatus.RESERVED,
//           reservedBy: userId,
//           sessionId,
//           expireAt: expireAt.toISOString(),
//         });

//         // Respond to the requester with confirmation
//         socket.emit('seatSelectionConfirmed', {
//           seatId,
//           expireAt: expireAt.toISOString(),
//         });

//         console.log(`Seat selection confirmed for user ${userId}, seat ${seatId}`);
//       } catch (error) {
//         console.error('Error in seat selection:', error);
//         socket.emit('seatSelectionError', {
//           seatId: data.seatId,
//           error: 'Failed to select seat, please try again',
//         });
//       }
//     });

//     // Release seat if user cancels selection
//     socket.on('releaseSeat', async (data: { tripId: string; seatId: string; userId: string }) => {
//       try {
//         const { tripId, seatId, userId } = data;

//         // Find reservation
//         const reservationIndex = reservations.findIndex(
//           (r) => r.seatId === seatId && r.userId === userId && r.tripId === tripId
//         );

//         if (reservationIndex === -1) {
//           socket.emit('seatReleaseError', {
//             seatId,
//             error: 'No reservation found for this seat',
//           });
//           return;
//         }

//         // Check current seat status
//         const seat = await prisma.seat.findUnique({
//           where: { id: seatId },
//         });

//         if (!seat) {
//           socket.emit('seatReleaseError', {
//             seatId,
//             error: 'Seat not found',
//           });
//           return;
//         }

//         // Only allow release if seat is currently reserved
//         if (seat.status !== SeatStatus.RESERVED) {
//           socket.emit('seatReleaseError', {
//             seatId,
//             error: 'Seat is not in reserved status',
//           });
//           return;
//         }

//         // Remove from reservations
//         reservations.splice(reservationIndex, 1);

//         // Update seat status back to available in database
//         await prisma.seat.update({
//           where: { id: seatId },
//           data: { status: SeatStatus.AVAILABLE },
//         });

//         console.log(`Seat ${seatId} released by user ${userId}`);

//         // Notify all clients in the trip room about the status change
//         io.to(`trip:${tripId}`).emit('seatStatusChanged', {
//           seatId,
//           status: SeatStatus.AVAILABLE,
//         });

//         // Respond to the requester with confirmation
//         socket.emit('seatReleased', { seatId });
//       } catch (error) {
//         console.error('Error releasing seat:', error);
//         socket.emit('seatReleaseError', {
//           seatId: data.seatId,
//           error: 'Failed to release seat',
//         });
//       }
//     });

//     // Join booking room
//     socket.on('joinBookingRoom', (bookingId: string) => {
//       socket.join(`booking:${bookingId}`);
//       console.log(`Client joined booking room: ${bookingId}`);
//     });

//     // Leave booking room
//     socket.on('leaveBookingRoom', (bookingId: string) => {
//       socket.leave(`booking:${bookingId}`);
//       console.log(`Client left booking room: ${bookingId}`);
//     });

//     // Disconnect event
//     socket.on('disconnect', () => {
//       console.log('Client disconnected:', socket.id);
//       // Optional: Release any seats reserved by this socket/user
//       // This would require tracking socket.id to userId mapping
//     });
//   });

//   // Setup periodic cleanup of expired reservations
//   setInterval(async () => {
//     try {
//       const now = new Date();
//       const expiredReservations = reservations.filter((r) => r.expireAt <= now);

//       if (expiredReservations.length > 0) {
//         console.log(`Cleaning up ${expiredReservations.length} expired reservations`);
//       }

//       for (const reservation of expiredReservations) {
//         try {
//           // Check current seat status before updating
//           const seat = await prisma.seat.findUnique({
//             where: { id: reservation.seatId },
//           });

//           // Only update if seat is still reserved (not booked in the meantime)
//           if (seat && seat.status === SeatStatus.RESERVED) {
//             // Update seat status back to available
//             await prisma.seat.update({
//               where: { id: reservation.seatId },
//               data: { status: SeatStatus.AVAILABLE },
//             });

//             // Notify all clients in the trip room
//             io.to(`trip:${reservation.tripId}`).emit('seatStatusChanged', {
//               seatId: reservation.seatId,
//               status: SeatStatus.AVAILABLE,
//               reason: 'expired',
//             });

//             console.log(`Expired reservation cleaned up: seat ${reservation.seatId}, user ${reservation.userId}`);
//           }

//           // Remove from reservations array
//           const index = reservations.findIndex(
//             (r) => r.seatId === reservation.seatId && r.userId === reservation.userId && r.tripId === reservation.tripId
//           );

//           if (index !== -1) {
//             reservations.splice(index, 1);
//           }
//         } catch (seatError) {
//           console.error(`Error cleaning up expired reservation for seat ${reservation.seatId}:`, seatError);
//         }
//       }
//     } catch (error) {
//       console.error('Error in reservation cleanup task:', error);
//     }
//   }, 60000); // Run every minute

//   // Optional: More frequent check for reservations about to expire (for warnings)
//   setInterval(async () => {
//     try {
//       const now = new Date();
//       const warningTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now

//       const aboutToExpire = reservations.filter((r) => r.expireAt <= warningTime && r.expireAt > now);

//       for (const reservation of aboutToExpire) {
//         io.to(`trip:${reservation.tripId}`).emit('seatExpirationWarning', {
//           seatId: reservation.seatId,
//           userId: reservation.userId,
//           expireAt: reservation.expireAt.toISOString(),
//           remainingTime: Math.max(0, Math.floor((reservation.expireAt.getTime() - now.getTime()) / 1000)),
//         });
//       }
//     } catch (error) {
//       console.error('Error in expiration warning task:', error);
//     }
//   }, 30000); // Run every 30 seconds
// };

// /**
//  * Send current seat statuses to a newly connected client
//  */
// async function sendCurrentSeatStatuses(socket: Socket, tripId: string) {
//   try {
//     const seats = await prisma.seat.findMany({
//       where: {
//         tripId,
//         isDeleted: false,
//       },
//       select: {
//         id: true,
//         status: true,
//         seatNumber: true,
//       },
//     });

//     // Send current statuses
//     for (const seat of seats) {
//       socket.emit('seatStatusChanged', {
//         seatId: seat.id,
//         status: seat.status,
//         seatNumber: seat.seatNumber,
//       });
//     }

//     // Send reservation info for reserved seats
//     const tripReservations = reservations.filter((r) => r.tripId === tripId);
//     for (const reservation of tripReservations) {
//       socket.emit('seatStatusChanged', {
//         seatId: reservation.seatId,
//         status: SeatStatus.RESERVED,
//         reservedBy: reservation.userId,
//         sessionId: reservation.sessionId,
//         expireAt: reservation.expireAt.toISOString(),
//       });
//     }
//   } catch (error) {
//     console.error('Error sending current seat statuses:', error);
//   }
// }

// /**
//  * Get current system config for booking settings
//  */
// async function getBookingConfig() {
//   const systemConfig = await prisma.systemConfig.findFirst({
//     where: { status: 'ACTIVE' },
//   });

//   const MAX_SEATS_PER_BOOKING = process.env.MAX_SEATS_PER_BOOKING ? parseInt(process.env.MAX_SEATS_PER_BOOKING) : 5;
//   const PAYMENT_TIMEOUT_MINUTES = process.env.PAYMENT_TIMEOUT_MINUTES
//     ? parseInt(process.env.PAYMENT_TIMEOUT_MINUTES)
//     : 15;

//   return {
//     maxSeatsPerBooking: MAX_SEATS_PER_BOOKING,
//     paymentTimeoutMinutes: PAYMENT_TIMEOUT_MINUTES,
//     ...systemConfig,
//   };
// }

// /**
//  * Public functions for external use
//  */

// /**
//  * Update seat status and notify all clients
//  */
// export const updateSeatStatus = async (tripId: string, seatId: string, status: SeatStatus, userId?: string) => {
//   try {
//     // Update in database
//     await prisma.seat.update({
//       where: { id: seatId },
//       data: { status },
//     });

//     // Get socket.io instance
//     const io = getSocketIOInstance();

//     if (io) {
//       // Remove from reservations if seat is now booked or blocked
//       if (status === SeatStatus.BOOKED || status === SeatStatus.BLOCKED) {
//         const reservationIndex = reservations.findIndex((r) => r.seatId === seatId);
//         if (reservationIndex !== -1) {
//           reservations.splice(reservationIndex, 1);
//         }
//       }

//       // Notify all clients in the trip room
//       io.to(`trip:${tripId}`).emit('seatStatusChanged', {
//         seatId,
//         status,
//         updatedBy: userId,
//       });
//     }

//     console.log(`Seat ${seatId} status updated to ${status}`);
//   } catch (error) {
//     console.error('Error updating seat status:', error);
//     throw error;
//   }
// };

// /**
//  * Get current reservations for a trip
//  */
// export const getTripReservations = (tripId: string): SeatReservation[] => {
//   return reservations.filter((r) => r.tripId === tripId);
// };

// /**
//  * Clear expired reservations manually
//  */
// export const clearExpiredReservations = async (): Promise<void> => {
//   const now = new Date();
//   const expiredReservations = reservations.filter((r) => r.expireAt <= now);

//   for (const reservation of expiredReservations) {
//     try {
//       await prisma.seat.update({
//         where: { id: reservation.seatId },
//         data: { status: SeatStatus.AVAILABLE },
//       });

//       const index = reservations.findIndex((r) => r.seatId === reservation.seatId && r.userId === reservation.userId);

//       if (index !== -1) {
//         reservations.splice(index, 1);
//       }
//     } catch (error) {
//       console.error('Error clearing expired reservation:', error);
//     }
//   }
// };

// /**
//  * Broadcast booking status changes with detailed information
//  */
// export const broadcastBookingStatus = async (bookingId: string, status: BookingStatus) => {
//   const io = getSocketIOInstance();
//   if (io) {
//     try {
//       // Fetch booking details to include in the broadcast
//       const booking = await prisma.booking.findUnique({
//         where: { id: bookingId },
//         include: {
//           bookingTrips: {
//             include: {
//               seats: {
//                 select: {
//                   seatNumber: true,
//                 },
//               },
//             },
//           },
//         },
//       });

//       if (!booking) {
//         console.error(`Booking ${bookingId} not found for broadcast`);
//         return;
//       }

//       // Prepare seat numbers
//       const seatNumbers = booking.bookingTrips.flatMap((trip) => trip.seats.map((seat) => seat.seatNumber)).join(', ');

//       // Broadcast detailed event
//       io.to(`booking:${bookingId}`).emit('bookingStatusChanged', {
//         bookingId,
//         status,
//         finalPrice: booking.finalPrice,
//         seatNumbers,
//         updatedAt: new Date().toISOString(),
//       });

//       console.log(`Broadcasted booking status change: ${bookingId} -> ${status}`);
//     } catch (error) {
//       console.error(`Error broadcasting booking status for ${bookingId}:`, error);
//     }
//   }
// };

import { Server, Socket } from 'socket.io';
import { prisma } from '#config/db';
import { BookingStatus, SeatStatus } from '@prisma/client';
import { getSocketIOInstance, setSocketIOInstance } from './bookingControllerSocketInterface';
import { createRoomName } from '#services/socketService';

// Định nghĩa interface cho Socket với thuộc tính xác thực
interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    status: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  isAuthenticated?: boolean;
}

// Định nghĩa interface cho SeatReservation
interface SeatReservation {
  userId: string;
  tripId: string;
  seatId: string;
  expireAt: Date;
  sessionId?: string;
}

// Định nghĩa interface cho BookingConfig
interface BookingConfig {
  maxSeatsPerBooking: number;
  paymentTimeoutMinutes: number;
  [key: string]: any;
}

// Định nghĩa interface cho các response của event
interface SeatSelectionResponse {
  seatId: string;
  expireAt?: string;
  error?: string;
}

interface SeatReleaseResponse {
  seatId: string;
  error?: string;
}

interface SeatStatusChanged {
  seatId: string;
  status: SeatStatus;
  seatNumber?: string;
  reservedBy?: string;
  sessionId?: string;
  expireAt?: string;
  reason?: string;
  updatedBy?: string;
}

// In-memory store for temporary seat reservations (in production, use Redis)
const reservations: SeatReservation[] = [];

/**
 * Initialize Socket.IO connection handlers
 */
export const initializeSocketConnection = (io: Server): void => {
  setSocketIOInstance(io);

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`New client connected: ${socket.id} (authenticated: ${socket.isAuthenticated})`);

    // Join public trip room
    socket.on('joinTripRoom', (tripId: string, callback: (response: { success: boolean; error?: string }) => void) => {
      const roomName = createRoomName.publicTrip(tripId);
      socket.join(roomName);
      console.log(`Client ${socket.id} joined public trip room: ${roomName}`);
      sendCurrentSeatStatuses(socket, tripId);
      callback({ success: true });
    });

    // Leave public trip room
    socket.on('leaveTripRoom', (tripId: string, callback: (response: { success: boolean; error?: string }) => void) => {
      const roomName = createRoomName.publicTrip(tripId);
      socket.leave(roomName);
      console.log(`Client ${socket.id} left public trip room: ${roomName}`);
      callback({ success: true });
    });

    // Handle seat selection (public event)
    socket.on(
      'selectSeat',
      async (
        data: { tripId: string; seatId: string; userId: string; sessionId?: string },
        callback: (response: SeatSelectionResponse) => void
      ) => {
        try {
          const { tripId, seatId, userId, sessionId } = data;
          const config = await getBookingConfig();

          const seat = await prisma.seat.findUnique({
            where: { id: seatId },
          });

          if (!seat) {
            callback({ seatId, error: 'Seat not found' });
            return;
          }

          if (seat.status !== SeatStatus.AVAILABLE) {
            let errorMessage = '';
            switch (seat.status) {
              case SeatStatus.BOOKED:
                errorMessage = 'Seat is already booked';
                break;
              case SeatStatus.RESERVED:
                errorMessage = 'Seat is currently reserved by another user';
                break;
              case SeatStatus.BLOCKED:
                errorMessage = 'Seat is blocked and not available';
                break;
              default:
                errorMessage = 'Seat is not available for selection';
            }
            callback({ seatId, error: errorMessage });
            return;
          }

          const userReservations = reservations.filter((r) => r.userId === userId && r.tripId === tripId);
          if (userReservations.length >= config.maxSeatsPerBooking) {
            callback({
              seatId,
              error: `Maximum of ${config.maxSeatsPerBooking} seats per booking exceeded`,
            });
            return;
          }

          const existingReservation = reservations.find(
            (r) => r.seatId === seatId && r.userId === userId && r.tripId === tripId
          );
          if (existingReservation) {
            callback({ seatId, error: 'You have already reserved this seat' });
            return;
          }

          const expireAt = new Date();
          expireAt.setMinutes(expireAt.getMinutes() + config.paymentTimeoutMinutes);

          const newReservation: SeatReservation = {
            userId,
            tripId,
            seatId,
            expireAt,
            sessionId,
          };
          reservations.push(newReservation);

          console.log('New reservation added:', newReservation);
          console.log('Total reservations:', reservations.length);

          await prisma.seat.update({
            where: { id: seatId },
            data: { status: SeatStatus.RESERVED },
          });

          console.log(`Seat ${seatId} status updated to RESERVED in database`);

          const roomName = createRoomName.publicTrip(tripId);
          io.to(roomName).emit('seatStatusChanged', {
            seatId,
            status: SeatStatus.RESERVED,
            reservedBy: userId,
            sessionId,
            expireAt: expireAt.toISOString(),
          });

          callback({
            seatId,
            expireAt: expireAt.toISOString(),
          });

          console.log(`Seat selection confirmed for user ${userId}, seat ${seatId}`);
        } catch (error) {
          console.error('Error in seat selection:', error);
          callback({
            seatId: data.seatId,
            error: 'Failed to select seat, please try again',
          });
        }
      }
    );

    // Release seat (public event)
    socket.on(
      'releaseSeat',
      async (
        data: { tripId: string; seatId: string; userId: string },
        callback: (response: SeatReleaseResponse) => void
      ) => {
        try {
          const { tripId, seatId, userId } = data;

          const reservationIndex = reservations.findIndex(
            (r) => r.seatId === seatId && r.userId === userId && r.tripId === tripId
          );

          if (reservationIndex === -1) {
            callback({ seatId, error: 'No reservation found for this seat' });
            return;
          }

          const seat = await prisma.seat.findUnique({
            where: { id: seatId },
          });

          if (!seat) {
            callback({ seatId, error: 'Seat not found' });
            return;
          }

          if (seat.status !== SeatStatus.RESERVED) {
            callback({ seatId, error: 'Seat is not in reserved status' });
            return;
          }

          reservations.splice(reservationIndex, 1);

          await prisma.seat.update({
            where: { id: seatId },
            data: { status: SeatStatus.AVAILABLE },
          });

          console.log(`Seat ${seatId} released by user ${userId}`);

          const roomName = createRoomName.publicTrip(tripId);
          io.to(roomName).emit('seatStatusChanged', {
            seatId,
            status: SeatStatus.AVAILABLE,
          });

          callback({ seatId });
        } catch (error) {
          console.error('Error releasing seat:', error);
          callback({
            seatId: data.seatId,
            error: 'Failed to release seat',
          });
        }
      }
    );

    // Join public booking room
    socket.on(
      'joinBookingRoom',
      (bookingId: string, callback: (response: { success: boolean; error?: string }) => void) => {
        const roomName = createRoomName.publicBooking(bookingId);
        socket.join(roomName);
        console.log(`Client ${socket.id} joined public booking room: ${roomName}`);
        callback({ success: true });
      }
    );

    // Leave public booking room
    socket.on(
      'leaveBookingRoom',
      (bookingId: string, callback: (response: { success: boolean; error?: string }) => void) => {
        const roomName = createRoomName.publicBooking(bookingId);
        socket.leave(roomName);
        console.log(`Client ${socket.id} left public booking room: ${roomName}`);
        callback({ success: true });
      }
    );

    // Ví dụ về private event (yêu cầu xác thực)
    socket.on(
      'sendPrivateMessage',
      async (
        data: { tripId: string; message: string },
        callback: (response: { success: boolean; error?: string }) => void
      ) => {
        if (!socket.isAuthenticated) {
          callback({ success: false, error: 'Authentication required' });
          return;
        }

        try {
          const { tripId, message } = data;
          const roomName = createRoomName.privateChatTrip(tripId);
          io.to(roomName).emit('privateMessage', {
            userId: socket.userId,
            message,
            timestamp: new Date().toISOString(),
          });
          callback({ success: true });
        } catch (error) {
          console.error('Error sending private message:', error);
          callback({ success: false, error: 'Failed to send message' });
        }
      }
    );

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Cleanup expired reservations
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredReservations = reservations.filter((r) => r.expireAt <= now);

      if (expiredReservations.length > 0) {
        console.log(`Cleaning up ${expiredReservations.length} expired reservations`);
      }

      for (const reservation of expiredReservations) {
        try {
          const seat = await prisma.seat.findUnique({
            where: { id: reservation.seatId },
          });

          if (seat && seat.status === SeatStatus.RESERVED) {
            await prisma.seat.update({
              where: { id: reservation.seatId },
              data: { status: SeatStatus.AVAILABLE },
            });

            const roomName = createRoomName.publicTrip(reservation.tripId);
            io.to(roomName).emit('seatStatusChanged', {
              seatId: reservation.seatId,
              status: SeatStatus.AVAILABLE,
              reason: 'expired',
            });

            console.log(`Expired reservation cleaned up: seat ${reservation.seatId}, user ${reservation.userId}`);
          }

          const index = reservations.findIndex(
            (r) => r.seatId === reservation.seatId && r.userId === reservation.userId && r.tripId === reservation.tripId
          );

          if (index !== -1) {
            reservations.splice(index, 1);
          }
        } catch (seatError) {
          console.error(`Error cleaning up expired reservation for seat ${reservation.seatId}:`, seatError);
        }
      }
    } catch (error) {
      console.error('Error in reservation cleanup task:', error);
    }
  }, 60000);

  // Check for reservations about to expire
  setInterval(async () => {
    try {
      const now = new Date();
      const warningTime = new Date(now.getTime() + 2 * 60 * 1000);

      const aboutToExpire = reservations.filter((r) => r.expireAt <= warningTime && r.expireAt > now);

      for (const reservation of aboutToExpire) {
        const roomName = createRoomName.publicTrip(reservation.tripId);
        io.to(roomName).emit('seatExpirationWarning', {
          seatId: reservation.seatId,
          userId: reservation.userId,
          expireAt: reservation.expireAt.toISOString(),
          remainingTime: Math.max(0, Math.floor((reservation.expireAt.getTime() - now.getTime()) / 1000)),
        });
      }
    } catch (error) {
      console.error('Error in expiration warning task:', error);
    }
  }, 30000);
};

/**
 * Send current seat statuses to a newly connected client
 */
async function sendCurrentSeatStatuses(socket: Socket, tripId: string): Promise<void> {
  try {
    const seats = await prisma.seat.findMany({
      where: {
        tripId,
        isDeleted: false,
      },
      select: {
        id: true,
        status: true,
        seatNumber: true,
      },
    });

    for (const seat of seats) {
      socket.emit('seatStatusChanged', {
        seatId: seat.id,
        status: seat.status,
        seatNumber: seat.seatNumber,
      });
    }

    const tripReservations = reservations.filter((r) => r.tripId === tripId);
    for (const reservation of tripReservations) {
      socket.emit('seatStatusChanged', {
        seatId: reservation.seatId,
        status: SeatStatus.RESERVED,
        reservedBy: reservation.userId,
        sessionId: reservation.sessionId,
        expireAt: reservation.expireAt.toISOString(),
      });
    }
  } catch (error) {
    console.error('Error sending current seat statuses:', error);
  }
}

/**
 * Get current system config for booking settings
 */
async function getBookingConfig(): Promise<BookingConfig> {
  const systemConfig = await prisma.systemConfig.findFirst({
    where: { status: 'ACTIVE' },
  });

  const MAX_SEATS_PER_BOOKING = process.env.MAX_SEATS_PER_BOOKING ? parseInt(process.env.MAX_SEATS_PER_BOOKING) : 5;
  const PAYMENT_TIMEOUT_MINUTES = process.env.PAYMENT_TIMEOUT_MINUTES
    ? parseInt(process.env.PAYMENT_TIMEOUT_MINUTES)
    : 15;

  return {
    maxSeatsPerBooking: MAX_SEATS_PER_BOOKING,
    paymentTimeoutMinutes: PAYMENT_TIMEOUT_MINUTES,
    ...systemConfig,
  };
}

/**
 * Public functions for external use
 */
export const updateSeatStatus = async (
  tripId: string,
  seatId: string,
  status: SeatStatus,
  userId?: string
): Promise<void> => {
  try {
    await prisma.seat.update({
      where: { id: seatId },
      data: { status },
    });

    const io = getSocketIOInstance();
    if (io) {
      if (status === SeatStatus.BOOKED || status === SeatStatus.BLOCKED) {
        const reservationIndex = reservations.findIndex((r) => r.seatId === seatId);
        if (reservationIndex !== -1) {
          reservations.splice(reservationIndex, 1);
        }
      }

      const roomName = createRoomName.publicTrip(tripId);
      io.to(roomName).emit('seatStatusChanged', {
        seatId,
        status,
        updatedBy: userId,
      });
    }

    console.log(`Seat ${seatId} status updated to ${status}`);
  } catch (error) {
    console.error('Error updating seat status:', error);
    throw error;
  }
};

export const getTripReservations = (tripId: string): SeatReservation[] => {
  return reservations.filter((r) => r.tripId === tripId);
};

export const clearExpiredReservations = async (): Promise<void> => {
  const now = new Date();
  const expiredReservations = reservations.filter((r) => r.expireAt <= now);

  for (const reservation of expiredReservations) {
    try {
      await prisma.seat.update({
        where: { id: reservation.seatId },
        data: { status: SeatStatus.AVAILABLE },
      });

      const index = reservations.findIndex(
        (r) => r.seatId === reservation.seatId && r.userId === reservation.userId && r.tripId === reservation.tripId
      );

      if (index !== -1) {
        reservations.splice(index, 1);
      }
    } catch (error) {
      console.error('Error clearing expired reservation:', error);
    }
  }
};

export const broadcastBookingStatus = async (bookingId: string, status: BookingStatus): Promise<void> => {
  const io = getSocketIOInstance();
  if (io) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          bookingTrips: {
            include: {
              seats: {
                select: {
                  seatNumber: true,
                },
              },
            },
          },
        },
      });

      if (!booking) {
        console.error(`Booking ${bookingId} not found for broadcast`);
        return;
      }

      const seatNumbers = booking.bookingTrips.flatMap((trip) => trip.seats.map((seat) => seat.seatNumber)).join(', ');
      const roomName = createRoomName.publicBooking(bookingId);

      io.to(roomName).emit('bookingStatusChanged', {
        bookingId,
        status,
        finalPrice: booking.finalPrice,
        seatNumbers,
        updatedAt: new Date().toISOString(),
      });

      console.log(`Broadcasted booking status change: ${bookingId} -> ${status}`);
    } catch (error) {
      console.error(`Error broadcasting booking status for ${bookingId}:`, error);
    }
  }
};
