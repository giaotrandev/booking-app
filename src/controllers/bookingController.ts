import { Request, Response } from 'express';
import { prisma } from '#config/db';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError, sendForbidden } from '#utils/apiResponse';
import { BookingStatus, PaymentStatus, SeatStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { getSignedUrlForFile } from '#services/r2Service';
import axios from 'axios';
import { Socket, Server } from 'socket.io';

// Keep track of temporary seat reservations
interface SeatReservation {
  userId: string;
  tripId: string;
  seatId: string;
  expireAt: Date;
}

// In-memory store for temporary seat reservations (in production, use Redis)
const reservations: SeatReservation[] = [];

// Maximum number of seats per booking
const MAX_SEATS_PER_BOOKING = process.env.MAX_SEATS_PER_BOOKING ? parseInt(process.env.MAX_SEATS_PER_BOOKING) : 5;

// Default payment timeout in minutes (can be overridden from system config)
const DEFAULT_PAYMENT_TIMEOUT = 15;

/**
 * Get current system config for booking settings
 */
async function getBookingConfig() {
  const systemConfig = await prisma.systemConfig.findFirst({
    where: { status: 'ACTIVE' },
  });

  return {
    maxSeatsPerBooking: MAX_SEATS_PER_BOOKING,
    paymentTimeoutMinutes: DEFAULT_PAYMENT_TIMEOUT,
    ...systemConfig,
  };
}

/**
 * Initialize Socket.IO connection
 */
export const initializeSocketConnection = (io: Server) => {
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
 * Create a new booking
 */
export const createBooking = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  const userId = (req.user as { userId: string }).userId;

  try {
    const { tripId, seatIds, voucherCode, customerNotes } = req.body;

    if (!tripId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      sendBadRequest(res, 'booking.missingRequiredFields', null, language);
      return;
    }

    // Get config
    const config = await getBookingConfig();

    // Validate max seats per booking
    if (seatIds.length > config.maxSeatsPerBooking) {
      sendBadRequest(res, 'booking.tooManySeats', { maxSeats: config.maxSeatsPerBooking }, language);
      return;
    }

    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    // Check if trip status is valid for booking
    if (trip.status !== 'SCHEDULED') {
      sendBadRequest(res, 'booking.invalidTripStatus', null, language);
      return;
    }

    // Check if selected seats exist and are available
    const seats = await prisma.seat.findMany({
      where: {
        id: { in: seatIds },
        tripId,
      },
    });

    if (seats.length !== seatIds.length) {
      sendBadRequest(res, 'booking.invalidSeats', null, language);
      return;
    }

    const unavailableSeats = seats.filter(
      (seat) => seat.status !== SeatStatus.AVAILABLE && seat.status !== SeatStatus.RESERVED
    );

    if (unavailableSeats.length > 0) {
      sendBadRequest(res, 'booking.seatsNotAvailable', { seats: unavailableSeats.map((s) => s.seatNumber) }, language);
      return;
    }

    // Calculate pricing
    let totalPrice = trip.basePrice * seats.length;
    let discountAmount = 0;

    // Process voucher if provided
    let voucher = null;
    if (voucherCode) {
      voucher = await prisma.voucher.findUnique({
        where: {
          code: voucherCode,
          status: 'ACTIVE',
          isDeleted: false,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      if (!voucher) {
        sendBadRequest(res, 'voucher.invalid', null, language);
        return;
      }

      // Check if voucher usage limit is reached
      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        sendBadRequest(res, 'voucher.limitReached', null, language);
        return;
      }

      // Check per-user limit
      if (voucher.perUserLimit) {
        const userUsageCount = await prisma.voucherUsage.count({
          where: {
            voucherId: voucher.id,
            userId,
          },
        });

        if (userUsageCount >= voucher.perUserLimit) {
          sendBadRequest(res, 'voucher.userLimitReached', null, language);
          return;
        }
      }

      // Check route compatibility
      if (
        voucher.applicableRoutes &&
        voucher.applicableRoutes.length > 0 &&
        !voucher.applicableRoutes.includes(trip.routeId)
      ) {
        sendBadRequest(res, 'voucher.notApplicableForRoute', null, language);
        return;
      }

      // Calculate discount
      if (voucher.discountType === 'PERCENTAGE') {
        discountAmount = (totalPrice * voucher.discountValue) / 100;

        // Apply max discount cap if exists
        if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
          discountAmount = voucher.maxDiscountAmount;
        }
      } else {
        // Fixed amount discount
        discountAmount = voucher.discountValue;
      }

      // Check minimum order value
      if (voucher.minOrderValue && totalPrice < voucher.minOrderValue) {
        sendBadRequest(res, 'voucher.minOrderNotMet', { minOrder: voucher.minOrderValue }, language);
        return;
      }
    }

    // Calculate final price
    const finalPrice = totalPrice - discountAmount;

    // Create booking in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create booking
      const booking = await tx.booking.create({
        data: {
          userId,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          totalPrice,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          finalPrice,
          customerNotes: customerNotes || null,
        },
      });

      // Create booking trip
      const bookingTrip = await tx.bookingTrip.create({
        data: {
          bookingId: booking.id,
          tripId,
        },
      });

      // Update seat status and link to booking trip
      for (const seatId of seatIds) {
        await tx.seat.update({
          where: { id: seatId },
          data: {
            status: SeatStatus.RESERVED,
            bookingTripId: bookingTrip.id,
          },
        });

        // Remove from temporary reservations if exists
        const reservationIndex = reservations.findIndex((r) => r.seatId === seatId && r.userId === userId);

        if (reservationIndex !== -1) {
          reservations.splice(reservationIndex, 1);
        }
      }

      // Create voucher usage if voucher applied
      if (voucher) {
        await tx.voucherUsage.create({
          data: {
            voucherId: voucher.id,
            userId,
            bookingId: booking.id,
            discountAmount,
          },
        });

        // Increment voucher usage count
        await tx.voucher.update({
          where: { id: voucher.id },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      // Create booking history
      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          changedFields: {},
          changedBy: userId,
          changeReason: 'Booking created',
        },
      });

      // Calculate payment expiration time
      const paymentExpiration = new Date();
      paymentExpiration.setMinutes(paymentExpiration.getMinutes() + config.paymentTimeoutMinutes);

      // Generate QR code for payment
      const qrCodeData = await generatePaymentQRCode(booking.id, finalPrice, userId);

      // Update booking with QR code
      return await tx.booking.update({
        where: { id: booking.id },
        data: {
          qrCode: qrCodeData,
          qrCodeExpiresAt: paymentExpiration,
        },
        include: {
          bookingTrips: {
            include: {
              trip: {
                include: {
                  route: true,
                },
              },
              seats: true,
            },
          },
          voucherUsage: {
            include: {
              voucher: true,
            },
          },
        },
      });
    });

    // Schedule automatic cancellation if not paid
    scheduleBookingCancellation(result.id, config.paymentTimeoutMinutes);

    sendSuccess(res, 'booking.created', result, language);
  } catch (error) {
    console.error('Error creating booking:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Generate QR code for payment using VietQR
 */
async function generatePaymentQRCode(bookingId: string, amount: number, userId: string): Promise<string> {
  try {
    // Get user info for the payment description
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Create payment reference
    const paymentRef = `BKG${bookingId.substring(0, 8)}`;

    // Set up VietQR parameters (replace with actual VietQR API details)
    const vietQRParams = {
      accountNo: process.env.PAYMENT_ACCOUNT_NUMBER || '0123456789',
      accountName: process.env.PAYMENT_ACCOUNT_NAME || 'COMPANY NAME',
      acqId: process.env.PAYMENT_BANK_ID || '970436', // Default to TCB (Techcombank)
      amount: Math.round(amount),
      addInfo: `Thanh toan dat ve ${paymentRef} ${user?.name || 'Customer'}`,
      format: 'text',
    };

    // In a real implementation, call VietQR API here
    // For this example, we'll just create a mock QR code text
    const qrCodeText = `vietqr_${vietQRParams.acqId}_${vietQRParams.accountNo}_${vietQRParams.amount}_${paymentRef}`;

    // Register this payment with the SePay webhook service (in a real impl)
    await registerPaymentWebhook(bookingId, paymentRef, amount);

    return qrCodeText;
  } catch (error) {
    console.error('Error generating payment QR code:', error);
    // Return a fallback QR code on error
    return `fallback_payment_${bookingId}`;
  }
}

/**
 * Register payment with SePay webhook service
 */
async function registerPaymentWebhook(bookingId: string, paymentRef: string, amount: number): Promise<void> {
  try {
    // In a real implementation, make an API call to SePay service
    // For this example, we'll just update the booking with the webhook reference

    // Create unique reference for SePay
    const webhookRef = `SEPAY_${paymentRef}_${Date.now()}`;

    // Update booking with webhook reference
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentWebhookReference: webhookRef,
      },
    });

    console.log(`Registered payment webhook for booking ${bookingId} with reference ${webhookRef}`);
  } catch (error) {
    console.error('Error registering payment webhook:', error);
  }
}

