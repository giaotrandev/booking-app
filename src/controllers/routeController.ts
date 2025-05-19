import { Request, Response } from 'express';
import { Request as MulterRequest } from 'express-serve-static-core';
import fs from 'fs';
import { uploadFileToR2, getSignedUrlForFile, deleteFileFromR2, StorageFolders } from '#services/r2Service';
import { optimizeImage } from '#services/imageService';
import { prisma } from '#config/db';
import { queryData, DataQueryParams } from '#utils/dataQuery';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError, sendForbidden } from '#utils/apiResponse';
import { CommonStatus, DistanceUnit } from '@prisma/client';
import safeDeleteFile from '#utils/safeDeleteFile';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

/**
 * Get list of routes
 */
export const getRouteList = async (req: Request, res: Response): Promise<void> => {
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
      : ['name', 'code'];
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

    // Define enum fields for Route model
    const enumFields = {
      status: Object.values(CommonStatus),
      distanceUnit: Object.values(DistanceUnit),
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
      relations: ['sourceProvince', 'destinationProvince', 'routeStops.busStop'],
      enumFields,
    };

    const result = await queryData(prisma.route, queryParams);

    // Generate signed URLs for route images
    const routesWithImages = await Promise.all(
      result.data.map(async (route: any) => {
        let imageUrl = null;
        if (route.image) {
          imageUrl = await getSignedUrlForFile(route.image);
        }
        return { ...route, imageUrl };
      })
    );

    result.data = routesWithImages;

    return sendSuccess(res, 'route.listRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving route list:', error);
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
 * Get route details
 */
export const getRouteDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        sourceProvince: true,
        destinationProvince: true,
        routeStops: {
          where: { isDeleted: false },
          include: {
            busStop: true,
          },
          orderBy: {
            stopOrder: 'asc',
          },
        },
      },
    });

    if (!route) {
      sendNotFound(res, 'route.notFound', null, language);
      return;
    }

    // Get route image URL if exists
    let imageUrl = null;
    if (route.image) {
      imageUrl = await getSignedUrlForFile(route.image);
    }

    return sendSuccess(res, 'route.detailsRetrieved', { route: { ...route, imageUrl } }, language);
  } catch (error) {
    console.error('Error retrieving route details:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Create a new route
 */
export const createRoute = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const {
      code,
      name,
      direction,
      sourceProvinceId,
      destinationProvinceId,
      distance,
      distanceUnit,
      estimatedDuration,
    } = req.body;

    // Validate required fields
    if (!code || !name || !sourceProvinceId || !destinationProvinceId || !distance || !estimatedDuration) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendBadRequest(res, 'route.missingRequiredFields', null, language);
    }

    // Check if route code already exists
    const existingRoute = await prisma.route.findUnique({
      where: { code },
    });

    if (existingRoute) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendBadRequest(res, 'route.codeAlreadyExists', null, language);
    }

    // Check if provinces exist
    const sourceProvince = await prisma.province.findUnique({
      where: { id: sourceProvinceId },
    });

    if (!sourceProvince) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendNotFound(res, 'route.sourceProvinceNotFound', null, language);
    }

    const destinationProvince = await prisma.province.findUnique({
      where: { id: destinationProvinceId },
    });

    if (!destinationProvince) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendNotFound(res, 'route.destinationProvinceNotFound', null, language);
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

      // Create a unique key for the route image
      const fileExtension = '.webp';
      const fileName = `${code}_${Date.now()}${fileExtension}`;
      const filePath = `${StorageFolders.ROUTES}`;
      const fileKey = `${StorageFolders.ROUTES}/${fileName}`;

      // Upload to Cloudflare R2
      await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');

      // Set image key
      imageKey = fileKey;

      // Delete temporary files
      await safeDeleteFile(req.file.path);
      await safeDeleteFile(optimizedImagePath);
    }

    // Create the route in the database
    const newRoute = await prisma.route.create({
      data: {
        code,
        name,
        direction,
        sourceProvinceId,
        destinationProvinceId,
        distance: parseFloat(distance),
        distanceUnit: distanceUnit || 'KM',
        estimatedDuration: parseInt(estimatedDuration),
        image: imageKey,
        status: CommonStatus.ACTIVE,
        isDeleted: false,
      },
      include: {
        sourceProvince: true,
        destinationProvince: true,
      },
    });

    // Get image URL if exists
    let imageUrl = null;
    if (newRoute.image) {
      imageUrl = await getSignedUrlForFile(newRoute.image);
    }

    sendSuccess(res, 'route.created', { route: { ...newRoute, imageUrl } }, language);
  } catch (error) {
    // Delete temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      await safeDeleteFile(req.file.path);
    }

    console.error('Error creating route:', error);
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
 * Update an existing route
 */
