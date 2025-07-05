import { Request, Response } from 'express';
import fs from 'fs';
import { TripStatus, SeatStatus, SeatType, Trip } from '@prisma/client';
import { prisma } from '#config/db';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError, sendForbidden } from '#utils/apiResponse';
import { uploadFileToR2, getSignedUrlForFile, deleteFileFromR2, StorageFolders } from '#services/r2Service';
import { optimizeImage } from '#services/imageService';
import safeDeleteFile from '#utils/safeDeleteFile';
import { deepRemoveTimestamps, removeTimestamps } from '#src/helpers/dataHelper';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

/**
 * Create a new trip
 */
export const createTrip = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { routeId, vehicleId, departureTime, arrivalTime, basePrice, specialPrice, stopPrices } = req.body;

    // Validate input
    if (!routeId || !vehicleId || !departureTime || !arrivalTime || !basePrice) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendBadRequest(res, 'trip.missingRequiredFields', null, language);
      return;
    }

    // Validate stopPrices if provided
    let parsedStopPrices = [];
    if (stopPrices) {
      try {
        parsedStopPrices = JSON.parse(stopPrices);
        if (!Array.isArray(parsedStopPrices)) {
          throw new Error('stopPrices must be an array');
        }
        for (const stopPrice of parsedStopPrices) {
          if (!stopPrice.busStopId || typeof stopPrice.price !== 'number') {
            throw new Error('Each stopPrice must have busStopId and price');
          }
        }
      } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        sendBadRequest(res, 'trip.invalidStopPrices', null, language);
        return;
      }
    }

    // Check if route exists and fetch its stops
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: { routeStops: { include: { busStop: true } } },
    });

    if (!route) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendNotFound(res, 'route.notFound', null, language);
    }

    // Validate that all provided busStopIds exist in the route
    if (parsedStopPrices.length > 0) {
      const routeStopIds = route.routeStops.map((rs) => rs.busStopId);
      for (const stopPrice of parsedStopPrices) {
        if (!routeStopIds.includes(stopPrice.busStopId)) {
          if (req.file && fs.existsSync(req.file.path)) {
            await safeDeleteFile(req.file.path);
          }
          sendBadRequest(res, 'trip.invalidBusStopForRoute', null, language);
          return;
        }
      }
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

    // Validate seat configuration
    const seatConfig = vehicle.vehicleType.seatConfiguration as any;
    if (!seatConfig?.decks || !Array.isArray(seatConfig.decks)) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendBadRequest(res, 'vehicle.invalidSeatConfiguration', null, language);
      return;
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
        const optimizedImagePath = await optimizeImage(req.file.path, {
          width: 800,
          height: 600,
          quality: 80,
          format: 'webp',
        });
        const fileExtension = '.webp';
        const fileName = `${Date.now()}${fileExtension}`;
        const filePath = `${StorageFolders.TRIPS}`;
        const fileKey = `${filePath}/${fileName}`;
        await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');
        imageKey = fileKey;
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

    // Create trip in transaction
    const result = await prisma.$transaction(
      async (tx) => {
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
            deletedAt: null,
          },
        });

        // Create stop prices
        if (parsedStopPrices.length > 0) {
          await tx.tripStopPrice.createMany({
            data: parsedStopPrices.map((sp) => ({
              tripId: trip.id,
              busStopId: sp.busStopId,
              price: sp.price,
            })),
          });
        }

        // Create seats
        const seatsToCreate = [];
        for (const deck of seatConfig.decks) {
          if (!deck.rows || !Array.isArray(deck.rows)) {
            throw new Error(`Invalid rows for deck ${deck.deckId}`);
          }
          for (const row of deck.rows) {
            if (!row.seats || !Array.isArray(row.seats)) {
              throw new Error(`Invalid seats for row ${row.rowId} in deck ${deck.deckId}`);
            }
            for (const seat of row.seats) {
              if (seat.exists && seat.number && seat.type !== 'DRIVER') {
                seatsToCreate.push({
                  tripId: trip.id,
                  seatNumber: seat.number,
                  seatType: seat.type as SeatType,
                  status: SeatStatus.AVAILABLE,
                });
              }
            }
          }
        }
        await tx.seat.createMany({ data: seatsToCreate });

        // Create history entry
        await tx.tripHistory.create({
          data: {
            tripId: trip.id,
            changedFields: {},
            changedBy: (req.user as any).userId,
            changeReason: 'Trip created',
          },
        });

        return await tx.trip.findUnique({
          where: { id: trip.id },
          include: {
            seats: true,
            route: {
              include: {
                routeStops: { include: { busStop: true } },
                sourceProvince: true,
                destinationProvince: true,
              },
            },
            vehicle: { include: { vehicleType: true } },
            stopPrices: { include: { busStop: true } },
          },
        });
      },
      { timeout: 20000 }
    );

    // Generate image URL
    let imageUrl = null;
    if (result?.image) {
      imageUrl = await getSignedUrlForFile(result.image);
    }

    return sendSuccess(res, 'trip.created', { ...result, imageUrl }, language);
  } catch (error) {
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
    const routeId = req.query.routeId as string;
    const vehicleId = req.query.vehicleId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const status = req.query.status as TripStatus;
    const busStopId = req.query.busStopId as string; // New filter for pickup stop
    const page = req.query.page
      ? parseInt(req.query.page as string)
      : parseInt(process.env.PAGINATION_DEFAULT_PAGE as string) || 1;
    const pageSize = req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : parseInt(process.env.PAGINATION_DEFAULT_LIMIT as string) || 10;
    const skip = (page - 1) * pageSize;

    // Build filter object
    const filter: any = {
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
    };

    if (routeId) filter.routeId = routeId;
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;

    // Filter by pickup stop
    if (busStopId) {
      filter.route = {
        routeStops: {
          some: {
            busStopId,
          },
        },
      };
    }

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
                          district: { include: { province: true } },
                        },
                      },
                    },
                  },
                },
                orderBy: { stopOrder: 'asc' },
              },
            },
          },
          vehicle: { include: { vehicleType: true } },
          stopPrices: { include: { busStop: true } },
          _count: {
            select: {
              seats: { where: { status: SeatStatus.AVAILABLE } },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { departureTime: 'asc' },
      }),
      prisma.trip.count({ where: filter }),
    ]);

    // Generate image URLs
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

    const totalPages = Math.ceil(totalCount / pageSize);

    return sendSuccess(
      res,
      'trip.listRetrieved',
      {
        data: tripsWithImageUrls,
        pagination: { page, pageSize, totalCount, totalPages },
      },
      language
    );
  } catch (error) {
    console.error('Error retrieving trip list:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**Get trip details
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
                        district: { include: { province: true } },
                      },
                    },
                  },
                },
              },
              orderBy: { stopOrder: 'asc' },
            },
          },
        },
        vehicle: {
          include: {
            vehicleType: true,
            driver: {
              select: { id: true, firstName: true, lastName: true, phoneNumber: true, avatar: true },
            },
          },
        },
        seats: { orderBy: { seatNumber: 'asc' } },
        stopPrices: { include: { busStop: true } },
      },
    });

    if (!trip) {
      sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    // Get signed URLs
    let imageUrl = null;
    if (trip.image) {
      imageUrl = await getSignedUrlForFile(trip.image);
    }

    let driverAvatarUrl = null;
    if (trip.vehicle.driver?.avatar) {
      driverAvatarUrl = await getSignedUrlForFile(trip.vehicle.driver.avatar);
    }

    // Create price map for easy lookup
    const priceMap = new Map(trip.stopPrices.map((sp) => [sp.busStopId, sp.price]));

    // Process route stops with price information
    const processedStops = trip.route.routeStops.map((routeStop) => {
      const busStop = routeStop.busStop;
      const ward = busStop.ward;
      const district = ward.district;
      const province = district.province;

      return {
        busStopId: busStop.id,
        name: busStop.name,
        latitude: busStop.latitude,
        longitude: busStop.longitude,
        estimatedTime: routeStop.estimatedArrivalTime,
        address: busStop.address,
        wardName: ward.name,
        districtName: district.name,
        provinceName: province.name,
        provinceId: province.id,
        stopOrder: routeStop.stopOrder,
        price: priceMap.get(busStop.id) || 0, // Include price from stopPrices
      };
    });

    // Separate stops into pickup and dropoff points
    const routeStops = {
      pickupPoints: processedStops.filter((stop) => stop.provinceId === trip.route.sourceProvince.id),
      dropoffPoints: processedStops.filter((stop) => stop.provinceId === trip.route.destinationProvince.id),
    };

    // Build final result
    const result = {
      id: trip.id,
      image: trip.image,
      imageUrl,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      basePrice: trip.basePrice,
      specialPrice: trip.specialPrice,
      status: trip.status,
      route: {
        id: trip.route.id,
        sourceProvince: removeTimestamps(trip.route.sourceProvince),
        destinationProvince: removeTimestamps(trip.route.destinationProvince),
        routeStops,
      },
      vehicle: {
        ...trip.vehicle,
        driver: trip.vehicle.driver
          ? {
              ...trip.vehicle.driver,
              avatarUrl: driverAvatarUrl,
            }
          : null,
      },
      seats: trip.seats.map(removeTimestamps),
    };

    // Apply deep timestamp removal to the entire result
    const cleanedResult = deepRemoveTimestamps(result);

    return sendSuccess(res, 'trip.detailsRetrieved', cleanedResult, language);
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
    const {
      routeId,
      vehicleId,
      departureTime,
      arrivalTime,
      basePrice,
      specialPrice,
      status,
      changeReason,
      stopPrices,
    } = req.body;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { seats: true },
    });

    if (!trip) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendNotFound(res, 'trip.notFound', null, language);
      return;
    }

    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.IN_PROGRESS) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendBadRequest(res, 'trip.cannotUpdateCompletedTrip', null, language);
      return;
    }

    // Validate stopPrices if provided
    let parsedStopPrices = [];
    if (stopPrices) {
      try {
        parsedStopPrices = JSON.parse(stopPrices);
        if (!Array.isArray(parsedStopPrices)) {
          throw new Error('stopPrices must be an array');
        }
        for (const stopPrice of parsedStopPrices) {
          if (!stopPrice.busStopId || typeof stopPrice.price !== 'number') {
            throw new Error('Each stopPrice must have busStopId and price');
          }
        }
      } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        sendBadRequest(res, 'trip.invalidStopPrices', null, language);
        return;
      }
    }

    // Validate route and stop prices
    let route = null;
    if (routeId || parsedStopPrices.length > 0) {
      const targetRouteId = routeId || trip.routeId;
      route = await prisma.route.findUnique({
        where: { id: targetRouteId },
        include: { routeStops: { include: { busStop: true } } },
      });

      if (!route) {
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        sendNotFound(res, 'route.notFound', null, language);
        return;
      }

      if (parsedStopPrices.length > 0) {
        const routeStopIds = route.routeStops.map((rs) => rs.busStopId);
        for (const stopPrice of parsedStopPrices) {
          if (!routeStopIds.includes(stopPrice.busStopId)) {
            if (req.file && fs.existsSync(req.file.path)) {
              await safeDeleteFile(req.file.path);
            }
            sendBadRequest(res, 'trip.invalidBusStopForRoute', null, language);
            return;
          }
        }
      }
    }

    const updateData: any = {};
    const changedFields: any = {};

    if (routeId && routeId !== trip.routeId) {
      updateData.routeId = routeId;
      changedFields.routeId = { from: trip.routeId, to: routeId };
    }

    let newVehicle = null;
    if (vehicleId && vehicleId !== trip.vehicleId) {
      newVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: { vehicleType: true },
      });

      if (!newVehicle) {
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        sendNotFound(res, 'vehicle.notFound', null, language);
        return;
      }

      const seatConfig = newVehicle.vehicleType.seatConfiguration as any;
      if (!seatConfig?.decks || !Array.isArray(seatConfig.decks)) {
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        sendBadRequest(res, 'vehicle.invalidSeatConfiguration', null, language);
        return;
      }

      updateData.vehicleId = vehicleId;
      changedFields.vehicleId = { from: trip.vehicleId, to: vehicleId };
    }

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

    if ((updateData.departureTime || trip.departureTime) >= (updateData.arrivalTime || trip.arrivalTime)) {
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendBadRequest(res, 'trip.invalidTimeRange', null, language);
      return;
    }

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

    if (status && status !== trip.status) {
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

    let imageKey = trip.image;
    if (req.file) {
      try {
        const optimizedImagePath = await optimizeImage(req.file.path, {
          width: 800,
          height: 600,
          quality: 80,
          format: 'webp',
        });
        const fileExtension = '.webp';
        const fileName = `${Date.now()}${fileExtension}`;
        const filePath = `${StorageFolders.TRIPS}`;
        const fileKey = `${filePath}/${fileName}`;
        await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');
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

    const updatedTrip = await prisma.$transaction(async (tx) => {
      if (newVehicle) {
        const bookedSeats = trip.seats.filter((seat) => seat.status === SeatStatus.BOOKED);
        if (bookedSeats.length > 0) {
          throw new Error('Cannot change vehicle: trip has booked seats');
        }
        await tx.seat.deleteMany({ where: { tripId: id } });
        const seatConfig = newVehicle.vehicleType.seatConfiguration as any;
        const seatsToCreate = [];
        for (const deck of seatConfig.decks) {
          if (!deck.rows || !Array.isArray(deck.rows)) {
            throw new Error(`Invalid rows for deck ${deck.deckId}`);
          }
          for (const row of deck.rows) {
            if (!row.seats || !Array.isArray(row.seats)) {
              throw new Error(`Invalid seats for row ${row.rowId} in deck ${deck.deckId}`);
            }
            for (const seat of row.seats) {
              if (seat.exists && seat.number && seat.type !== 'DRIVER') {
                seatsToCreate.push({
                  tripId: id,
                  seatNumber: seat.number,
                  seatType: seat.type as SeatType,
                  status: SeatStatus.AVAILABLE,
                });
              }
            }
          }
        }
        await tx.seat.createMany({ data: seatsToCreate });
      }

      // Update stop prices
      if (parsedStopPrices.length > 0) {
        await tx.tripStopPrice.deleteMany({ where: { tripId: id } });
        await tx.tripStopPrice.createMany({
          data: parsedStopPrices.map((sp) => ({
            tripId: id,
            busStopId: sp.busStopId,
            price: sp.price,
          })),
        });
        changedFields.stopPrices = { updated: parsedStopPrices };
      }

      const updated = await tx.trip.update({
        where: { id },
        data: updateData,
        include: {
          route: {
            include: {
              sourceProvince: true,
              destinationProvince: true,
              routeStops: { include: { busStop: true } },
            },
          },
          vehicle: {
            include: {
              vehicleType: true,
              driver: {
                select: { id: true, firstName: true, lastName: true, phoneNumber: true, avatar: true },
              },
            },
          },
          seats: true,
          stopPrices: { include: { busStop: true } },
        },
      });

      if (Object.keys(changedFields).length > 0) {
        await tx.tripHistory.create({
          data: {
            tripId: id,
            changedFields: changedFields,
            changedBy: (req.user as any).userId,
            changeReason: changeReason || 'Trip updated',
          },
        });
      }

      return updated;
    });

    let imageUrl = null;
    if (updatedTrip.image) {
      imageUrl = await getSignedUrlForFile(updatedTrip.image);
    }

    let driverAvatarUrl = null;
    if (updatedTrip.vehicle.driver?.avatar) {
      driverAvatarUrl = await getSignedUrlForFile(updatedTrip.vehicle.driver.avatar);
    }

    const result = {
      ...updatedTrip,
      imageUrl,
      vehicle: {
        ...updatedTrip.vehicle,
        driver: updatedTrip.vehicle.driver ? { ...updatedTrip.vehicle.driver, avatarUrl: driverAvatarUrl } : null,
      },
    };

    return sendSuccess(res, 'trip.updated', result, language);
  } catch (error) {
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

    return sendSuccess(res, 'trip.deleted', null, language);
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

    return sendSuccess(res, 'trip.restored', null, language);
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
    return sendSuccess(
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
    const { sourceProvinceId, destinationProvinceId, departureDate, returnDate, maxPrice, minPrice, page, pageSize } =
      req.query;

    // Parse pagination parameters
    const pageNum = page ? parseInt(page as string) : parseInt(process.env.PAGINATION_DEFAULT_PAGE as string) || 1;
    const pageSizeNum = pageSize
      ? parseInt(pageSize as string)
      : parseInt(process.env.PAGINATION_DEFAULT_LIMIT as string) || 10;

    // const pageNum = parseInt(page as string);
    // const pageSizeNum = parseInt(pageSize as string);
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
      return sendSuccess(
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

    return sendSuccess(
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
            firstName: true,
            lastName: true,
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

    return sendSuccess(res, 'trip.historyRetrieved', historyWithUsers, language);
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

    return sendSuccess(res, 'seat.statusUpdated', updatedSeat, language);
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

    return sendSuccess(res, 'trip.calendarRetrieved', calendarEvents, language);
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
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
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
                firstName: true,
                lastName: true,
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
        driver: trip.vehicle.driver?.firstName + ' ' + trip.vehicle.driver?.lastName || 'No driver assigned',
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
      return sendSuccess(res, 'trip.dataExported', exportData, language);
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