/**
 * Schedule automatic cancellation for unpaid bookings
 */
function scheduleBookingCancellation(bookingId: string, timeoutMinutes: number): void {
  setTimeout(
    async () => {
      try {
        // Check if booking still exists and is unpaid
        const booking = await prisma.booking.findUnique({
          where: {
            id: bookingId,
            paymentStatus: PaymentStatus.PENDING,
            status: BookingStatus.PENDING,
          },
          include: {
            bookingTrips: {
              include: {
                seats: true,
              },
            },
          },
        });

        if (!booking) {
          return; // Booking already processed or deleted
        }

        // Cancel booking in transaction
        await prisma.$transaction(async (tx) => {
          // Update booking status
          await tx.booking.update({
            where: { id: bookingId },
            data: {
              status: BookingStatus.CANCELLED,
            },
          });

          // Release seats
          for (const bookingTrip of booking.bookingTrips) {
            for (const seat of bookingTrip.seats) {
              await tx.seat.update({
                where: { id: seat.id },
                data: {
                  status: SeatStatus.AVAILABLE,
                  bookingTripId: null,
                },
              });
            }
          }

          // Create history record
          await tx.bookingHistory.create({
            data: {
              bookingId,
              changedFields: {
                status: { from: booking.status, to: BookingStatus.CANCELLED },
              },
              changedBy: booking.userId,
              changeReason: 'Automatically cancelled due to payment timeout',
            },
          });
        });

        console.log(`Booking ${bookingId} automatically cancelled due to payment timeout`);
      } catch (error) {
        console.error(`Error cancelling booking ${bookingId}:`, error);
      }
    },
    timeoutMinutes * 60 * 1000
  );
}