export const updateRoute = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string })?.userId;

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id },
    });

    if (!route) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendNotFound(res, 'route.notFound', null, language);
    }

    // Extract update data from request body
    const {
      name,
      direction,
      sourceProvinceId,
      destinationProvinceId,
      distance,
      distanceUnit,
      estimatedDuration,
      status,
      changeReason,
    } = req.body;

    // Build update object
    const updateData: any = {};

    // Basic route info
    if (name !== undefined) updateData.name = name;
    if (direction !== undefined) updateData.direction = direction;
    if (sourceProvinceId !== undefined) updateData.sourceProvinceId = sourceProvinceId;
    if (destinationProvinceId !== undefined) updateData.destinationProvinceId = destinationProvinceId;
    if (distance !== undefined) updateData.distance = parseFloat(distance);
    if (distanceUnit !== undefined) updateData.distanceUnit = distanceUnit;
    if (estimatedDuration !== undefined) updateData.estimatedDuration = parseInt(estimatedDuration);
    if (status !== undefined) updateData.status = status;

    // Track changed fields for history
    const changedFields: any = {};
    Object.keys(updateData).forEach((key) => {
      const routeKey = key as keyof typeof route;
      if (route[routeKey] !== updateData[routeKey]) {
        changedFields[key] = {
          oldValue: route[routeKey],
          newValue: updateData[routeKey],
        };
      }
    });

    // Handle image update if file is provided
    if (req.file) {
      // Optimize the image
      const optimizedImagePath = await optimizeImage(req.file.path, {
        width: 800,
        height: 600,
        quality: 80,
        format: 'webp',
      });

      // Create a unique key for the route image
      const fileExtension = '.webp';
      const fileName = `${route.code}_${Date.now()}${fileExtension}`;
      const filePath = `${StorageFolders.ROUTES}`;
      const fileKey = `${StorageFolders.ROUTES}/${fileName}`;

      // Upload to Cloudflare R2
      await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');

      // Delete the old image from R2 if it exists
      if (route.image) {
        try {
          await deleteFileFromR2(route.image);
        } catch (deleteError) {
          console.error('Error deleting old route image:', deleteError);
        }
      }

      // Add image path to update data
      updateData.image = fileKey;
      changedFields.image = {
        oldValue: route.image,
        newValue: fileKey,
      };

      // Delete temporary files
      await safeDeleteFile(req.file.path);
      await safeDeleteFile(optimizedImagePath);
    }

    // Update route
    const updatedRoute = await prisma.route.update({
      where: { id },
      data: updateData,
      include: {
        sourceProvince: true,
        destinationProvince: true,
      },
    });

    // Create history record if changes were made
    if (Object.keys(changedFields).length > 0) {
      await prisma.routeHistory.create({
        data: {
          routeId: id,
          changedFields: changedFields,
          changedBy: currentUserId,
          changeReason: changeReason,
        },
      });
    }

    // Get image URL if exists
    let imageUrl = null;
    if (updatedRoute.image) {
      imageUrl = await getSignedUrlForFile(updatedRoute.image);
    }

    return sendSuccess(res, 'route.updated', { route: { ...updatedRoute, imageUrl } }, language);
  } catch (error) {
    // Delete temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      await safeDeleteFile(req.file.path);
    }

    console.error('Error updating route:', error);
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
 * Upload route image
 */
