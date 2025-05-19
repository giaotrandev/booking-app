import { Request, Response } from 'express';
import { prisma } from '#config/db';
import { queryData, DataQueryParams } from '#utils/dataQuery';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';
import { CommonStatus } from '@prisma/client';

/**
 * Get list of bus stops
 */
export const getBusStopList = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const page = req.query.page
      ? parseInt(req.query.page as string)
      : parseInt(process.env.PAGINATION_DEFAULT_PAGE as string) || 1;
    const pageSize = req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : parseInt(process.env.PAGINATION_DEFAULT_LIMIT as string) || 10;
    const search = req.query.search as string | undefined;
    const searchFields = req.query.searchFields
      ? (req.query.searchFields as string).split(',').map((field) => field.trim())
      : ['name'];
    const returnAll = req.query.returnAll === 'true';

    // Parse sort and filters from query string
    let sort: DataQueryParams['sort'] | undefined;
    let filters: DataQueryParams['filters'] | undefined;

    try {
      if (req.query.sort) {
        sort = JSON.parse(req.query.sort as string);
      }

      if (req.query.filters) {
        const parsedFilters = JSON.parse(req.query.filters as string);
        filters = parsedFilters;
      }
    } catch (parseError) {
      return sendBadRequest(res, 'common.invalidQueryParams', { error: 'Invalid sort or filters format' }, language);
    }

    // Define enum fields for BusStop model
    const enumFields = {
      status: Object.values(CommonStatus),
    };

    // Prepare query parameters
    const queryParams: DataQueryParams = {
      page,
      pageSize,
      search,
      searchFields,
      filters,
      sort,
      returnAll,
      relations: ['ward.district.province'],
      enumFields,
    };

    const result = await queryData(prisma.busStop, queryParams);

    return sendSuccess(res, 'busStop.listRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving bus stop list:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error
        ? {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          }
        : null,
      language
    );
  }
};

/**
 * Get bus stop details
 */
export const getBusStopDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const busStop = await prisma.busStop.findUnique({
      where: { id },
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
        routeStops: {
          where: { isDeleted: false },
          include: {
            route: true,
          },
        },
      },
    });

    if (!busStop) {
      return sendNotFound(res, 'busStop.notFound', null, language);
    }

    return sendSuccess(res, 'busStop.detailsRetrieved', { busStop }, language);
  } catch (error) {
    console.error('Error retrieving bus stop details:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Create a new bus stop
 */
export const createBusStop = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { name, wardId, latitude, longitude } = req.body;

    // Validate required fields
    if (!name || !wardId) {
      return sendBadRequest(res, 'busStop.missingRequiredFields', null, language);
    }

    // Check if ward exists
    const ward = await prisma.ward.findUnique({
      where: { id: wardId },
    });

    if (!ward) {
      return sendNotFound(res, 'busStop.wardNotFound', null, language);
    }

    // Create the bus stop in the database
    const newBusStop = await prisma.busStop.create({
      data: {
        name,
        wardId,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        status: CommonStatus.ACTIVE,
        isDeleted: false,
      },
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
    });

    return sendSuccess(res, 'busStop.created', { busStop: newBusStop }, language);
  } catch (error) {
    console.error('Error creating bus stop:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error
        ? {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          }
        : null,
      language
    );
  }
};

/**
 * Update an existing bus stop
 */
export const updateBusStop = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if bus stop exists
    const busStop = await prisma.busStop.findUnique({
      where: { id },
    });

    if (!busStop) {
      return sendNotFound(res, 'busStop.notFound', null, language);
    }

    // Extract update data from request body
    const { name, wardId, latitude, longitude, status } = req.body;

    // Build update object
    const updateData: any = {};

    // Basic bus stop info
    if (name !== undefined) updateData.name = name;
    if (wardId !== undefined) updateData.wardId = wardId;
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    if (status !== undefined) updateData.status = status;

    // Check if ward exists if provided
    if (wardId) {
      const ward = await prisma.ward.findUnique({
        where: { id: wardId },
      });

      if (!ward) {
        sendNotFound(res, 'busStop.wardNotFound', null, language);
        return;
      }
    }

    // Update bus stop
    const updatedBusStop = await prisma.busStop.update({
      where: { id },
      data: updateData,
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
    });

    return sendSuccess(res, 'busStop.updated', { busStop: updatedBusStop }, language);
  } catch (error) {
    console.error('Error updating bus stop:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error
        ? {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          }
        : null,
      language
    );
  }
};

