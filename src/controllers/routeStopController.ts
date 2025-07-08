import { Request, Response } from 'express';
import { prisma } from '#config/db';
import { queryData, DataQueryParams } from '#utils/dataQuery';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';
import { CommonStatus } from '@prisma/client';
import { deepRemoveTimestamps } from '#src/helpers/dataHelper';

/**
 * Get list of route stops
 */
export const getRouteStopList = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const page = req.query.page
      ? parseInt(req.query.page as string)
      : parseInt(process.env.PAGINATION_DEFAULT_PAGE as string) || 1;
    const pageSize = req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : parseInt(process.env.PAGINATION_DEFAULT_LIMIT as string) || 10;
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

    // Define enum fields for RouteStop model
    const enumFields = {
      status: Object.values(CommonStatus),
    };

    // Prepare query parameters
    const queryParams: DataQueryParams = {
      page,
      pageSize,
      filters,
      sort,
      returnAll,
      relations: ['route', 'busStop'],
      enumFields,
    };

    const result = await queryData(prisma.routeStop, queryParams);

    return sendSuccess(res, 'routeStop.listRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving route stop list:', error);
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
 * Get route stops by routeId with pickup and dropoff points separated
 */
export const getRouteStopsByRouteForTripFilter = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  const { routeId } = req.params;

  if (!routeId) {
    return sendBadRequest(res, 'common.missingRouteId', { error: 'Route ID is required' }, language);
  }

  try {
    // First get the route to access source and destination province IDs
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: {
        id: true,
        sourceProvinceId: true,
        destinationProvinceId: true,
      },
    });

    if (!route) {
      return sendNotFound(res, 'route.notFound', null, language);
    }

    // Get all route stops for this route with necessary relations
    const routeStops = await prisma.routeStop.findMany({
      where: {
        routeId: routeId,
        isDeleted: false,
      },
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
    });

    // Separate into pickup and dropoff points
    const pickupPoints: any[] = [];
    const dropoffPoints: any[] = [];

    routeStops.forEach((routeStop) => {
      const provinceId = routeStop.busStop.ward?.district?.province?.id;

      const stopData = {
        id: routeStop.id,
        stopOrder: routeStop.stopOrder,
        status: routeStop.status,
        busStop: {
          id: routeStop.busStop.id,
          name: routeStop.busStop.name,
          wardId: routeStop.busStop.wardId,
          address: routeStop.busStop.address,
          latitude: routeStop.busStop.latitude,
          longitude: routeStop.busStop.longitude,
          status: routeStop.busStop.status,
          isDeleted: routeStop.busStop.isDeleted,
          createdAt: routeStop.busStop.createdAt,
          updatedAt: routeStop.busStop.updatedAt,
          deletedAt: routeStop.busStop.deletedAt,
        },
      };

      // Check if busStop's province matches source province (pickup)
      if (provinceId === route.sourceProvinceId) {
        pickupPoints.push(stopData);
      }

      // Check if busStop's province matches destination province (dropoff)
      if (provinceId === route.destinationProvinceId) {
        dropoffPoints.push(stopData);
      }
    });

    const result = deepRemoveTimestamps({
      pickupPoints,
      dropoffPoints,
    });

    return sendSuccess(res, 'routeStop.pointsRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving route stops by route ID:', error);
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
 * Get route stop details
 */
