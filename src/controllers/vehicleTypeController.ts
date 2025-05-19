import { Request, Response } from 'express';
import { prisma } from '#config/db';
import { queryData, DataQueryParams } from '#utils/dataQuery';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';
import { CommonStatus } from '@prisma/client';
import { getSignedUrlForFile } from '#src/services/r2Service';

/**
 * Get list of vehicle types
 */
export const getVehicleTypeList = async (req: Request, res: Response): Promise<void> => {
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
      : ['name', 'description'];
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
    // Define enum fields for VehicleType model
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
      enumFields,
    };

    const result = await queryData(prisma.vehicleType, queryParams);

    return sendSuccess(res, 'vehicleType.listRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving vehicle type list:', error);
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
 * Get vehicle type details
 */
export const getVehicleTypeDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id },
      include: {
        vehicles: {
          where: { isDeleted: false },
          select: {
            id: true,
            plateNumber: true,
            registrationCode: true,
            status: true,
          },
        },
      },
    });

    if (!vehicleType) {
      return sendNotFound(res, 'vehicleType.notFound', null, language);
    }

    return sendSuccess(res, 'vehicleType.detailsRetrieved', { vehicleType }, language);
  } catch (error) {
    console.error('Error retrieving vehicle type details:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Create a new vehicle type
 */
export const createVehicleType = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { name, description, seatConfiguration } = req.body;

    // Validate required fields
    if (!name || !seatConfiguration) {
      return sendBadRequest(res, 'vehicleType.missingRequiredFields', null, language);
    }

    // Check if name already exists
    const existingVehicleType = await prisma.vehicleType.findUnique({
      where: { name },
    });

    if (existingVehicleType) {
      return sendBadRequest(res, 'vehicleType.nameAlreadyExists', null, language);
    }

    // Validate seat configuration JSON
    let parsedSeatConfiguration;
    try {
      // If seatConfiguration is already an object, use it, otherwise parse it
      parsedSeatConfiguration =
        typeof seatConfiguration === 'string' ? JSON.parse(seatConfiguration) : seatConfiguration;

      // Basic validation: Check if seatConfiguration has rows and columns
      if (!parsedSeatConfiguration.rows || !Array.isArray(parsedSeatConfiguration.seats)) {
        return sendBadRequest(res, 'vehicleType.invalidSeatConfiguration', null, language);
      }
    } catch (error) {
      return sendBadRequest(res, 'vehicleType.invalidJsonFormat', null, language);
    }

    // Create the vehicle type in the database
    const newVehicleType = await prisma.vehicleType.create({
      data: {
        name,
        description,
        seatConfiguration: parsedSeatConfiguration,
        status: CommonStatus.ACTIVE,
        isDeleted: false,
      },
    });

    return sendSuccess(res, 'vehicleType.created', { vehicleType: newVehicleType }, language);
  } catch (error) {
    console.error('Error creating vehicle type:', error);
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
 * Update an existing vehicle type
 */
export const updateVehicleType = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string })?.userId;

    // Check if vehicle type exists
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id },
    });

    if (!vehicleType) {
      return sendNotFound(res, 'vehicleType.notFound', null, language);
    }

    // Extract update data from request body
    const { name, description, seatConfiguration, status, changeReason } = req.body;

    // Build update object
    const updateData: any = {};

    // Basic vehicle type info
    if (name !== undefined) {
      // Check if the new name is already in use
      if (name !== vehicleType.name) {
        const existingVehicleType = await prisma.vehicleType.findUnique({
          where: { name },
        });

        if (existingVehicleType) {
          return sendBadRequest(res, 'vehicleType.nameAlreadyExists', null, language);
        }
      }

      updateData.name = name;
    }

    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    // Parse seat configuration if provided
    if (seatConfiguration !== undefined) {
      let parsedSeatConfiguration;
      try {
        // If seatConfiguration is already an object, use it, otherwise parse it
        parsedSeatConfiguration =
          typeof seatConfiguration === 'string' ? JSON.parse(seatConfiguration) : seatConfiguration;

        // Basic validation: Check if seatConfiguration has rows and columns
        if (!parsedSeatConfiguration.rows || !Array.isArray(parsedSeatConfiguration.seats)) {
          return sendBadRequest(res, 'vehicleType.invalidSeatConfiguration', null, language);
        }

        updateData.seatConfiguration = parsedSeatConfiguration;
      } catch (error) {
        return sendBadRequest(res, 'vehicleType.invalidJsonFormat', null, language);
      }
    }

    // Track changed fields for history
    const changedFields: any = {};
    Object.keys(updateData).forEach((key) => {
      if (key === 'seatConfiguration') {
        if (JSON.stringify(vehicleType[key]) !== JSON.stringify(updateData[key])) {
          changedFields[key] = {
            oldValue: vehicleType[key as keyof typeof vehicleType],
            newValue: updateData[key],
          };
        }
      } else if (key in vehicleType && vehicleType[key as keyof typeof vehicleType] !== updateData[key]) {
        changedFields[key] = {
          oldValue: vehicleType[key as keyof typeof vehicleType],
          newValue: updateData[key],
        };
      }
    });

    // Update vehicle type
    const updatedVehicleType = await prisma.vehicleType.update({
      where: { id },
      data: updateData,
    });

    // Create history record if changes were made
    if (Object.keys(changedFields).length > 0) {
      await prisma.vehicleTypeHistory.create({
        data: {
          vehicleTypeId: id,
          changedFields: changedFields,
          changedBy: currentUserId,
          changeReason: changeReason,
        },
      });
    }

    return sendSuccess(res, 'vehicleType.updated', { vehicleType: updatedVehicleType }, language);
  } catch (error) {
    console.error('Error updating vehicle type:', error);
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
 * Soft delete vehicle type
 */
export const softDeleteVehicleType = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string })?.userId;
    const { changeReason } = req.body;

    // Check if vehicle type exists
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id },
      include: {
        vehicles: {
          where: {
            isDeleted: false,
            status: 'ACTIVE',
          },
        },
      },
    });

    if (!vehicleType) {
      return sendNotFound(res, 'vehicleType.notFound', null, language);
    }

    // Check if there are active vehicles using this type
    if (vehicleType.vehicles.length > 0) {
      return sendBadRequest(res, 'vehicleType.inUseByVehicles', { count: vehicleType.vehicles.length }, language);
    }

    // Update vehicle type status to inactive
    const updatedVehicleType = await prisma.vehicleType.update({
      where: { id },
      data: {
        status: CommonStatus.INACTIVE,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Create history record
    await prisma.vehicleTypeHistory.create({
      data: {
        vehicleTypeId: id,
        changedFields: {
          status: {
            oldValue: vehicleType.status,
            newValue: CommonStatus.INACTIVE,
          },
          isDeleted: {
            oldValue: vehicleType.isDeleted,
            newValue: true,
          },
          deletedAt: {
            oldValue: vehicleType.deletedAt,
            newValue: new Date(),
          },
        },
        changedBy: currentUserId,
        changeReason: changeReason || 'Vehicle type soft deleted',
      },
    });

    return sendSuccess(res, 'vehicleType.deleted', { vehicleType: updatedVehicleType }, language);
  } catch (error) {
    console.error('Error deleting vehicle type:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Restore deleted vehicle type
 */
export const restoreVehicleType = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string })?.userId;
    const { changeReason } = req.body;

    // Check if vehicle type exists
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id },
    });

    if (!vehicleType) {
      return sendNotFound(res, 'vehicleType.notFound', null, language);
    }

    // Restore vehicle type by changing status to active and isDeleted to false
    const updatedVehicleType = await prisma.vehicleType.update({
      where: { id },
      data: {
        status: CommonStatus.ACTIVE,
        isDeleted: false,
        deletedAt: null,
      },
    });

    // Create history record
    await prisma.vehicleTypeHistory.create({
      data: {
        vehicleTypeId: id,
        changedFields: {
          status: {
            oldValue: vehicleType.status,
            newValue: CommonStatus.ACTIVE,
          },
          isDeleted: {
            oldValue: vehicleType.isDeleted,
            newValue: false,
          },
          deletedAt: {
            oldValue: vehicleType.deletedAt,
            newValue: null,
          },
        },
        changedBy: currentUserId,
        changeReason: changeReason || 'Vehicle type restored',
      },
    });

    return sendSuccess(res, 'vehicleType.restored', { vehicleType: updatedVehicleType }, language);
  } catch (error) {
    console.error('Error restoring vehicle type:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Get vehicle type history
 */
export const getVehicleTypeHistory = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if vehicle type exists
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id },
    });

    if (!vehicleType) {
      return sendNotFound(res, 'vehicleType.notFound', null, language);
    }

    // Get vehicle type history
    const history = await prisma.vehicleTypeHistory.findMany({
      where: { vehicleTypeId: id },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, 'vehicleType.historyRetrieved', { vehicleType, history }, language);
  } catch (error) {
    console.error('Error retrieving vehicle type history:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Get vehicles by type
 */
export const getVehiclesByType = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const { status } = req.query;

    // Check if vehicle type exists
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id },
    });

    if (!vehicleType) {
      return sendNotFound(res, 'vehicleType.notFound', null, language);
    }

    // Build filter
    const filter: any = {
      vehicleTypeId: id,
      isDeleted: false,
    };

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    // Get vehicles with this type
    const vehicles = await prisma.vehicle.findMany({
      where: filter,
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });

    // Generate signed URLs for vehicle images
    const vehiclesWithImages = await Promise.all(
      vehicles.map(async (vehicle: any) => {
        let imageUrl = null;
        if (vehicle.image) {
          imageUrl = await getSignedUrlForFile(vehicle.image);
        }
        return { ...vehicle, imageUrl };
      })
    );

    return sendSuccess(
      res,
      'vehicleType.vehiclesRetrieved',
      {
        vehicleType,
        vehicles: vehiclesWithImages,
        count: vehicles.length,
      },
      language
    );
  } catch (error) {
    console.error('Error retrieving vehicles by type:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};