/**
 * Soft delete bus stop
 */
export const softDeleteBusStop = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if bus stop exists
    const busStop = await prisma.busStop.findUnique({
      where: { id },
    });

    if (!busStop) {
      return sendNotFound(res, 'busStop.notFound', null, language);
    }

    // Check if bus stop is used in any active route stops
    const activeRouteStops = await prisma.routeStop.findMany({
      where: {
        busStopId: id,
        isDeleted: false,
        status: CommonStatus.ACTIVE,
      },
    });

    if (activeRouteStops.length > 0) {
      return sendBadRequest(res, 'busStop.inUseByRoutes', { routeStopCount: activeRouteStops.length }, language);
    }

    // Update bus stop status to inactive
    const updatedBusStop = await prisma.busStop.update({
      where: { id },
      data: {
        status: CommonStatus.INACTIVE,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return sendSuccess(res, 'busStop.deleted', { busStop: updatedBusStop }, language);
  } catch (error) {
    console.error('Error deleting bus stop:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Restore deleted bus stop
 */
export const restoreBusStop = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if bus stop exists
    const busStop = await prisma.busStop.findUnique({
      where: { id },
    });

    if (!busStop) {
      return sendNotFound(res, 'busStop.notFound', null, language);
    }

    // Restore bus stop by changing status to active and isDeleted to false
    const updatedBusStop = await prisma.busStop.update({
      where: { id },
      data: {
        status: CommonStatus.ACTIVE,
        isDeleted: false,
        deletedAt: null,
      },
    });

    return sendSuccess(res, 'busStop.restored', { busStop: updatedBusStop }, language);
  } catch (error) {
    console.error('Error restoring bus stop:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Get routes that pass through a specific bus stop
 */
export const getRoutesByBusStop = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if bus stop exists
    const busStop = await prisma.busStop.findUnique({
      where: { id },
    });

    if (!busStop) {
      return sendNotFound(res, 'busStop.notFound', null, language);
    }

    // Get all routes that pass through this bus stop
    const routeStops = await prisma.routeStop.findMany({
      where: {
        busStopId: id,
        isDeleted: false,
      },
      include: {
        route: {
          include: {
            sourceProvince: true,
            destinationProvince: true,
          },
        },
      },
      orderBy: {
        stopOrder: 'asc',
      },
    });

    // Extract unique routes
    const routes = routeStops.map((rs) => ({
      ...rs.route,
      stopOrder: rs.stopOrder,
      estimatedArrivalTime: rs.estimatedArrivalTime,
      estimatedDepartureTime: rs.estimatedDepartureTime,
    }));

    return sendSuccess(res, 'busStop.routesRetrieved', { busStop, routes }, language);
  } catch (error) {
    console.error('Error retrieving routes by bus stop:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Get nearby bus stops based on coordinates
 */
export const getNearbyBusStops = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { latitude, longitude, radius } = req.query;
    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusKm = parseFloat(radius as string) || 2; // Default 2km

    if (isNaN(lat) || isNaN(lng)) {
      return sendBadRequest(res, 'busStop.invalidCoordinates', null, language);
    }

    // Get all bus stops with coordinates
    const allBusStops = await prisma.busStop.findMany({
      where: {
        isDeleted: false,
        status: CommonStatus.ACTIVE,
        latitude: { not: null },
        longitude: { not: null },
      },
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
    });

    // Calculate distances and filter by radius
    const nearbyBusStops = allBusStops
      .map((busStop) => {
        // Calculate distance using Haversine formula
        const R = 6371; // Earth radius in km
        const dLat = ((busStop.latitude! - lat) * Math.PI) / 180;
        const dLon = ((busStop.longitude! - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((busStop.latitude! * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km

        return {
          ...busStop,
          distance,
        };
      })
      .filter((busStop) => busStop.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return sendSuccess(res, 'busStop.nearbyRetrieved', { busStops: nearbyBusStops }, language);
  } catch (error) {
    console.error('Error retrieving nearby bus stops:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};
