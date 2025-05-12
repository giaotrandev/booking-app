import { Request, Response } from 'express';
import { Request as MulterRequest } from 'express-serve-static-core';
import fs from 'fs';
import { prisma } from '#config/db';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError, sendForbidden } from '#utils/apiResponse';
import { uploadFileToR2, getSignedUrlForFile, deleteFileFromR2, StorageFolders } from '#services/r2Service';
import { optimizeImage } from '#services/imageService';
import safeDeleteFile from '#utils/safeDeleteFile';
import { TripStatus, SeatStatus, SeatType, Trip } from '@prisma/client';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

/**
 * Create a new trip
 */
export const createTrip = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { routeId, vehicleId, departureTime, arrivalTime, basePrice, specialPrice } = req.body;

    // Validate input
    if (!routeId || !vehicleId || !departureTime || !arrivalTime || !basePrice) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendBadRequest(res, 'trip.missingRequiredFields', null, language);
      return;
    }

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendNotFound(res, 'route.notFound', null, language);
    }

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { vehicleType: true },
    });

    if (!vehicle) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendNotFound(res, 'vehicle.notFound', null, language);
    }

    // Parse dates
    const parsedDepartureTime = new Date(departureTime);
    const parsedArrivalTime = new Date(arrivalTime);

    // Validate dates
    if (parsedDepartureTime >= parsedArrivalTime) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendBadRequest(res, 'trip.invalidTimeRange', null, language);
      return;
    }

    let imageKey = null;

    // Handle file upload if present
    if (req.file) {
      try {
        // Optimize the image
        const optimizedImagePath = await optimizeImage(req.file.path, {
          width: 800,
          height: 600,
          quality: 80,
          format: 'webp',
        });

        // Create a unique key for the trip image
        const fileExtension = '.webp';
        const fileName = `${Date.now()}${fileExtension}`;
        const filePath = `${StorageFolders.TRIPS}`;
        const fileKey = `${filePath}/${fileName}`;

        // Upload to Cloudflare R2
        await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');
        imageKey = fileKey;

        // Clean up temp files
        await safeDeleteFile(req.file.path);
        await safeDeleteFile(optimizedImagePath);
      } catch (uploadError) {
        console.error('Error uploading trip image:', uploadError);
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        sendServerError(res, 'trip.imageUploadFailed', null, language);
        return;
      }
    }

    // Create trip in transaction to ensure consistency with seats
    const result = await prisma.$transaction(async (tx) => {
      // Create the trip
      const trip = await tx.trip.create({
        data: {
          routeId,
          vehicleId,
          departureTime: parsedDepartureTime,
          arrivalTime: parsedArrivalTime,
          basePrice: parseFloat(basePrice),
          specialPrice: specialPrice ? parseFloat(specialPrice) : null,
          status: TripStatus.SCHEDULED,
          image: imageKey,
        },
      });

      // Get seat configuration from vehicle type
      const seatConfig = vehicle.vehicleType.seatConfiguration as any;

      // Create seats based on the vehicle type configuration
      const seatsToCreate = [];

      // Process seat configuration and create seats
      for (const row of seatConfig.rows) {
        for (const seat of row.seats) {
          if (seat.exists) {
            seatsToCreate.push({
              tripId: trip.id,
              seatNumber: seat.number,
              seatType: seat.type || SeatType.STANDARD,
              status: SeatStatus.AVAILABLE,
            });
          }
        }
      }

      // Bulk create all seats
      await tx.seat.createMany({
        data: seatsToCreate,
      });

      // Create history entry
      await tx.tripHistory.create({
        data: {
          tripId: trip.id,
          changedFields: {},
          changedBy: (req.user as any).userId,
          changeReason: 'Trip created',
        },
      });

      // Return the newly created trip with seats
      return await tx.trip.findUnique({
        where: { id: trip.id },
        include: {
          seats: true,
          route: true,
          vehicle: {
            include: {
              vehicleType: true,
            },
          },
        },
      });
    });

    // Generate image URL if exists
    let imageUrl = null;
    if (result?.image) {
      imageUrl = await getSignedUrlForFile(result.image);
    }

    sendSuccess(res, 'trip.created', { ...result, imageUrl }, language);
  } catch (error) {
    // Clean up file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      await safeDeleteFile(req.file.path);
    }

    console.error('Error creating trip:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get list of trips with filtering
 */
export const getTripList = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    // Extract query parameters for filtering
    const routeId = req.query.routeId as string;
    const vehicleId = req.query.vehicleId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const status = req.query.status as TripStatus;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
    const skip = (page - 1) * pageSize;

    // Build filter object
    const filter: any = {
      deletedAt: null,
    };

    if (routeId) filter.routeId = routeId;
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;

    // Handle date range filtering
    if (startDate || endDate) {
      filter.departureTime = {};
      if (startDate) filter.departureTime.gte = startDate;
      if (endDate) filter.departureTime.lte = endDate;
    }

    // Query trips with pagination
    const [trips, totalCount] = await Promise.all([
      prisma.trip.findMany({
        where: filter,
        include: {
          route: true,
          vehicle: {
            include: {
              vehicleType: true,
            },
          },
          _count: {
            select: {
              seats: {
                where: {
                  status: SeatStatus.AVAILABLE,
                },
              },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: {
          departureTime: 'asc',
        },
      }),
      prisma.trip.count({
        where: filter,
      }),
    ]);

    // Generate image URLs for trips
    const tripsWithImageUrls = await Promise.all(
      trips.map(async (trip) => {
        let imageUrl = null;
        if (trip.image) {
          imageUrl = await getSignedUrlForFile(trip.image);
        }

        return {
          ...trip,
          imageUrl,
          availableSeats: trip._count.seats,
        };
      })
    );

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / pageSize);

    sendSuccess(
      res,
      'trip.listRetrieved',
      {
        data: tripsWithImageUrls,
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
    console.error('Error retrieving trip list:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get trip details
 */
export const getTripDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        route: {
          include: {
            sourceProvince: true,
            destinationProvince: true,
            routeStops: {
              include: {
                busStop: {
                  include: {
                    ward: {
                      include: {
                        district: {
                          include: {
                            province: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: {
                stopOrder: 'asc',
              },
            },
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
        seats: {
          orderBy: {
            seatNumber: 'asc',
          },
        },
      },
    });

    if (!trip) {
      sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    // Generate image URL if exists
    let imageUrl = null;
    if (trip.image) {
      imageUrl = await getSignedUrlForFile(trip.image);
    }

    // Get driver avatar if exists
    let driverAvatarUrl = null;
    if (trip.vehicle.driver?.avatar) {
      driverAvatarUrl = await getSignedUrlForFile(trip.vehicle.driver.avatar);
    }

    // Prepare response data with all image URLs
    const result = {
      ...trip,
      imageUrl,
      vehicle: {
        ...trip.vehicle,
        driver: trip.vehicle.driver
          ? {
              ...trip.vehicle.driver,
              avatarUrl: driverAvatarUrl,
            }
          : null,
      },
    };

    sendSuccess(res, 'trip.detailsRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving trip details:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Update trip
 */
export const updateTrip = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const { routeId, vehicleId, departureTime, arrivalTime, basePrice, specialPrice, status, changeReason } = req.body;

    // Check if trip exists
    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    // Don't allow updating completed or in-progress trips
    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.IN_PROGRESS) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendBadRequest(res, 'trip.cannotUpdateCompletedTrip', null, language);
      return;
    }

    // Build update data
    const updateData: any = {};
    const changedFields: any = {};

    // Track changes for history
    if (routeId && routeId !== trip.routeId) {
      // Check if route exists
      const route = await prisma.route.findUnique({
        where: { id: routeId },
      });

      if (!route) {
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        sendNotFound(res, 'route.notFound', null, language);
        return;
      }

      updateData.routeId = routeId;
      changedFields.routeId = { from: trip.routeId, to: routeId };
    }

    if (vehicleId && vehicleId !== trip.vehicleId) {
      // Check if vehicle exists
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        sendNotFound(res, 'vehicle.notFound', null, language);
        return;
      }

      updateData.vehicleId = vehicleId;
      changedFields.vehicleId = { from: trip.vehicleId, to: vehicleId };
    }

    // Handle date updates
    if (departureTime) {
      const parsedDepartureTime = new Date(departureTime);
      updateData.departureTime = parsedDepartureTime;
      changedFields.departureTime = {
        from: trip.departureTime.toISOString(),
        to: parsedDepartureTime.toISOString(),
      };
    }

    if (arrivalTime) {
      const parsedArrivalTime = new Date(arrivalTime);
      updateData.arrivalTime = parsedArrivalTime;
      changedFields.arrivalTime = {
        from: trip.arrivalTime.toISOString(),
        to: parsedArrivalTime.toISOString(),
      };
    }

    // Validate that departure time is before arrival time
    if ((updateData.departureTime || trip.departureTime) >= (updateData.arrivalTime || trip.arrivalTime)) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendBadRequest(res, 'trip.invalidTimeRange', null, language);
      return;
    }

    // Handle price updates
    if (basePrice !== undefined) {
      const parsedBasePrice = parseFloat(basePrice);
      updateData.basePrice = parsedBasePrice;
      changedFields.basePrice = { from: trip.basePrice, to: parsedBasePrice };
    }

    if (specialPrice !== undefined) {
      const parsedSpecialPrice = specialPrice ? parseFloat(specialPrice) : null;
      updateData.specialPrice = parsedSpecialPrice;
      changedFields.specialPrice = { from: trip.specialPrice, to: parsedSpecialPrice };
    }

    // Handle status update
    if (status && status !== trip.status) {
      // Validate status transition
      const isValidTransition = validateStatusTransition(trip.status, status as TripStatus);

      if (!isValidTransition) {
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        sendBadRequest(res, 'trip.invalidStatusTransition', null, language);
        return;
      }

      updateData.status = status;
      changedFields.status = { from: trip.status, to: status };
    }

    // Handle file upload if present
    let imageKey = trip.image;
    if (req.file) {
      try {
        // Optimize the image
        const optimizedImagePath = await optimizeImage(req.file.path, {
          width: 800,
          height: 600,
          quality: 80,
          format: 'webp',
        });

        // Create a unique key for the trip image
        const fileExtension = '.webp';
        const fileName = `${Date.now()}${fileExtension}`;
        const filePath = `${StorageFolders.TRIPS}`;
        const fileKey = `${filePath}/${fileName}`;

        // Upload to Cloudflare R2
        await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');

        // Delete old image if exists
        if (trip.image) {
          try {
            await deleteFileFromR2(trip.image);
          } catch (deleteError) {
            console.error('Error deleting old trip image:', deleteError);
          }
        }

        imageKey = fileKey;
        updateData.image = fileKey;
        changedFields.image = { from: trip.image, to: fileKey };

        // Clean up temp files
        await safeDeleteFile(req.file.path);
        await safeDeleteFile(optimizedImagePath);
      } catch (uploadError) {
        console.error('Error uploading trip image:', uploadError);
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        sendServerError(res, 'trip.imageUploadFailed', null, language);
        return;
      }
    }

    // Skip update if no changes
    if (Object.keys(updateData).length === 0) {
      sendSuccess(res, 'trip.noChanges', null, language);
      return;
    }

    // Perform update in transaction to ensure history is recorded
    const updatedTrip = await prisma.$transaction(async (tx) => {
      // Update the trip
      const updated = await tx.trip.update({
        where: { id },
        data: updateData,
        include: {
          route: true,
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
          seats: true,
        },
      });

      // Record history
      await tx.tripHistory.create({
        data: {
          tripId: id,
          changedFields: changedFields,
          changedBy: (req.user as any).userId,
          changeReason: changeReason || 'Trip updated',
        },
      });

      return updated;
    });

    // Generate image URL if exists
    let imageUrl = null;
    if (updatedTrip.image) {
      imageUrl = await getSignedUrlForFile(updatedTrip.image);
    }

    // Get driver avatar if exists
    let driverAvatarUrl = null;
    if (updatedTrip.vehicle.driver?.avatar) {
      driverAvatarUrl = await getSignedUrlForFile(updatedTrip.vehicle.driver.avatar);
    }

    // Prepare response with URLs
    const result = {
      ...updatedTrip,
      imageUrl,
      vehicle: {
        ...updatedTrip.vehicle,
        driver: updatedTrip.vehicle.driver
          ? {
              ...updatedTrip.vehicle.driver,
              avatarUrl: driverAvatarUrl,
            }
          : null,
      },
    };

    sendSuccess(res, 'trip.updated', result, language);
  } catch (error) {
    // Clean up file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      await safeDeleteFile(req.file.path);
    }

    console.error('Error updating trip:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Validate trip status transition
 */
function validateStatusTransition(currentStatus: TripStatus, newStatus: TripStatus): boolean {
  // Define valid transitions
  const validTransitions: Record<TripStatus, TripStatus[]> = {
    [TripStatus.SCHEDULED]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
    [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
    [TripStatus.COMPLETED]: [], // No transitions from completed
    [TripStatus.CANCELLED]: [TripStatus.SCHEDULED], // Allow reactivating cancelled trips
  };

  return validTransitions[currentStatus].includes(newStatus);
}

/**
 * Soft delete trip
 */
export const deleteTrip = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check if trip exists
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        bookingTrips: {
          include: {
            booking: true,
          },
        },
      },
    });

    if (!trip) {
      sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    // Check if the trip has any active bookings
    const hasActiveBookings = trip.bookingTrips.some(
      (bt) => bt.booking.status !== 'CANCELLED' && bt.booking.status !== 'PENDING'
    );

    if (hasActiveBookings) {
      sendBadRequest(res, 'trip.cannotDeleteWithActiveBookings', null, language);
      return;
    }

    // Get current date for soft delete
    const now = new Date();

    // Perform the soft delete in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the trip
      await tx.trip.update({
        where: { id },
        data: {
          deletedAt: now,
          status: TripStatus.CANCELLED,
        },
      });

      // Create history record
      await tx.tripHistory.create({
        data: {
          tripId: id,
          changedFields: {
            deletedAt: { from: null, to: now.toISOString() },
            status: { from: trip.status, to: TripStatus.CANCELLED },
          },
          changedBy: (req.user as any).userId,
          changeReason: reason || 'Trip deleted',
        },
      });

      // Cancel any pending bookings
      for (const bookingTrip of trip.bookingTrips) {
        if (bookingTrip.booking.status === 'PENDING') {
          await tx.booking.update({
            where: { id: bookingTrip.booking.id },
            data: {
              status: 'CANCELLED',
            },
          });

          // Update seat status
          await tx.seat.updateMany({
            where: {
              tripId: id,
              bookingTripId: bookingTrip.id,
            },
            data: {
              status: SeatStatus.AVAILABLE,
              bookingTripId: null,
            },
          });

          // Create booking history
          await tx.bookingHistory.create({
            data: {
              bookingId: bookingTrip.booking.id,
              changedFields: {
                status: { from: 'PENDING', to: 'CANCELLED' },
              },
              changedBy: (req.user as any).userId,
              changeReason: 'Trip deleted by admin',
            },
          });
        }
      }
    });

    sendSuccess(res, 'trip.deleted', null, language);
  } catch (error) {
    console.error('Error deleting trip:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Restore deleted trip
 */
export const restoreTrip = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if trip exists and is deleted
    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    if (!trip.deletedAt) {
      sendBadRequest(res, 'trip.notDeleted', null, language);
      return;
    }

    // Restore trip in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the trip
      await tx.trip.update({
        where: { id },
        data: {
          deletedAt: null,
          status: TripStatus.SCHEDULED,
        },
      });

      // Create history record
      await tx.tripHistory.create({
        data: {
          tripId: id,
          changedFields: {
            deletedAt: { from: trip.deletedAt?.toISOString(), to: null },
            status: { from: trip.status, to: TripStatus.SCHEDULED },
          },
          changedBy: (req.user as any).userId,
          changeReason: 'Trip restored',
        },
      });
    });

    sendSuccess(res, 'trip.restored', null, language);
  } catch (error) {
    console.error('Error restoring trip:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get available seats for a trip
 */
export const getTripSeats = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if trip exists
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            vehicleType: true,
          },
        },
        seats: {
          orderBy: {
            seatNumber: 'asc',
          },
        },
      },
    });

    if (!trip) {
      sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    // Get seat configuration from vehicle type
    const seatConfig = trip.vehicle.vehicleType.seatConfiguration;

    // Return seats with configuration
    sendSuccess(
      res,
      'trip.seatsRetrieved',
      {
        trip: {
          id: trip.id,
          departureTime: trip.departureTime,
          arrivalTime: trip.arrivalTime,
          basePrice: trip.basePrice,
          specialPrice: trip.specialPrice,
          status: trip.status,
        },
        seatConfiguration: seatConfig,
        seats: trip.seats,
      },
      language
    );
  } catch (error) {
    console.error('Error retrieving trip seats:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Search trips by source and destination
 */
export const searchTrips = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const {
      sourceProvinceId,
      destinationProvinceId,
      departureDate,
      returnDate,
      maxPrice,
      minPrice,
      page = '1',
      pageSize = '20',
    } = req.query;

    // Parse pagination parameters
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const skip = (pageNum - 1) * pageSizeNum;

    // Build filters
    const routeFilter: any = {};

    if (sourceProvinceId) {
      routeFilter.sourceProvinceId = sourceProvinceId as string;
    }

    if (destinationProvinceId) {
      routeFilter.destinationProvinceId = destinationProvinceId as string;
    }

    // Build trip filters
    const tripFilter: any = {
      status: TripStatus.SCHEDULED,
      deletedAt: null,
    };

    // Handle departure date filter
    if (departureDate) {
      const startDate = new Date(departureDate as string);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      tripFilter.departureTime = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Handle price range filters
    if (minPrice) {
      tripFilter.basePrice = {
        ...tripFilter.basePrice,
        gte: parseFloat(minPrice as string),
      };
    }

    if (maxPrice) {
      tripFilter.basePrice = {
        ...tripFilter.basePrice,
        lte: parseFloat(maxPrice as string),
      };
    }

    // Find routes matching source/destination
    const routes = await prisma.route.findMany({
      where: routeFilter,
      select: {
        id: true,
        name: true,
        sourceProvince: {
          select: {
            id: true,
            name: true,
          },
        },
        destinationProvince: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (routes.length === 0) {
      sendSuccess(
        res,
        'trip.noRoutesFound',
        {
          data: [],
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
            totalCount: 0,
            totalPages: 0,
          },
        },
        language
      );
      return;
    }

    // Get route IDs to filter trips
    const routeIds = routes.map((route) => route.id);
    tripFilter.routeId = { in: routeIds };

    // Get trips with filtering and pagination
    const [trips, totalCount] = await Promise.all([
      prisma.trip.findMany({
        where: tripFilter,
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
            },
          },
          _count: {
            select: {
              seats: {
                where: {
                  status: SeatStatus.AVAILABLE,
                },
              },
            },
          },
        },
        skip,
        take: pageSizeNum,
        orderBy: {
          departureTime: 'asc',
        },
      }),
      prisma.trip.count({
        where: tripFilter,
      }),
    ]);

    interface TripWithUrl extends Trip {
      imageUrl: string | null;
      availableSeats: number;
    }

    // Generate trip image URLs
    const tripsWithUrls = await Promise.all(
      trips.map(async (trip) => {
        let imageUrl = null;
        if (trip.image) {
          imageUrl = await getSignedUrlForFile(trip.image);
        }

        return {
          ...trip,
          imageUrl,
          availableSeats: trip._count.seats,
        };
      })
    );

    // If return date is provided, also find return trips
    let returnTrips = [];
    let returnTripsWithUrls: TripWithUrl[] = [];
    let returnTotalCount = 0;

    if (returnDate && sourceProvinceId && destinationProvinceId) {
      // Swap source and destination for return trip
      const returnRouteFilter = {
        sourceProvinceId: destinationProvinceId as string,
        destinationProvinceId: sourceProvinceId as string,
      };

      // Find return routes
      const returnRoutes = await prisma.route.findMany({
        where: returnRouteFilter,
        select: {
          id: true,
        },
      });

      if (returnRoutes.length > 0) {
        const returnRouteIds = returnRoutes.map((route) => route.id);

        // Build return trip filter
        const returnTripFilter: any = {
          status: TripStatus.SCHEDULED,
          deletedAt: null,
          routeId: { in: returnRouteIds },
        };

        // Add date filter for return trip
        const returnStartDate = new Date(returnDate as string);
        returnStartDate.setHours(0, 0, 0, 0);

        const returnEndDate = new Date(returnStartDate);
        returnEndDate.setHours(23, 59, 59, 999);

        returnTripFilter.departureTime = {
          gte: returnStartDate,
          lte: returnEndDate,
        };

        // Add price filters
        if (minPrice) {
          returnTripFilter.basePrice = {
            ...returnTripFilter.basePrice,
            gte: parseFloat(minPrice as string),
          };
        }

        if (maxPrice) {
          returnTripFilter.basePrice = {
            ...returnTripFilter.basePrice,
            lte: parseFloat(maxPrice as string),
          };
        }

        // Fetch return trips
        [returnTrips, returnTotalCount] = await Promise.all([
          prisma.trip.findMany({
            where: returnTripFilter,
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
                },
              },
              _count: {
                select: {
                  seats: {
                    where: {
                      status: SeatStatus.AVAILABLE,
                    },
                  },
                },
              },
            },
            skip,
            take: pageSizeNum,
            orderBy: {
              departureTime: 'asc',
            },
          }),
          prisma.trip.count({
            where: returnTripFilter,
          }),
        ]);

        // Generate image URLs for return trips
        returnTripsWithUrls = await Promise.all(
          returnTrips.map(async (trip) => {
            let imageUrl = null;
            if (trip.image) {
              imageUrl = await getSignedUrlForFile(trip.image);
            }

            return {
              ...trip,
              imageUrl,
              availableSeats: trip._count.seats,
            };
          })
        );
      }
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / pageSizeNum);
    const returnTotalPages = Math.ceil(returnTotalCount / pageSizeNum);

    sendSuccess(
      res,
      'trip.searchResults',
      {
        outboundTrips: {
          data: tripsWithUrls,
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
            totalCount,
            totalPages,
          },
        },
        returnTrips:
          returnTripsWithUrls.length > 0
            ? {
                data: returnTripsWithUrls,
                pagination: {
                  page: pageNum,
                  pageSize: pageSizeNum,
                  totalCount: returnTotalCount,
                  totalPages: returnTotalPages,
                },
              }
            : null,
      },
      language
    );
  } catch (error) {
    console.error('Error searching trips:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get trip history
 */
export const getTripHistory = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if trip exists
    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    // Get history records
    const history = await prisma.tripHistory.findMany({
      where: { tripId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        trip: {
          select: {
            id: true,
            routeId: true,
            vehicleId: true,
            status: true,
          },
        },
      },
    });

    // Fetch user info for each history entry
    const historyWithUsers = await Promise.all(
      history.map(async (entry) => {
        // Get user who made the change
        const user = await prisma.user.findUnique({
          where: { id: entry.changedBy },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        });

        // Get avatar URL if exists
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

    sendSuccess(res, 'trip.historyRetrieved', historyWithUsers, language);
  } catch (error) {
    console.error('Error retrieving trip history:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Update seat status
 */
export const updateSeatStatus = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id, seatId } = req.params;
    const { status, reason } = req.body;

    // Check if trip exists
    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    // Check if seat exists
    const seat = await prisma.seat.findUnique({
      where: {
        id: seatId,
        tripId: id,
      },
    });

    if (!seat) {
      sendNotFound(res, 'seat.notFound', null, language);
      return;
    }

    // Only admin can update seat status if it's already booked or reserved
    if ((seat.status === SeatStatus.BOOKED || seat.status === SeatStatus.RESERVED) && status !== SeatStatus.AVAILABLE) {
      sendBadRequest(res, 'seat.cannotChangeBookedSeat', null, language);
      return;
    }

    // Update seat status
    const updatedSeat = await prisma.seat.update({
      where: {
        id: seatId,
      },
      data: {
        status: status as SeatStatus,
      },
    });

    // Create trip history entry
    await prisma.tripHistory.create({
      data: {
        tripId: id,
        changedFields: {
          seat: {
            id: seatId,
            status: {
              from: seat.status,
              to: status,
            },
          },
        },
        changedBy: (req.user as any).userId,
        changeReason: reason || `Seat ${seat.seatNumber} status updated`,
      },
    });

    sendSuccess(res, 'seat.statusUpdated', updatedSeat, language);
  } catch (error) {
    console.error('Error updating seat status:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get all trips by date range (for calendar view)
 */
export const getTripsByDateRange = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      sendBadRequest(res, 'trip.missingDateRange', null, language);
      return;
    }

    const parsedStartDate = new Date(startDate as string);
    const parsedEndDate = new Date(endDate as string);

    // Validate dates
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      sendBadRequest(res, 'trip.invalidDateFormat', null, language);
      return;
    }

    // Find trips in date range
    const trips = await prisma.trip.findMany({
      where: {
        departureTime: {
          gte: parsedStartDate,
          lte: parsedEndDate,
        },
        deletedAt: null,
      },
      include: {
        route: {
          select: {
            name: true,
            sourceProvince: {
              select: {
                name: true,
              },
            },
            destinationProvince: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            bookingTrips: true,
            seats: {
              where: {
                status: SeatStatus.AVAILABLE,
              },
            },
          },
        },
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    // Format as calendar events
    const calendarEvents = trips.map((trip) => {
      return {
        id: trip.id,
        title: `${trip.route.sourceProvince.name} → ${trip.route.destinationProvince.name}`,
        start: trip.departureTime,
        end: trip.arrivalTime,
        bookings: trip._count.bookingTrips,
        availableSeats: trip._count.seats,
        status: trip.status,
        routeName: trip.route.name,
      };
    });

    sendSuccess(res, 'trip.calendarRetrieved', calendarEvents, language);
  } catch (error) {
    console.error('Error retrieving trip calendar:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Export trip data (admin)
 */
export const exportTripsData = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { startDate, endDate, routeId, format = 'json' } = req.query;

    // Build filter
    const filter: any = {
      deletedAt: null,
    };

    if (startDate && endDate) {
      filter.departureTime = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (routeId) {
      filter.routeId = routeId as string;
    }

    // Get trips with relevant data
    const trips = await prisma.trip.findMany({
      where: filter,
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
                name: true,
                phoneNumber: true,
              },
            },
          },
        },
        bookingTrips: {
          include: {
            booking: {
              select: {
                id: true,
                status: true,
                paymentStatus: true,
                finalPrice: true,
              },
            },
          },
        },
        _count: {
          select: {
            seats: {
              where: {
                status: SeatStatus.AVAILABLE,
              },
            },
          },
        },
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    // Format data for export
    const exportData = trips.map((trip) => {
      return {
        id: trip.id,
        route: `${trip.route.sourceProvince.name} → ${trip.route.destinationProvince.name}`,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        status: trip.status,
        vehicle: `${trip.vehicle.plateNumber} (${trip.vehicle.vehicleType.name})`,
        driver: trip.vehicle.driver?.name || 'No driver assigned',
        basePrice: trip.basePrice,
        specialPrice: trip.specialPrice,
        totalBookings: trip.bookingTrips.length,
        availableSeats: trip._count.seats,
        confirmedBookings: trip.bookingTrips.filter((bt) => bt.booking.status === 'CONFIRMED').length,
        pendingBookings: trip.bookingTrips.filter((bt) => bt.booking.status === 'PENDING').length,
        totalRevenue: trip.bookingTrips
          .filter((bt) => bt.booking.paymentStatus === 'COMPLETED')
          .reduce((sum, bt) => sum + bt.booking.finalPrice, 0),
      };
    });

    // Return based on requested format
    if (format === 'csv') {
      // Convert to CSV format
      let csv = '';

      // Add headers
      const headers = Object.keys(exportData[0] || {});
      csv += headers.join(',') + '\n';

      // Add data rows
      exportData.forEach((item) => {
        const row = headers.map((header) => {
          const value = item[header as keyof typeof item];
          return typeof value === 'string' ? `"${value}"` : value;
        });
        csv += row.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=trips-export.csv');
      res.send(csv);
    } else {
      // Default to JSON
      sendSuccess(res, 'trip.dataExported', exportData, language);
    }
  } catch (error) {
    console.error('Error exporting trip data:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Check seat availability for a trip
 */
export const checkSeatAvailability = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { tripId } = req.params;

    // Find trip
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: {
          include: {
            vehicleType: true,
          },
        },
        seats: {
          orderBy: {
            seatNumber: 'asc',
          },
        },
      },
    });

    if (!trip) {
      return sendNotFound(res, 'trip.notFound', null, language);
    }

    // Get seat configuration
    const seatConfig = trip.vehicle.vehicleType.seatConfiguration;

    // Build seat availability map
    const seats = trip.seats.map((seat) => ({
      id: seat.id,
      seatNumber: seat.seatNumber,
      seatType: seat.seatType,
      status: seat.status,
      isAvailable: seat.status === SeatStatus.AVAILABLE,
    }));

    return sendSuccess(
      res,
      'trip.seatAvailability',
      {
        tripId,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        seatConfiguration: seatConfig,
        seats,
        totalSeats: seats.length,
        availableSeats: seats.filter((s) => s.isAvailable).length,
      },
      language
    );
  } catch (error) {
    console.error('Error checking seat availability:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};