export const uploadRouteImage = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id },
    });

    if (!route) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      return sendNotFound(res, 'route.notFound', null, language);
    }

    if (!req.file) {
      return sendBadRequest(res, 'route.noFileUploaded', null, language);
    }

    // Optimize the image
    const optimizedImagePath = await optimizeImage(req.file.path, {
      width: 800,
      height: 600,
      quality: 80,
      format: 'webp',
    });

    // Create a unique key for the route image
    const fileExtension = '.webp';
    const fileName = `${route.code}_${Date.now()}${fileExtension}`;
    const filePath = `${StorageFolders.ROUTES}`;
    const fileKey = `${StorageFolders.ROUTES}/${fileName}`;

    try {
      // Upload to Cloudflare R2
      await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');

      // Delete the old image from R2 if it exists
      if (route.image) {
        try {
          await deleteFileFromR2(route.image);
        } catch (deleteError) {
          console.error('Error deleting old route image:', deleteError);
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
        'route.imageUploadFailed',
        { message: uploadError instanceof Error ? uploadError.message : 'Unknown error occurred' },
        language
      );
    }

    // Update route with new image path
    const updatedRoute = await prisma.route.update({
      where: { id },
      data: {
        image: fileKey,
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
      console.error('Error generating signed URL for new route image:', urlError);
      // Continue anyway, the image is uploaded but we just can't get the URL right now
    }

    return sendSuccess(
      res,
      'route.imageUploaded',
      {
        route: updatedRoute,
        imageUrl: imageUrl,
      },
      language
    );
  } catch (error) {
    // Delete temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      await safeDeleteFile(req.file.path);
    }

    console.error('Error uploading route image:', error);
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
 * Get route image
 */
export const getRouteImage = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const route = await prisma.route.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        image: true,
      },
    });

    if (!route) {
      sendNotFound(res, 'route.notFound', null, language);
      return;
    }

    // Get image URL if exists
    let imageUrl = null;
    if (route.image) {
      imageUrl = await getSignedUrlForFile(route.image);
    }

    return sendSuccess(
      res,
      'route.imageRetrieved',
      {
        route: {
          id: route.id,
          name: route.name,
          code: route.code,
        },
        imageUrl,
      },
      language
    );
  } catch (error) {
    console.error('Error retrieving route image:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Soft delete route
 */
export const softDeleteRoute = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string })?.userId;
    const { changeReason } = req.body;

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id },
    });

    if (!route) {
      return sendNotFound(res, 'route.notFound', null, language);
    }

    // Update route status to inactive
    const updatedRoute = await prisma.route.update({
      where: { id },
      data: {
        status: CommonStatus.INACTIVE,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Create history record
    await prisma.routeHistory.create({
      data: {
        routeId: id,
        changedFields: {
          status: {
            oldValue: route.status,
            newValue: CommonStatus.INACTIVE,
          },
          isDeleted: {
            oldValue: route.isDeleted,
            newValue: true,
          },
          deletedAt: {
            oldValue: route.deletedAt,
            newValue: new Date(),
          },
        },
        changedBy: currentUserId,
        changeReason: changeReason || 'Route soft deleted',
      },
    });

    return sendSuccess(res, 'route.deleted', { route: updatedRoute }, language);
  } catch (error) {
    console.error('Error deleting route:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Restore deleted route
 */
export const restoreRoute = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string })?.userId;
    const { changeReason } = req.body;

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id },
    });

    if (!route) {
      sendNotFound(res, 'route.notFound', null, language);
      return;
    }

    // Restore route by changing status to active and isDeleted to false
    const updatedRoute = await prisma.route.update({
      where: { id },
      data: {
        status: CommonStatus.ACTIVE,
        isDeleted: false,
        deletedAt: null,
      },
    });

    // Create history record
    await prisma.routeHistory.create({
      data: {
        routeId: id,
        changedFields: {
          status: {
            oldValue: route.status,
            newValue: CommonStatus.ACTIVE,
          },
          isDeleted: {
            oldValue: route.isDeleted,
            newValue: false,
          },
          deletedAt: {
            oldValue: route.deletedAt,
            newValue: null,
          },
        },
        changedBy: currentUserId,
        changeReason: changeReason || 'Route restored',
      },
    });

    return sendSuccess(res, 'route.restored', { route: updatedRoute }, language);
  } catch (error) {
    console.error('Error restoring route:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};

/**
 * Get route history
 */
export const getRouteHistory = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id },
    });

    if (!route) {
      sendNotFound(res, 'route.notFound', null, language);
      return;
    }

    // Get route history
    const history = await prisma.routeHistory.findMany({
      where: { routeId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        route: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    return sendSuccess(res, 'route.historyRetrieved', { route, history }, language);
  } catch (error) {
    console.error('Error retrieving route history:', error);
    return sendServerError(
      res,
      'common.serverError',
      error instanceof Error ? { message: error.message } : null,
      language
    );
  }
};
