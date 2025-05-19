import { Request, Response } from 'express';
import { prisma } from '#config/db';
import { queryData, DataQueryParams } from '#utils/dataQuery';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';

/**
 * Get list of roles
 */
export const getRoleList = async (req: Request, res: Response): Promise<void> => {
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
      relations: ['permissions'],
    };

    const result = await queryData(prisma.role, queryParams);

    sendSuccess(res, 'role.listRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving role list:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get role details
 */
export const getRoleDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!role) {
      sendNotFound(res, 'role.notFound', null, language);
      return;
    }

    sendSuccess(res, 'role.detailsRetrieved', { role }, language);
  } catch (error) {
    console.error('Error retrieving role details:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Create a new role
 */
export const createRole = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { name, description, permissionIds } = req.body;

    // Check if role with the same name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      sendBadRequest(res, 'role.alreadyExists', null, language);
      return;
    }

    // If permissionIds are provided, verify they all exist
    if (permissionIds && permissionIds.length > 0) {
      const permissionsCount = await prisma.permission.count({
        where: {
          id: {
            in: permissionIds,
          },
        },
      });

      if (permissionsCount !== permissionIds.length) {
        sendBadRequest(res, 'permission.someNotFound', null, language);
        return;
      }
    }

    // Create the role
    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissionIds: permissionIds || [],
      },
      include: {
        permissions: true,
      },
    });

    sendSuccess(res, 'role.created', { role }, language);
  } catch (error) {
    console.error('Error creating role:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Update a role
 */
export const updateRole = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const { name, description, permissionIds } = req.body;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      sendNotFound(res, 'role.notFound', null, language);
      return;
    }

    // If name is changing, check if new name already exists
    if (name && name !== role.name) {
      const existingRole = await prisma.role.findUnique({
        where: { name },
      });

      if (existingRole) {
        sendBadRequest(res, 'role.nameAlreadyExists', null, language);
        return;
      }
    }

    // If permissionIds are provided, verify they all exist
    if (permissionIds && permissionIds.length > 0) {
      const permissionsCount = await prisma.permission.count({
        where: {
          id: {
            in: permissionIds,
          },
        },
      });

      if (permissionsCount !== permissionIds.length) {
        sendBadRequest(res, 'permission.someNotFound', null, language);
        return;
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissionIds !== undefined) updateData.permissionIds = permissionIds;

    // Update the role
    const updatedRole = await prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        permissions: true,
      },
    });

    sendSuccess(res, 'role.updated', { role: updatedRole }, language);
  } catch (error) {
    console.error('Error updating role:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Delete a role
 */
export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      sendNotFound(res, 'role.notFound', null, language);
      return;
    }

    // Check if there are users with this role
    const usersWithRole = await prisma.user.count({
      where: {
        roleName: role.name,
      },
    });

    if (usersWithRole > 0) {
      sendBadRequest(res, 'role.hasUsers', { count: usersWithRole }, language);
      return;
    }

    // Delete the role
    await prisma.role.delete({
      where: { id },
    });

    sendSuccess(res, 'role.deleted', null, language);
  } catch (error) {
    console.error('Error deleting role:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Assign/update role permissions
 */
export const updateRolePermissions = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const { permissionIds } = req.body;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      sendNotFound(res, 'role.notFound', null, language);
      return;
    }

    // Verify all permissions exist
    if (permissionIds && permissionIds.length > 0) {
      const permissionsCount = await prisma.permission.count({
        where: {
          id: {
            in: permissionIds,
          },
        },
      });

      if (permissionsCount !== permissionIds.length) {
        sendBadRequest(res, 'permission.someNotFound', null, language);
        return;
      }
    }

    // Update role permissions
    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        permissionIds: permissionIds || [],
      },
      include: {
        permissions: true,
      },
    });

    sendSuccess(res, 'role.permissionsUpdated', { role: updatedRole }, language);
  } catch (error) {
    console.error('Error updating role permissions:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};