/**
 * SePay payment webhook handler
 */
export const handlePaymentWebhook = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  try {
    const { reference, status, amount, transactionId } = req.body;

    // Basic validation
    if (!reference || !status) {
      return sendBadRequest(res, 'payment.invalidWebhookPayload', null, language);
    }

    // Find booking by webhook reference
    const booking = await prisma.booking.findFirst({
      where: {
        paymentWebhookReference: reference,
      },
      include: {
        bookingTrips: {
          include: {
            seats: true,
          },
        },
      },
    });

    if (!booking) {
      return sendNotFound(res, 'booking.notFound', null, language);
    }

    // Process based on payment status
    if (status === 'COMPLETED' || status === 'SUCCESS') {
      // Verify amount matches (with small tolerance for fees)
      const amountDiff = Math.abs(booking.finalPrice - parseFloat(amount));
      const isAmountValid = amountDiff <= 1000; // Allow 1000 VND difference

      if (!isAmountValid) {
        console.warn(`Payment amount mismatch: expected ${booking.finalPrice}, got ${amount}`);
        // Still proceed but log the discrepancy
      }

      // Update booking in transaction
      await prisma.$transaction(async (tx) => {
        // Update booking status
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: PaymentStatus.COMPLETED,
            status: BookingStatus.CONFIRMED,
          },
        });

        // Update seat status to booked
        for (const bookingTrip of booking.bookingTrips) {
          for (const seat of bookingTrip.seats) {
            await tx.seat.update({
              where: { id: seat.id },
              data: {
                status: SeatStatus.BOOKED,
              },
            });
          }
        }

        // Create history record
        await tx.bookingHistory.create({
          data: {
            bookingId: booking.id,
            changedFields: {
              paymentStatus: { from: booking.paymentStatus, to: PaymentStatus.COMPLETED },
              status: { from: booking.status, to: BookingStatus.CONFIRMED },
            },
            changedBy: booking.userId,
            changeReason: `Payment completed via SePay. Transaction ID: ${transactionId}`,
          },
        });
      });

      console.log(`Payment completed for booking ${booking.id}`);
    } else if (status === 'FAILED' || status === 'REJECTED') {
      // Handle payment failure
      await prisma.$transaction(async (tx) => {
        // Update booking history
        await tx.bookingHistory.create({
          data: {
            bookingId: booking.id,
            changedFields: {
              paymentStatus: { from: booking.paymentStatus, to: 'FAILED' },
            },
            changedBy: booking.userId,
            changeReason: `Payment failed via SePay. Transaction ID: ${transactionId}`,
          },
        });
      });

      console.log(`Payment failed for booking ${booking.id}`);
    }

    // Acknowledge webhook
    return sendSuccess(res, 'payment.webhookReceived', null, language);
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return sendServerError(res, 'common.serverError', null, language);
  }
};

