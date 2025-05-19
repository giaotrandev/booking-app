import { Request, Response } from 'express';
import { Request as MulterRequest } from 'express-serve-static-core';
import fs from 'fs';
import { uploadFileToR2, getSignedUrlForFile, deleteFileFromR2, StorageFolders } from '#services/r2Service';
import { optimizeImage } from '#services/imageService';
import { prisma } from '#config/db';
import { queryData, DataQueryParams } from '#utils/dataQuery';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError, sendForbidden } from '#utils/apiResponse';
import { VehicleStatus } from '@prisma/client';
import safeDeleteFile from '#utils/safeDeleteFile';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

/**
 * Get list of vehicles
 */
export const getVehicleList = async (req: Request, res: Response): Promise<void> => {
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
      : ['plateNumber', 'registrationCode'];
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

    // Define enum fields for Vehicle model
    const enumFields = {
      status: Object.values(VehicleStatus),
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
      relations: ['vehicleType', 'driver'],
      enumFields,
    };

    const result = await queryData(prisma.vehicle, queryParams);

    // Generate signed URLs for vehicle images
    const vehiclesWithImages = await Promise.all(
      result.data.map(async (vehicle: any) => {
        let imageUrl = null;
        if (vehicle.image) {
          imageUrl = await getSignedUrlForFile(vehicle.image);
        }
        return { ...vehicle, imageUrl };
      })
    );

    result.data = vehiclesWithImages;

    return sendSuccess(res, 'vehicle.listRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving vehicle list:', error);
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
 * Get vehicle details
 */
export const getVehicleDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        vehicleType: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            avatar: true,
          },
        },
      },
    });

    if (!vehicle) {
      return sendNotFound(res, 'vehicle.notFound', null, language);
    }

    // Get vehicle image URL if exists
    let imageUrl = null;
    if (vehicle.image) {
      imageUrl = await getSignedUrlForFile(vehicle.image);
    }

    // Get driver avatar URL if exists
    let driverAvatarUrl = null;
    if (vehicle.driver && vehicle.driver.avatar) {
      driverAvatarUrl = await getSignedUrlForFile(vehicle.driver.avatar);
    }

    const response = {
      ...vehicle,
      imageUrl,
      driver: vehicle.driver ? { ...vehicle.driver, avatarUrl: driverAvatarUrl } : null,
    };

    return sendSuccess(res, 'vehicle.detailsRetrieved', { vehicle: response }, language);
  } catch (error) {
    console.error('Error retrieving vehicle details:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Create a new vehicle
 */
export const createVehicle = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { plateNumber, registrationCode, vehicleTypeId, driverId, registrationExpiryDate } = req.body;

    // Validate required fields
    if (!plateNumber || !registrationCode || !vehicleTypeId || !registrationExpiryDate) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendBadRequest(res, 'vehicle.missingRequiredFields', null, language);
    }

    // Check if plate number or registration code already exists
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [{ plateNumber }, { registrationCode }],
      },
    });

    if (existingVehicle) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }

      const errorMessage =
        existingVehicle.plateNumber === plateNumber
          ? 'vehicle.plateNumberAlreadyExists'
          : 'vehicle.registrationCodeAlreadyExists';

      return sendBadRequest(res, errorMessage, null, language);
    }

    // Check if vehicle type exists
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id: vehicleTypeId },
    });

    if (!vehicleType) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendNotFound(res, 'vehicle.vehicleTypeNotFound', null, language);
    }

    // Check if driver exists if provided
    if (driverId) {
      const driver = await prisma.user.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        // Delete temporary file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        return sendNotFound(res, 'vehicle.driverNotFound', null, language);
      }
    }

    // Handle file upload if present
    let imageKey = null;

    if (req.file) {
      // Optimize the image
      const optimizedImagePath = await optimizeImage(req.file.path, {
        width: 800,
        height: 600,
        quality: 80,
        format: 'webp',
      });

      // Create a unique key for the vehicle image
      const fileExtension = '.webp';
      const fileName = `${plateNumber.replace(/\s+/g, '')}_${Date.now()}${fileExtension}`;
      const filePath = `${StorageFolders.VEHICLES}`;
      const fileKey = `${StorageFolders.VEHICLES}/${fileName}`;

      // Upload to Cloudflare R2
      await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');

      // Set image key
      imageKey = fileKey;

      // Delete temporary files
      await safeDeleteFile(req.file.path);
      await safeDeleteFile(optimizedImagePath);
    }

    // Create the vehicle in the database
    const newVehicle = await prisma.vehicle.create({
      data: {
        plateNumber,
        registrationCode,
        vehicleTypeId,
        driverId: driverId || null,
        registrationExpiryDate: new Date(registrationExpiryDate),
        image: imageKey,
        status: VehicleStatus.ACTIVE,
        isDeleted: false,
      },
      include: {
        vehicleType: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });

    // Get image URL if exists
    let imageUrl = null;
    if (newVehicle.image) {
      imageUrl = await getSignedUrlForFile(newVehicle.image);
    }

    return sendSuccess(res, 'vehicle.created', { vehicle: { ...newVehicle, imageUrl } }, language);
  } catch (error) {
    // Delete temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      await safeDeleteFile(req.file.path);
    }

    console.error('Error creating vehicle:', error);
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
 * Update an existing vehicle
 */
