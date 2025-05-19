import { Request, Response } from 'express';
import { prisma } from '#config/db';
import { queryData, DataQueryParams } from '#utils/dataQuery';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';

/**
 * Get list of permissions
 */
export const getPermissionList = async (req: Request, res: Response): Promise<void> => {
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
      : ['code', 'name', 'description'];
    const returnAll = req.query.returnAll === 'true';

    // Parse sort and filters
    let sort: DataQueryParams['sort'] | undefined;
    let filters: DataQueryParams['filters'] | undefined;

    try {
      if (req.query.sort) {
        sort = JSON.parse(req.query.sort as string);
      }

      if (req.query.filters) {
        filters = JSON.parse(req.query.filters as string);
      }
    } catch (parseError) {
      sendBadRequest(res, 'common.invalidQueryParams', { error: 'Invalid sort or filters format' }, language);
      return;
    }

    const queryParams: DataQueryParams = {
      page,
      pageSize,
      search,
      searchFields,
      filters,
      sort,
      returnAll,
      relations: ['roles'],
    };

    const result = await queryData(prisma.permission, queryParams);

    sendSuccess(res, 'permission.listRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving permission list:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get permission details
 */
export const getPermissionDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!permission) {
      sendNotFound(res, 'permission.notFound', null, language);
      return;
    }

    sendSuccess(res, 'permission.detailsRetrieved', { permission }, language);
  } catch (error) {
    console.error('Error retrieving permission details:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Create a new permission
 */
export const createPermission = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { code, name, description } = req.body;

    // Check if permission with the same code already exists
    const existingPermission = await prisma.permission.findUnique({
      where: { code },
    });

    if (existingPermission) {
      sendBadRequest(res, 'permission.codeAlreadyExists', null, language);
      return;
    }

    // Create the permission
    const permission = await prisma.permission.create({
      data: {
        code,
        name,
        description,
      },
    });

    sendSuccess(res, 'permission.created', { permission }, language);
  } catch (error) {
    console.error('Error creating permission:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Update a permission
 */
export const updatePermission = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const { code, name, description } = req.body;

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      sendNotFound(res, 'permission.notFound', null, language);
      return;
    }

    // If code is changing, check if new code already exists
    if (code && code !== permission.code) {
      const existingPermission = await prisma.permission.findUnique({
        where: { code },
      });

      if (existingPermission) {
        sendBadRequest(res, 'permission.codeAlreadyExists', null, language);
        return;
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    // Update the permission
    const updatedPermission = await prisma.permission.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, 'permission.updated', { permission: updatedPermission }, language);
  } catch (error) {
    console.error('Error updating permission:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Delete a permission
 */
export const deletePermission = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    });

    if (!permission) {
      sendNotFound(res, 'permission.notFound', null, language);
      return;
    }

    // Check if permission is assigned to any roles
    if (permission.roles.length > 0) {
      sendBadRequest(
        res,
        'permission.inUseByRoles',
        { count: permission.roles.length, roles: permission.roles.map((role) => role.name) },
        language
      );
      return;
    }

    // Delete the permission
    await prisma.permission.delete({
      where: { id },
    });

    sendSuccess(res, 'permission.deleted', null, language);
  } catch (error) {
    console.error('Error deleting permission:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};