export const getRouteStopDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const routeStop = await prisma.routeStop.findUnique({
      where: { id },
      include: {
        route: {
          include: {
            sourceProvince: true,
            destinationProvince: true,
          },
        },
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
    });

    if (!routeStop) {
      return sendNotFound(res, 'routeStop.notFound', null, language);
    }

    return sendSuccess(res, 'routeStop.detailsRetrieved', { routeStop }, language);
  } catch (error) {
    console.error('Error retrieving route stop details:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Get all stops for a specific route
 */
export const getRouteStopsByRoute = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { routeId } = req.params;

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return sendNotFound(res, 'route.notFound', null, language);
    }

    // Get all stops for this route
    const routeStops = await prisma.routeStop.findMany({
      where: {
        routeId,
        isDeleted: false,
      },
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
    });

    return sendSuccess(res, 'routeStop.byRouteRetrieved', { route, stops: routeStops }, language);
  } catch (error) {
    console.error('Error retrieving route stops by route:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Get all routes that stop at a specific bus stop
 */
export const getRouteStopsByBusStop = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { busStopId } = req.params;

    // Check if bus stop exists
    const busStop = await prisma.busStop.findUnique({
      where: { id: busStopId },
    });

    if (!busStop) {
      return sendNotFound(res, 'busStop.notFound', null, language);
    }

    // Get all routes that stop at this bus stop
    const routeStops = await prisma.routeStop.findMany({
      where: {
        busStopId,
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
      orderBy: [
        {
          route: {
            name: 'asc',
          },
        },
        {
          stopOrder: 'asc',
        },
      ],
    });

    return sendSuccess(res, 'routeStop.byBusStopRetrieved', { busStop, routeStops }, language);
  } catch (error) {
    console.error('Error retrieving route stops by bus stop:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Create a new route stop
 */
export const createRouteStop = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { routeId, busStopId, stopOrder, estimatedArrivalTime, estimatedDepartureTime } = req.body;

    // Validate required fields
    if (!routeId || !busStopId || stopOrder === undefined) {
      return sendBadRequest(res, 'routeStop.missingRequiredFields', null, language);
    }

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return sendNotFound(res, 'route.notFound', null, language);
    }

    // Check if bus stop exists
    const busStop = await prisma.busStop.findUnique({
      where: { id: busStopId },
    });

    if (!busStop) {
      return sendNotFound(res, 'busStop.notFound', null, language);
    }

    // Check if the stop order is already in use for this route
    const existingStopOrder = await prisma.routeStop.findFirst({
      where: {
        routeId,
        stopOrder: parseInt(stopOrder),
        isDeleted: false,
      },
    });

    if (existingStopOrder) {
      return sendBadRequest(res, 'routeStop.stopOrderInUse', null, language);
    }

    // Check if this bus stop is already in the route
    const existingBusStop = await prisma.routeStop.findFirst({
      where: {
        routeId,
        busStopId,
        isDeleted: false,
      },
    });

    if (existingBusStop) {
      return sendBadRequest(res, 'routeStop.busStopAlreadyInRoute', null, language);
    }

    // Parse time fields
    let arrivalTime = null;
    let departureTime = null;

    if (estimatedArrivalTime) {
      arrivalTime = new Date(estimatedArrivalTime);
    }

    if (estimatedDepartureTime) {
      departureTime = new Date(estimatedDepartureTime);
    }

    // Create the route stop in the database
    const newRouteStop = await prisma.routeStop.create({
      data: {
        routeId,
        busStopId,
        stopOrder: parseInt(stopOrder),
        estimatedArrivalTime: arrivalTime,
        estimatedDepartureTime: departureTime,
        status: CommonStatus.ACTIVE,
        isDeleted: false,
      },
      include: {
        route: true,
        busStop: true,
      },
    });

    return sendSuccess(res, 'routeStop.created', { routeStop: newRouteStop }, language);
  } catch (error) {
    console.error('Error creating route stop:', error);
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
 * Update an existing route stop
 */
export const updateRouteStop = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if route stop exists
    const routeStop = await prisma.routeStop.findUnique({
      where: { id },
    });

    if (!routeStop) {
      return sendNotFound(res, 'routeStop.notFound', null, language);
    }

    // Extract update data from request body
    const { stopOrder, estimatedArrivalTime, estimatedDepartureTime, status } = req.body;

    // Build update object
    const updateData: any = {};

    // Basic route stop info
    if (stopOrder !== undefined) {
      // Check if the new stop order is already in use for this route
      if (parseInt(stopOrder) !== routeStop.stopOrder) {
        const existingStopOrder = await prisma.routeStop.findFirst({
          where: {
            routeId: routeStop.routeId,
            stopOrder: parseInt(stopOrder),
            id: { not: id },
            isDeleted: false,
          },
        });

        if (existingStopOrder) {
          return sendBadRequest(res, 'routeStop.stopOrderInUse', null, language);
        }
      }

      updateData.stopOrder = parseInt(stopOrder);
    }

    // Parse time fields
    if (estimatedArrivalTime !== undefined) {
      updateData.estimatedArrivalTime = estimatedArrivalTime ? new Date(estimatedArrivalTime) : null;
    }

    if (estimatedDepartureTime !== undefined) {
      updateData.estimatedDepartureTime = estimatedDepartureTime ? new Date(estimatedDepartureTime) : null;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    // Update route stop
    const updatedRouteStop = await prisma.routeStop.update({
      where: { id },
      data: updateData,
      include: {
        route: true,
        busStop: true,
      },
    });

    return sendSuccess(res, 'routeStop.updated', { routeStop: updatedRouteStop }, language);
  } catch (error) {
    console.error('Error updating route stop:', error);
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
 * Soft delete route stop
 */
export const softDeleteRouteStop = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if route stop exists
    const routeStop = await prisma.routeStop.findUnique({
      where: { id },
    });

    if (!routeStop) {
      return sendNotFound(res, 'routeStop.notFound', null, language);
    }

    // Update route stop status to inactive
    const updatedRouteStop = await prisma.routeStop.update({
      where: { id },
      data: {
        status: CommonStatus.INACTIVE,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return sendSuccess(res, 'routeStop.deleted', { routeStop: updatedRouteStop }, language);
  } catch (error) {
    console.error('Error deleting route stop:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Restore deleted route stop
 */
export const restoreRouteStop = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if route stop exists
    const routeStop = await prisma.routeStop.findUnique({
      where: { id },
    });

    if (!routeStop) {
      return sendNotFound(res, 'routeStop.notFound', null, language);
    }

    // Restore route stop by changing status to active and isDeleted to false
    const updatedRouteStop = await prisma.routeStop.update({
      where: { id },
      data: {
        status: CommonStatus.ACTIVE,
        isDeleted: false,
        deletedAt: null,
      },
    });

    return sendSuccess(res, 'routeStop.restored', { routeStop: updatedRouteStop }, language);
  } catch (error) {
    console.error('Error restoring route stop:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Bulk create route stops
 */
export const bulkCreateRouteStops = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { routeId, stops } = req.body;

    // Validate required fields
    if (!routeId || !stops || !Array.isArray(stops) || stops.length === 0) {
      return sendBadRequest(res, 'routeStop.invalidBulkCreateData', null, language);
    }

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return sendNotFound(res, 'route.notFound', null, language);
    }

    // Get existing stops for this route
    const existingStops = await prisma.routeStop.findMany({
      where: {
        routeId,
        isDeleted: false,
      },
      select: {
        busStopId: true,
        stopOrder: true,
      },
    });

    // Check for duplicate stop orders and bus stops in the input
    const stopOrders = new Set();
    const busStopIds = new Set();
    for (const stop of stops) {
      if (!stop.busStopId || stop.stopOrder === undefined) {
        return sendBadRequest(res, 'routeStop.missingRequiredFields', null, language);
      }

      if (stopOrders.has(parseInt(stop.stopOrder))) {
        return sendBadRequest(res, 'routeStop.duplicateStopOrder', { stopOrder: stop.stopOrder }, language);
      }

      if (busStopIds.has(stop.busStopId)) {
        return sendBadRequest(res, 'routeStop.duplicateBusStop', { busStopId: stop.busStopId }, language);
      }

      stopOrders.add(parseInt(stop.stopOrder));
      busStopIds.add(stop.busStopId);

      // Check if bus stop exists
      const busStop = await prisma.busStop.findUnique({
        where: { id: stop.busStopId },
      });

      if (!busStop) {
        return sendBadRequest(res, 'busStop.notFound', { busStopId: stop.busStopId }, language);
      }

      // Check conflicts with existing stops
      for (const existingStop of existingStops) {
        if (existingStop.stopOrder === parseInt(stop.stopOrder)) {
          return sendBadRequest(res, 'routeStop.stopOrderInUse', { stopOrder: stop.stopOrder }, language);
        }

        if (existingStop.busStopId === stop.busStopId) {
          return sendBadRequest(res, 'routeStop.busStopAlreadyInRoute', { busStopId: stop.busStopId }, language);
        }
      }
    }

    // Prepare data for bulk create
    const createData = stops.map((stop) => ({
      routeId,
      busStopId: stop.busStopId,
      stopOrder: parseInt(stop.stopOrder),
      estimatedArrivalTime: stop.estimatedArrivalTime ? new Date(stop.estimatedArrivalTime) : null,
      estimatedDepartureTime: stop.estimatedDepartureTime ? new Date(stop.estimatedDepartureTime) : null,
      status: CommonStatus.ACTIVE,
      isDeleted: false,
    }));

    // Create all route stops in a transaction
    const createdStops = await prisma.$transaction(
      createData.map((data) =>
        prisma.routeStop.create({
          data,
          include: {
            busStop: true,
          },
        })
      )
    );

    return sendSuccess(
      res,
      'routeStop.bulkCreated',
      {
        route,
        createdStops,
        count: createdStops.length,
      },
      language
    );
  } catch (error) {
    console.error('Error bulk creating route stops:', error);
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
 * Reorder route stops
 */
export const reorderRouteStops = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { routeId } = req.params;
    const { stopOrders } = req.body;

    // Validate required fields
    if (!routeId || !stopOrders || !Array.isArray(stopOrders) || stopOrders.length === 0) {
      return sendBadRequest(res, 'routeStop.invalidReorderData', null, language);
    }

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return sendNotFound(res, 'route.notFound', null, language);
    }

    // Get existing stops for this route
    const existingStops = await prisma.routeStop.findMany({
      where: {
        routeId,
        isDeleted: false,
      },
    });

    if (existingStops.length !== stopOrders.length) {
      return sendBadRequest(res, 'routeStop.reorderCountMismatch', null, language);
    }

    // Check if all route stops exist
    const existingStopIds = new Set(existingStops.map((stop) => stop.id));
    for (const orderItem of stopOrders) {
      if (!orderItem.id || !existingStopIds.has(orderItem.id)) {
        return sendBadRequest(res, 'routeStop.invalidStopId', { stopId: orderItem.id }, language);
      }
    }

    // Check for duplicate stop orders
    const newOrders = stopOrders.map((item) => parseInt(item.stopOrder));
    if (new Set(newOrders).size !== newOrders.length) {
      return sendBadRequest(res, 'routeStop.duplicateStopOrder', null, language);
    }

    // Update all route stops in a transaction
    const updatedStops = await prisma.$transaction(
      stopOrders.map((item) =>
        prisma.routeStop.update({
          where: { id: item.id },
          data: {
            stopOrder: parseInt(item.stopOrder),
          },
          include: {
            busStop: true,
          },
        })
      )
    );

    // Get all stops for this route in the new order
    const reorderedStops = await prisma.routeStop.findMany({
      where: {
        routeId,
        isDeleted: false,
      },
      include: {
        busStop: true,
      },
      orderBy: {
        stopOrder: 'asc',
      },
    });

    return sendSuccess(
      res,
      'routeStop.reordered',
      {
        route,
        stops: reorderedStops,
      },
      language
    );
  } catch (error) {
    console.error('Error reordering route stops:', error);
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