export const updateVehicle = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string })?.userId;

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendNotFound(res, 'vehicle.notFound', null, language);
    }

    // Extract update data from request body
    const { vehicleTypeId, driverId, registrationExpiryDate, status, changeReason } = req.body;

    // Build update object
    const updateData: any = {};

    // Basic vehicle info
    if (vehicleTypeId !== undefined) updateData.vehicleTypeId = vehicleTypeId;
    if (driverId !== undefined) updateData.driverId = driverId || null;
    if (registrationExpiryDate !== undefined) updateData.registrationExpiryDate = new Date(registrationExpiryDate);
    if (status !== undefined) updateData.status = status;

    // Check if vehicle type exists if provided
    if (vehicleTypeId) {
      const vehicleType = await prisma.vehicleType.findUnique({
        where: { id: vehicleTypeId },
      });

      if (!vehicleType) {
        // Delete temporary file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        return sendNotFound(res, 'vehicle.vehicleTypeNotFound', null, language);
      }
    }

    // Check if driver exists if provided
    if (driverId) {
      const driver = await prisma.user.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        // Delete temporary file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
          await safeDeleteFile(req.file.path);
        }
        return sendNotFound(res, 'vehicle.driverNotFound', null, language);
      }
    }

    // Track changed fields for history
    const changedFields: any = {};
    Object.keys(updateData).forEach((key) => {
      const typedKey = key as keyof typeof vehicle;
      if (vehicle[typedKey] !== updateData[typedKey]) {
        changedFields[key] = {
          oldValue: vehicle[typedKey],
          newValue: updateData[typedKey],
        };
      }
    });
    if (req.file) {
      // Optimize the image
      const optimizedImagePath = await optimizeImage(req.file.path, {
        width: 800,
        height: 600,
        quality: 80,
        format: 'webp',
      });

      // Create a unique key for the vehicle image
      const fileExtension = '.webp';
      const fileName = `${vehicle.plateNumber.replace(/\s+/g, '')}_${Date.now()}${fileExtension}`;
      const filePath = `${StorageFolders.VEHICLES}`;
      const fileKey = `${StorageFolders.VEHICLES}/${fileName}`;

      // Upload to Cloudflare R2
      await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');

      // Delete the old image from R2 if it exists
      if (vehicle.image) {
        try {
          await deleteFileFromR2(vehicle.image);
        } catch (deleteError) {
          console.error('Error deleting old vehicle image:', deleteError);
        }
      }

      // Add image path to update data
      updateData.image = fileKey;
      changedFields.image = {
        oldValue: vehicle.image,
        newValue: fileKey,
      };

      // Delete temporary files
      await safeDeleteFile(req.file.path);
      await safeDeleteFile(optimizedImagePath);
    }

    // Update vehicle
    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        vehicleType: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });

    // Create history record if changes were made
    if (Object.keys(changedFields).length > 0) {
      await prisma.vehicleHistory.create({
        data: {
          vehicleId: id,
          changedFields: changedFields,
          changedBy: currentUserId,
          changeReason: changeReason,
        },
      });
    }

    // Get image URL if exists
    let imageUrl = null;
    if (updatedVehicle.image) {
      imageUrl = await getSignedUrlForFile(updatedVehicle.image);
    }

    return sendSuccess(res, 'vehicle.updated', { vehicle: { ...updatedVehicle, imageUrl } }, language);
  } catch (error) {
    // Delete temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      await safeDeleteFile(req.file.path);
    }

    console.error('Error updating vehicle:', error);
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
 * Upload vehicle image
 */