/**
 * Get booking details
 */
export const getBookingDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  const userId = (req.user as { userId: string }).userId;

  try {
    const { id } = req.params;

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        bookingTrips: {
          include: {
            trip: {
              include: {
                route: {
                  include: {
                    sourceProvince: true,
                    destinationProvince: true,
                  },
                },
                vehicle: {
                  include: {
                    vehicleType: true,
                    driver: {
                      select: {
                        id: true,
                        name: true,
                        phoneNumber: true,
                        avatar: true,
                      },
                    },
                  },
                },
              },
            },
            seats: true,
          },
        },
        voucherUsage: {
          include: {
            voucher: true,
          },
        },
      },
    });

    if (!booking) {
      sendNotFound(res, 'booking.notFound', null, language);
      return;
    }

    // Check permissions - only the booking owner or admins can view details
    const isOwner = booking.userId === userId;
    const isAdmin = (req.user as any).role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendForbidden(res, 'booking.accessDenied', null, language);
    }

    // Get driver avatar if exists
    let driverAvatarUrl = null;
    if (booking.bookingTrips[0]?.trip.vehicle.driver?.avatar) {
      driverAvatarUrl = await getSignedUrlForFile(booking.bookingTrips[0].trip.vehicle.driver.avatar);
    }

    // Get trip image if exists
    let tripImageUrl = null;
    if (booking.bookingTrips[0]?.trip?.image) {
      tripImageUrl = await getSignedUrlForFile(booking.bookingTrips[0].trip?.image);
    }

    // Prepare response with image URLs
    const result = {
      ...booking,
      bookingTrips: booking.bookingTrips.map((bt) => ({
        ...bt,
        trip: {
          ...bt.trip,
          imageUrl: tripImageUrl,
          vehicle: {
            ...bt.trip.vehicle,
            driver: bt.trip.vehicle.driver
              ? {
                  ...bt.trip.vehicle.driver,
                  avatarUrl: driverAvatarUrl,
                }
              : null,
          },
        },
      })),
    };

    sendSuccess(res, 'booking.detailsRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving booking details:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get user's bookings
 */
export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  const userId = (req.user as { userId: string }).userId;

  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 10;
    const status = req.query.status as BookingStatus;
    const skip = (page - 1) * pageSize;

    // Build filter
    const filter: any = {
      userId,
      isDeleted: false,
    };

    if (status) {
      filter.status = status;
    }

    // Get bookings with pagination
    const [bookings, totalCount] = await Promise.all([
      prisma.booking.findMany({
        where: filter,
        include: {
          bookingTrips: {
            include: {
              trip: {
                include: {
                  route: {
                    include: {
                      sourceProvince: true,
                      destinationProvince: true,
                    },
                  },
                  seats: true,
                },
              },
              _count: {
                select: {
                  seats: true,
                },
              },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.booking.count({
        where: filter,
      }),
    ]);

    // Get trip images
    const bookingsWithImages = await Promise.all(
      bookings.map(async (booking) => {
        const tripsWithImages = await Promise.all(
          booking.bookingTrips.map(async (bt) => {
            let tripImageUrl = null;
            if (bt.trip.image) {
              tripImageUrl = await getSignedUrlForFile(bt.trip.image);
            }

            return {
              ...bt,
              trip: {
                ...bt.trip,
                imageUrl: tripImageUrl,
              },
            };
          })
        );

        return {
          ...booking,
          bookingTrips: tripsWithImages,
        };
      })
    );

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / pageSize);

    return sendSuccess(
      res,
      'booking.listRetrieved',
      {
        data: bookingsWithImages,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
        },
      },
      language
    );
  } catch (error) {
    console.error('Error retrieving user bookings:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  const userId = (req.user as { userId: string }).userId;

  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        bookingTrips: {
          include: {
            seats: true,
          },
        },
      },
    });

    if (!booking) {
      sendNotFound(res, 'booking.notFound', null, language);
      return;
    }

    // Check permissions - only the booking owner or admins can cancel
    const isOwner = booking.userId === userId;
    const isAdmin = (req.user as any).role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendForbidden(res, 'booking.accessDenied', null, language);
    }

    // Check if booking can be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      return sendBadRequest(res, 'booking.alreadyCancelled', null, language);
    }

    // Check if the trip hasn't departed yet (for user cancellations)
    if (!isAdmin) {
      const tripStartTime = await prisma.trip.findFirst({
        where: {
          bookingTrips: {
            some: {
              bookingId: id,
            },
          },
        },
        select: {
          departureTime: true,
        },
      });

      if (tripStartTime && tripStartTime.departureTime <= new Date()) {
        return sendBadRequest(res, 'booking.cannotCancelDeparted', null, language);
      }
    }

    // Cancel booking in transaction
    await prisma.$transaction(async (tx) => {
      // Update booking status
      await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });

      // Release seats
      for (const bookingTrip of booking.bookingTrips) {
        for (const seat of bookingTrip.seats) {
          await tx.seat.update({
            where: { id: seat.id },
            data: {
              status: SeatStatus.AVAILABLE,
              bookingTripId: null,
            },
          });
        }
      }

      // Create history record
      await tx.bookingHistory.create({
        data: {
          bookingId: id,
          changedFields: {
            status: { from: booking.status, to: BookingStatus.CANCELLED },
          },
          changedBy: userId,
          changeReason: reason || 'Booking cancelled by user',
        },
      });
    });

    return sendSuccess(res, 'booking.cancelled', null, language);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Get booking history
 */
