import { Request, Response } from 'express';
import { Request as MulterRequest } from 'express-serve-static-core';
import fs from 'fs';
import { uploadFileToR2, getSignedUrlForFile, deleteFileFromR2, StorageFolders } from '#services/r2Service';
import { optimizeImage } from '#services/imageService';
import { prisma } from '#config/db';
import { queryData, DataQueryParams } from '#utils/dataQuery';
import { sendSuccess, sendBadRequest, sendNotFound, sendServerError, sendForbidden } from '#utils/apiResponse';
import { Gender, UserStatus } from '@prisma/client';
import * as TokenHandler from '#utils/tokenHandler';
import safeDeleteFile from '#utils/safeDeleteFile';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

/**
 * Get list of users (Admin only)
 */
export const getUserList = async (req: Request, res: Response): Promise<void> => {
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
      : ['name', 'email', 'phoneNumber'];
    const returnAll = req.query.returnAll === 'true';

    // Parse sort và filters từ query string
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
      sendBadRequest(res, 'common.invalidQueryParams', { error: 'Invalid sort or filters format' }, language);
      return;
    }

    // Định nghĩa các trường enum cho model User
    const enumFields = {
      status: Object.values(UserStatus),
      gender: Object.values(Gender),
    };

    // Chuẩn bị tham số truy vấn
    const queryParams: DataQueryParams = {
      page,
      pageSize,
      search,
      searchFields,
      filters,
      sort,
      returnAll,
      relations: ['role.permissions'],
      enumFields,
    };

    const result = await queryData(prisma.user, queryParams);

    // Lọc ra các trường nhạy cảm
    const sanitizedData = result.data.map((user: any) => {
      const sanitizedUser = { ...user };
      delete sanitizedUser.password;
      delete sanitizedUser.resetPasswordToken;
      delete sanitizedUser.resetPasswordExpire;
      delete sanitizedUser.emailVerificationToken;
      delete sanitizedUser.emailVerificationExpire;

      return sanitizedUser;
    });

    result.data = sanitizedData;

    sendSuccess(res, 'user.listRetrieved', result, language);
  } catch (error) {
    console.error('Error retrieving user list:', error);
    sendServerError(
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
 * Get user details (Admin or the user themselves)
 */
export const getUserDetails = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string }).userId;

    // Check if the requester is the user themselves or has admin permissions
    const isCurrentUser = id === currentUserId;

    // If not the user themselves, this will be enforced by middleware

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        birthday: true,
        gender: true,
        status: true,
        avatar: true,
        address: true,
        role: {
          select: {
            name: true,
            permissions: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      sendNotFound(res, 'user.notFound', null, language);
      return;
    }

    // Get avatar URL if exists
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await getSignedUrlForFile(user.avatar);
    }

    sendSuccess(res, 'user.detailsRetrieved', { user: { ...user, avatarUrl } }, language);
  } catch (error) {
    console.error('Error retrieving user details:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get user's avatar URL (Public)
 */
export const getUserAvatar = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });

    if (!user) {
      sendNotFound(res, 'user.notFound', null, language);
      return;
    }

    // Get avatar URL if exists
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await getSignedUrlForFile(user.avatar);
    }

    sendSuccess(
      res,
      'user.avatarRetrieved',
      {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        avatarUrl,
      },
      language
    );
  } catch (error) {
    console.error('Error retrieving user avatar:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Upload avatar (User themselves or admin)
 */
export const uploadAvatar = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      // Delete temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      sendNotFound(res, 'user.notFound', null, language);
      return;
    }

    if (!req.file) {
      sendBadRequest(res, 'user.noFileUploaded', null, language);
      return;
    }

    // Optimize the image
    const optimizedImagePath = await optimizeImage(req.file.path, {
      width: 500,
      height: 500,
      quality: 80,
      format: 'webp',
    });

    // Create a unique key for the avatar - store in avatars/userId folder
    const fileExtension = '.webp'; // We're converting to WebP
    const fileName = `${Date.now()}${fileExtension}`;
    const filePath = `${StorageFolders.AVATARS}/${id}`;
    const fileKey = `${StorageFolders.AVATARS}/${id}/${fileName}`;

    try {
      // Upload to Cloudflare R2 with the correct parameters
      await uploadFileToR2(optimizedImagePath, filePath, fileName, 'image/webp');

      // Delete the old avatar from R2 if it exists
      if (user.avatar) {
        try {
          await deleteFileFromR2(user.avatar);
        } catch (deleteError) {
          console.error('Error deleting old avatar:', deleteError);
          // Continue anyway, we don't want to fail the upload because of this
        }
      }
    } catch (uploadError) {
      console.error('Error during R2 operations:', uploadError);
      sendServerError(
        res,
        'user.avatarUploadFailed',
        { message: uploadError instanceof Error ? uploadError.message : 'Unknown error occurred' },
        language
      );

      // Clean up files safely
      if (req.file && fs.existsSync(req.file.path)) {
        await safeDeleteFile(req.file.path);
      }
      if (fs.existsSync(optimizedImagePath)) {
        await safeDeleteFile(optimizedImagePath);
      }
      return;
    }

    // Update user with new avatar path
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        avatar: fileKey,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });

    // Delete temporary files with safe deletion
    await safeDeleteFile(req.file.path);
    await safeDeleteFile(optimizedImagePath);

    // Generate a pre-signed URL for immediate use
    let url = null;
    try {
      url = await getSignedUrlForFile(fileKey);
    } catch (urlError) {
      console.error('Error generating signed URL for new avatar:', urlError);
      // Continue anyway, the avatar is uploaded but we just can't get the URL right now
    }

    sendSuccess(
      res,
      'user.avatarUploaded',
      {
        user: updatedUser,
        avatarUrl: url,
      },
      language
    );
  } catch (error) {
    // Delete temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      await safeDeleteFile(req.file.path);
    }

    console.error('Error uploading avatar:', error);
    sendServerError(
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
 * Update user details (User themselves or admin)
 */
export const updateUser = async (req: RequestWithFile, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string })?.userId;
    const isCurrentUser = id === currentUserId;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: currentUserId || id },
    });

    if (!user) {
      // Delete temporary file if it exists
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      sendNotFound(res, 'user.notFound', null, language);
      return;
    }

    // Extract update data from request body
    const { name, email, phoneNumber, gender, address, age, status } = req.body;

    // Build update object
    const updateData: any = {};

    // Basic user info that can be updated by the user themselves
    if (name !== undefined) updateData.name = name;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (gender !== undefined) updateData.gender = gender;
    if (address !== undefined) updateData.address = address;
    if (age !== undefined && !isNaN(parseInt(age))) updateData.age = parseInt(age);

    // // Email change requires verification - handle separately
    // if (email !== undefined && email !== user.email) {
    //   // Handle email change - generate verification token, send email, etc.
    //   // This is a placeholder - implement email verification flow
    //   updateData.email = email;
    //   updateData.isEmailVerified = false;
    //   updateData.emailVerificationToken = Math.random().toString(36).substring(2, 15);
    //   updateData.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    //   // TODO: Send verification email
    // }

    // Admin-only fields
    if (!isCurrentUser) {
      if (status !== undefined) updateData.status = status;
      // Add other admin-only fields here
    }

    // Handle avatar update if file is provided
    if (req.file) {
      // Optimize the image
      const optimizedImagePath = await optimizeImage(req.file.path, {
        width: 500,
        height: 500,
        quality: 80,
        format: 'webp',
      });

      // Create a unique key for the avatar
      const fileExtension = '.webp'; // We're converting to WebP
      const fileName = `${Date.now()}${fileExtension}`;
      const fileKey = `${StorageFolders.AVATARS}/${id}/${fileName}`;

      // Upload to Cloudflare R2
      await uploadFileToR2(optimizedImagePath, StorageFolders.AVATARS, fileName, 'image/webp');

      // Delete the old avatar from R2 if it exists
      if (user.avatar) {
        try {
          await deleteFileFromR2(user.avatar);
        } catch (deleteError) {
          console.error('Error deleting old avatar:', deleteError);
        }
      }

      // Add avatar path to update data
      updateData.avatar = fileKey;

      // Delete temporary files
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(optimizedImagePath);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: currentUserId || id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        birthday: true,
        status: true,
        gender: true,
        address: true,
        avatar: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get avatar URL if exists
    let avatarUrl = null;
    if (updatedUser.avatar) {
      avatarUrl = await getSignedUrlForFile(updatedUser.avatar);
    }

    sendSuccess(
      res,
      'user.updated',
      {
        user: { ...updatedUser, avatarUrl },
      },
      language
    );
  } catch (error) {
    // Delete temporary file if it exists
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Error updating user:', error);
    sendServerError(
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
 * Change user password (Admin)
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;
    const currentUserId = (req.user as { userId: string }).userId;
    const { newPassword } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      sendNotFound(res, 'user.notFound', null, language);
      return;
    }

    // Hash new password
    const hashedPassword = await TokenHandler.hashPassword(newPassword);

    // Update the user's password
    await prisma.user.update({
      where: { id: id },
      data: { password: hashedPassword },
    });

    // Revoke other sessions (optional)
    if ((req.user as { sessionId: string }).sessionId) {
      // Keep current session active, deactivate others
      await prisma.loginSession.updateMany({
        where: {
          userId: id,
          isActive: true,
          id: { not: (req.user as { sessionId: string }).sessionId },
        },
        data: {
          isActive: false,
          logoutAt: new Date(),
        },
      });

      // Revoke other refresh tokens
      await prisma.refreshToken.updateMany({
        where: {
          session: {
            userId: id,
            id: { not: (req.user as { sessionId: string }).sessionId },
          },
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });
    }

    sendSuccess(res, 'user.passwordChanged', null, language);
  } catch (error) {
    console.error('Error changing password:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Soft delete user (Admin only)
 */
export const softDeleteUser = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      sendNotFound(res, 'user.notFound', null, language);
      return;
    }

    // Update user status to DISABLED
    await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.DISABLED,
      },
    });

    sendSuccess(res, 'user.deleted', null, language);
  } catch (error) {
    console.error('Error deleting user:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Restore deleted user (Admin only)
 */
export const restoreUser = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      sendNotFound(res, 'user.notFound', null, language);
      return;
    }

    // Restore user by changing status to AVAILABLE
    await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.AVAILABLE,
      },
    });

    sendSuccess(res, 'user.restored', null, language);
  } catch (error) {
    console.error('Error restoring user:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get current logged in user profile
 */
export const getCurrentUserProfile = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const currentUserId = (req.user as { userId: string })?.userId;

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        birthday: true,
        gender: true,
        status: true,
        avatar: true,
        address: true,
        role: {
          select: {
            name: true,
            permissions: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      sendNotFound(res, 'user.notFound', null, language);
      return;
    }

    // Get avatar URL if exists
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await getSignedUrlForFile(user.avatar);
    }

    sendSuccess(res, 'user.profileRetrieved', { user: { ...user, avatarUrl } }, language);
  } catch (error) {
    console.error('Error getting current user profile:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Assign a role to a user
 */
export const assignUserRole = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { userId } = req.params;
    const { roleName } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      sendNotFound(res, 'user.notFound', null, language);
      return;
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      sendNotFound(res, 'role.notFound', null, language);
      return;
    }

    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        roleName: roleName,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        roleName: true,
        role: {
          select: {
            name: true,
            permissions: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    sendSuccess(res, 'user.roleAssigned', { user: updatedUser }, language);
  } catch (error) {
    console.error('Error assigning role to user:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

/**
 * Get users by role
 */
export const getUsersByRole = async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    const { roleName } = req.params;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      sendNotFound(res, 'role.notFound', null, language);
      return;
    }

    // Get users with this role
    const users = await prisma.user.findMany({
      where: {
        roleName,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        status: true,
        avatar: true,
      },
    });

    sendSuccess(res, 'role.usersRetrieved', { role, users }, language);
  } catch (error) {
    console.error('Error getting users by role:', error);
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};