export const uploadVehicleImage = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendNotFound(res, 'vehicle.notFound', null, language);
    }

    if (!req.file) {
      return sendBadRequest(res, 'vehicle.noFileUploaded', null, language);
    }

    // Optimize the image
    const optimizedImagePath = await optimizeImage(req.file.path, {
      width: 800,
      height: 600,
      quality: 80,
      format: 'webp',
    });

    // Create a unique key for the vehicle image
    const fileExtension = '.webp';
    const fileName = `${vehicle.plateNumber.replace(/\s+/g, '')}_${Date.now()}${fileExtension}`;
    const filePath = `${StorageFolders.VEHICLES}`;
    const fileKey = `${StorageFolders.VEHICLES}/${fileName}`;

    try {
      // Upload to Cloudflare R2
      await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');

      // Delete the old image from R2 if it exists
      if (vehicle.image) {
        try {
          await deleteFileFromR2(vehicle.image);
        } catch (deleteError) {
          console.error('Error deleting old vehicle image:', deleteError);
          // Continue anyway, we don't want to fail the upload because of this
        }
      }
    } catch (uploadError) {
      console.error('Error during R2 operations:', uploadError);

      // Clean up files safely
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      if (fs.existsSync(optimizedImagePath)) {
        await safeDeleteFile(optimizedImagePath);
      }
      return sendServerError(
        res,
        'vehicle.imageUploadFailed',
        { message: uploadError instanceof Error ? uploadError.message : 'Unknown error occurred' },
        language
      );
    }

    // Update vehicle with new image path
    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        image: fileKey,
      },
    });

    // Create history record
    await prisma.vehicleHistory.create({
      data: {
        vehicleId: id,
        changedFields: {
          image: {
            oldValue: vehicle.image,
            newValue: fileKey,
          },
        },
        changedBy: (req.user as { userId: string })?.userId,
        changeReason: 'Vehicle image updated',
      },
    });

    // Delete temporary files
    await safeDeleteFile(req.file.path);
    await safeDeleteFile(optimizedImagePath);

    // Generate a pre-signed URL for immediate use
    let imageUrl = null;
    try {
      imageUrl = await getSignedUrlForFile(fileKey);
    } catch (urlError) {
      console.error('Error generating signed URL for new vehicle image:', urlError);
      // Continue anyway, the image is uploaded but we just can't get the URL right now
    }

    return sendSuccess(
      res,
      'vehicle.imageUploaded',
      {
        vehicle: updatedVehicle,
        imageUrl: imageUrl,
      },
      language
    );
  } catch (error) {
    // Delete temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      await safeDeleteFile(req.file.path);
    }

    console.error('Error uploading vehicle image:', error);
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
 * Get vehicle image
 */