export const getBookingHistory = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  const userId = (req.user as { userId: string }).userId;

  try {
    const { id } = req.params;

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return sendNotFound(res, 'booking.notFound', null, language);
    }

    // Check permissions - only the booking owner or admins can view history
    const isOwner = booking.userId === userId;
    const isAdmin = (req.user as any).role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendForbidden(res, 'booking.accessDenied', null, language);
    }

    // Get history
    const history = await prisma.bookingHistory.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Get user info for each history entry
    const historyWithUsers = await Promise.all(
      history.map(async (entry) => {
        const user = await prisma.user.findUnique({
          where: { id: entry.changedBy },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        });

        let avatarUrl = null;
        if (user?.avatar) {
          avatarUrl = await getSignedUrlForFile(user.avatar);
        }

        return {
          ...entry,
          changedBy: user
            ? {
                ...user,
                avatarUrl,
              }
            : { id: entry.changedBy, name: 'Unknown User' },
        };
      })
    );

    return sendSuccess(res, 'booking.historyRetrieved', historyWithUsers, language);
  } catch (error) {
    console.error('Error retrieving booking history:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Admin function to list all bookings
 */
export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
    const status = req.query.status as BookingStatus;
    const paymentStatus = req.query.paymentStatus as PaymentStatus;
    const userId = req.query.userId as string;
    const tripId = req.query.tripId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
    const skip = (page - 1) * pageSize;

    // Build filter
    const filter: any = {
      isDeleted: false,
    };

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (tripId) {
      filter.bookingTrips = {
        some: {
          tripId,
        },
      };
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.gte = startDate;
      }

      if (endDate) {
        filter.createdAt.lte = endDate;
      }
    }

    // Get bookings with pagination
    const [bookings, totalCount] = await Promise.all([
      prisma.booking.findMany({
        where: filter,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
            },
          },
          bookingTrips: {
            include: {
              trip: {
                include: {
                  route: {
                    include: {
                      sourceProvince: true,
                      destinationProvince: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  seats: true,
                },
              },
            },
          },
          voucherUsage: {
            include: {
              voucher: {
                select: {
                  code: true,
                  name: true,
                  discountType: true,
                  discountValue: true,
                },
              },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.booking.count({
        where: filter,
      }),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / pageSize);

    return sendSuccess(
      res,
      'booking.adminListRetrieved',
      {
        data: bookings,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
        },
      },
      language
    );
  } catch (error) {
    console.error('Error retrieving all bookings:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Get booking stats for dashboard
 */
export const getBookingStats = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(new Date().setDate(new Date().getDate() - 30)); // Default to last 30 days

    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    // Total bookings count
    const totalBookings = await prisma.booking.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Completed bookings (confirmed and paid)
    const completedBookings = await prisma.booking.count({
      where: {
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.COMPLETED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Cancelled bookings
    const cancelledBookings = await prisma.booking.count({
      where: {
        status: BookingStatus.CANCELLED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Pending bookings
    const pendingBookings = await prisma.booking.count({
      where: {
        status: BookingStatus.PENDING,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Total revenue from completed bookings
    const revenue = await prisma.booking.aggregate({
      _sum: {
        finalPrice: true,
      },
      where: {
        paymentStatus: PaymentStatus.COMPLETED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Total discounts applied
    const discounts = await prisma.booking.aggregate({
      _sum: {
        discountAmount: true,
      },
      where: {
        discountAmount: {
          gt: 0,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Top routes by booking count
    const topRoutes = await prisma.$runCommandRaw({
      aggregate: 'Trip',
      pipeline: [
        {
          $match: {
            'Booking.createdAt': {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $lookup: {
            from: 'Route',
            localField: 'routeId',
            foreignField: 'id',
            as: 'route',
          },
        },
        {
          $unwind: '$route',
        },
        {
          $lookup: {
            from: 'Province',
            localField: 'route.sourceProvinceId',
            foreignField: 'id',
            as: 'sourceProvince',
          },
        },
        {
          $unwind: '$sourceProvince',
        },
        {
          $lookup: {
            from: 'Province',
            localField: 'route.destinationProvinceId',
            foreignField: 'id',
            as: 'destinationProvince',
          },
        },
        {
          $unwind: '$destinationProvince',
        },
        {
          $lookup: {
            from: 'BookingTrip',
            localField: 'id',
            foreignField: 'tripId',
            as: 'bookingTrips',
          },
        },
        {
          $lookup: {
            from: 'Booking',
            localField: 'bookingTrips.bookingId',
            foreignField: 'id',
            as: 'bookings',
          },
        },
        {
          $match: {
            'bookings.createdAt': {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: {
              routeId: '$route.id',
              routeName: '$route.name',
              sourceProvince: '$sourceProvince.name',
              destinationProvince: '$destinationProvince.name',
            },
            bookingCount: { $sum: { $size: '$bookingTrips' } },
          },
        },
        {
          $project: {
            _id: 0,
            id: '$_id.routeId',
            name: '$_id.routeName',
            sourceProvince: '$_id.sourceProvince',
            destinationProvince: '$_id.destinationProvince',
            bookingCount: 1,
          },
        },
        {
          $sort: { bookingCount: -1 },
        },
        {
          $limit: 5,
        },
      ],
      cursor: {},
    });

    // Daily booking counts for chart
    const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
    const dailyStartDate = new Date(startDate);

    // Limit to 30 days if range is too large
    if (daysInRange > 30) {
      dailyStartDate.setDate(endDate.getDate() - 29);
    }

    const dailyBookings = await prisma.$runCommandRaw({
      aggregate: 'Booking',
      pipeline: [
        {
          $match: {
            createdAt: {
              $gte: dailyStartDate,
              $lte: endDate,
            },
          },
        },
        {
          $project: {
            dateOnly: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: 1,
            paymentStatus: 1,
          },
        },
        {
          $group: {
            _id: '$dateOnly',
            count: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $and: [{ $eq: ['$status', 'CONFIRMED'] }, { $eq: ['$paymentStatus', 'COMPLETED'] }] }, 1, 0],
              },
            },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0],
              },
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            count: 1,
            completed: 1,
            cancelled: 1,
            pending: 1,
          },
        },
        {
          $sort: { date: 1 },
        },
      ],
      cursor: {},
    });

    // Compile statistics
    const stats = {
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      revenue: revenue._sum.finalPrice || 0,
      discounts: discounts._sum.discountAmount || 0,
      topRoutes,
      dailyBookings,
      timeRange: {
        startDate,
        endDate,
      },
    };

    return sendSuccess(res, 'booking.statsRetrieved', stats, language);
  } catch (error) {
    console.error('Error retrieving booking stats:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Verify and resend payment QR code for a booking
 */
export const resendPaymentQR = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  const userId = (req.user as { userId: string }).userId;

  try {
    const { id } = req.params;

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      sendNotFound(res, 'booking.notFound', null, language);
      return;
    }

    // Check permissions - only the booking owner or admins can resend payment
    const isOwner = booking.userId === userId;
    const isAdmin = (req.user as any).role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendForbidden(res, 'booking.accessDenied', null, language);
      return;
    }

    // Check if booking is still pending
    if (booking.status !== BookingStatus.PENDING || booking.paymentStatus !== PaymentStatus.PENDING) {
      return sendBadRequest(res, 'booking.notPending', null, language);
      return;
    }

    // Get config for payment timeout
    const config = await getBookingConfig();

    // Generate new QR code
    const qrCodeData = await generatePaymentQRCode(booking.id, booking.finalPrice, booking.userId);

    // Calculate payment expiration time
    const paymentExpiration = new Date();
    paymentExpiration.setMinutes(paymentExpiration.getMinutes() + config.paymentTimeoutMinutes);

    // Update booking with new QR code
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        qrCode: qrCodeData,
        qrCodeExpiresAt: paymentExpiration,
      },
    });

    // Schedule automatic cancellation if not paid
    scheduleBookingCancellation(updatedBooking.id, config.paymentTimeoutMinutes);

    return sendSuccess(
      res,
      'booking.paymentQrResent',
      {
        bookingId: booking.id,
        qrCode: updatedBooking.qrCode,
        qrCodeExpiresAt: updatedBooking.qrCodeExpiresAt,
      },
      language
    );
  } catch (error) {
    console.error('Error resending payment QR:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Admin function to manually confirm a booking
 */
export const confirmBookingManually = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  const adminId = (req.user as { userId: string }).userId;

  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        bookingTrips: {
          include: {
            seats: true,
          },
        },
      },
    });

    if (!booking) {
      return sendNotFound(res, 'booking.notFound', null, language);
      return;
    }

    // Check if booking is in a state that can be confirmed
    if (booking.status === BookingStatus.CANCELLED) {
      return sendBadRequest(res, 'booking.cannotConfirmCancelled', null, language);
      return;
    }

    if (booking.status === BookingStatus.CONFIRMED && booking.paymentStatus === PaymentStatus.COMPLETED) {
      return sendBadRequest(res, 'booking.alreadyConfirmed', null, language);
      return;
    }

    // Confirm booking in transaction
    await prisma.$transaction(async (tx) => {
      // Update booking status
      await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });

      // Update seat status to booked
      for (const bookingTrip of booking.bookingTrips) {
        for (const seat of bookingTrip.seats) {
          await tx.seat.update({
            where: { id: seat.id },
            data: {
              status: SeatStatus.BOOKED,
            },
          });
        }
      }

      // Create history record
      await tx.bookingHistory.create({
        data: {
          bookingId: id,
          changedFields: {
            status: { from: booking.status, to: BookingStatus.CONFIRMED },
            paymentStatus: { from: booking.paymentStatus, to: PaymentStatus.COMPLETED },
          },
          changedBy: adminId,
          changeReason: notes || 'Booking manually confirmed by admin',
        },
      });
    });

    return sendSuccess(res, 'booking.manuallyConfirmed', null, language);
  } catch (error) {
    console.error('Error confirming booking manually:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Apply voucher to booking calculation
 */
export const calculateBookingWithVoucher = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  const userId = (req.user as { userId: string }).userId;

  try {
    const { tripId, seatCount, voucherCode } = req.body;

    if (!tripId || !seatCount || seatCount <= 0) {
      return sendBadRequest(res, 'booking.missingRequiredFields', null, language);
      return;
    }

    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: true,
      },
    });

    if (!trip) {
      return sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    // Calculate base price
    const totalPrice = trip.basePrice * seatCount;

    // If no voucher, return basic calculation
    if (!voucherCode) {
      return sendSuccess(
        res,
        'booking.calculated',
        {
          tripId,
          seatCount,
          basePrice: trip.basePrice,
          totalPrice,
          discountAmount: 0,
          finalPrice: totalPrice,
        },
        language
      );
      return;
    }

    // Find and validate voucher
    const voucher = await prisma.voucher.findUnique({
      where: {
        code: voucherCode,
        status: 'ACTIVE',
        isDeleted: false,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    if (!voucher) {
      return sendBadRequest(res, 'voucher.invalid', null, language);
      return;
    }

    // Check if voucher usage limit is reached
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
      return sendBadRequest(res, 'voucher.limitReached', null, language);
      return;
    }

    // Check per-user limit
    if (voucher.perUserLimit) {
      const userUsageCount = await prisma.voucherUsage.count({
        where: {
          voucherId: voucher.id,
          userId,
        },
      });

      if (userUsageCount >= voucher.perUserLimit) {
        return sendBadRequest(res, 'voucher.userLimitReached', null, language);
        return;
      }
    }

    // Check route compatibility
    if (
      voucher.applicableRoutes &&
      voucher.applicableRoutes.length > 0 &&
      !voucher.applicableRoutes.includes(trip.routeId)
    ) {
      return sendBadRequest(res, 'voucher.notApplicableForRoute', null, language);
      return;
    }

    // Check minimum order value
    if (voucher.minOrderValue && totalPrice < voucher.minOrderValue) {
      return sendBadRequest(res, 'voucher.minOrderNotMet', { minOrder: voucher.minOrderValue }, language);
      return;
    }

    // Calculate discount
    let discountAmount = 0;

    if (voucher.discountType === 'PERCENTAGE') {
      discountAmount = (totalPrice * voucher.discountValue) / 100;

      // Apply max discount cap if exists
      if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
        discountAmount = voucher.maxDiscountAmount;
      }
    } else {
      // Fixed amount discount
      discountAmount = voucher.discountValue;
    }

    // Calculate final price
    const finalPrice = totalPrice - discountAmount;

    return sendSuccess(
      res,
      'booking.calculated',
      {
        tripId,
        seatCount,
        basePrice: trip.basePrice,
        totalPrice,
        voucher: {
          code: voucher.code,
          name: voucher.name,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
        },
        discountAmount,
        finalPrice,
      },
      language
    );
  } catch (error) {
    console.error('Error calculating booking with voucher:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Export booking data (admin)
 */
export const exportBookingData = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
    const format = (req.query.format as string) || 'json';

    // Build filter
    const filter: any = {
      isDeleted: false,
    };

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.gte = startDate;
      }

      if (endDate) {
        filter.createdAt.lte = endDate;
      }
    }

    // Get bookings with related data
    const bookings = await prisma.booking.findMany({
      where: filter,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        bookingTrips: {
          include: {
            trip: {
              include: {
                route: {
                  include: {
                    sourceProvince: true,
                    destinationProvince: true,
                  },
                },
                vehicle: true,
              },
            },
            seats: true,
          },
        },
        voucherUsage: {
          include: {
            voucher: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format data for export
    const exportData = bookings.map((booking) => {
      // Get route details for first trip (in case of multi-trip booking)
      const trip = booking.bookingTrips[0]?.trip;
      const route = trip?.route;
      const seats = booking.bookingTrips.flatMap((bt) => bt.seats.map((s) => s.seatNumber));

      return {
        bookingId: booking.id,
        bookingDate: booking.createdAt.toISOString(),
        customer: booking.user.name,
        email: booking.user.email,
        phone: booking.user.phoneNumber,
        route: route ? `${route.sourceProvince.name} → ${route.destinationProvince.name}` : 'N/A',
        departureTime: trip ? trip.departureTime.toISOString() : 'N/A',
        seats: seats.join(', '),
        seatCount: seats.length,
        basePrice: booking.totalPrice,
        discount: booking.discountAmount || 0,
        finalPrice: booking.finalPrice,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        voucher: booking.voucherUsage?.voucher.code || 'N/A',
      };
    });

    // Return based on requested format
    if (format === 'csv') {
      // Convert to CSV format
      const headers = Object.keys(exportData[0] || {});
      let csv = headers.join(',') + '\n';

      exportData.forEach((item) => {
        const row = headers.map((header) => {
          const value = item[header as keyof typeof item];
          return typeof value === 'string' ? `"${value}"` : value;
        });
        csv += row.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=bookings-export.csv');
      res.send(csv);
    } else {
      // Default to JSON
      return sendSuccess(res, 'booking.dataExported', exportData, language);
    }
  } catch (error) {
    console.error('Error exporting booking data:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};