export const getVehicleImage = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: {
        id: true,
        plateNumber: true,
        registrationCode: true,
        image: true,
      },
    });

    if (!vehicle) {
      sendNotFound(res, 'vehicle.notFound', null, language);
      return;
    }

    // Get image URL if exists
    let imageUrl = null;
    if (vehicle.image) {
      imageUrl = await getSignedUrlForFile(vehicle.image);
    }

    return sendSuccess(
      res,
      'vehicle.imageRetrieved',
      {
        vehicle: {
          id: vehicle.id,
          plateNumber: vehicle.plateNumber,
          registrationCode: vehicle.registrationCode,
        },
        imageUrl,
      },
      language
    );
  } catch (error) {
    console.error('Error retrieving vehicle image:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Soft delete vehicle
 */
export const softDeleteVehicle = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string })?.userId;
    const { changeReason } = req.body;

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      return sendNotFound(res, 'vehicle.notFound', null, language);
    }

    // Update vehicle status to inactive
    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        status: VehicleStatus.INACTIVE,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Create history record
    await prisma.vehicleHistory.create({
      data: {
        vehicleId: id,
        changedFields: {
          status: {
            oldValue: vehicle.status,
            newValue: VehicleStatus.INACTIVE,
          },
          isDeleted: {
            oldValue: vehicle.isDeleted,
            newValue: true,
          },
          deletedAt: {
            oldValue: vehicle.deletedAt,
            newValue: new Date(),
          },
        },
        changedBy: currentUserId,
        changeReason: changeReason || 'Vehicle soft deleted',
      },
    });

    return sendSuccess(res, 'vehicle.deleted', { vehicle: updatedVehicle }, language);
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Restore deleted vehicle
 */
export const restoreVehicle = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string })?.userId;
    const { changeReason } = req.body;

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      return sendNotFound(res, 'vehicle.notFound', null, language);
    }

    // Restore vehicle by changing status to active and isDeleted to false
    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        status: VehicleStatus.ACTIVE,
        isDeleted: false,
        deletedAt: null,
      },
    });

    // Create history record
    await prisma.vehicleHistory.create({
      data: {
        vehicleId: id,
        changedFields: {
          status: {
            oldValue: vehicle.status,
            newValue: VehicleStatus.ACTIVE,
          },
          isDeleted: {
            oldValue: vehicle.isDeleted,
            newValue: false,
          },
          deletedAt: {
            oldValue: vehicle.deletedAt,
            newValue: null,
          },
        },
        changedBy: currentUserId,
        changeReason: changeReason || 'Vehicle restored',
      },
    });

    return sendSuccess(res, 'vehicle.restored', { vehicle: updatedVehicle }, language);
  } catch (error) {
    console.error('Error restoring vehicle:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Get vehicle history
 */
export const getVehicleHistory = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        vehicleType: true,
      },
    });

    if (!vehicle) {
      sendNotFound(res, 'vehicle.notFound', null, language);
      return;
    }

    // Get vehicle history
    const history = await prisma.vehicleHistory.findMany({
      where: { vehicleId: id },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, 'vehicle.historyRetrieved', { vehicle, history }, language);
  } catch (error) {
    console.error('Error retrieving vehicle history:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Assign driver to vehicle
 */
export const assignDriver = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const { driverId, changeReason } = req.body;
    const currentUserId = (req.user as { userId: string })?.userId;

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      return sendNotFound(res, 'vehicle.notFound', null, language);
    }

    // Check if driver exists
    if (driverId) {
      const driver = await prisma.user.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        return sendNotFound(res, 'user.notFound', null, language);
      }
    }

    // Update vehicle with new driver
    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        driverId: driverId || null,
      },
      include: {
        vehicleType: true,
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

    // Create history record
    await prisma.vehicleHistory.create({
      data: {
        vehicleId: id,
        changedFields: {
          driverId: {
            oldValue: vehicle.driverId,
            newValue: driverId || null,
          },
        },
        changedBy: currentUserId,
        changeReason: changeReason || 'Driver assignment updated',
      },
    });

    return sendSuccess(res, 'vehicle.driverAssigned', { vehicle: updatedVehicle }, language);
  } catch (error) {
    console.error('Error assigning driver to vehicle:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};
