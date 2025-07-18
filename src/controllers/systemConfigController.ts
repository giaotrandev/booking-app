import { Request, Response } from 'express';
import fs from 'fs';
import {
  getSystemConfig,
  createSystemConfig,
  updateSystemConfig,
  updateSystemConfigLogo,
  deleteSystemConfigLogo,
} from '#services/systemConfigService';
import { sendCreated, sendSuccess, sendBadRequest, sendNotFound, sendServerError } from '#utils/apiResponse';
import { deepRemoveTimestamps } from '#src/helpers/dataHelper';
import { getPublicR2Url } from '#src/services/r2Service';

/**
 * Get current active system configuration
 */
export async function getSystemConfigCtrl(req: Request, res: Response) {
  try {
    const config = await getSystemConfig();

    if (!config) {
      return sendNotFound(res, 'systemConfig.notFound', null, req.language);
    }

    config.logo = config.logo ? getPublicR2Url(config.logo) : null;
    config.textLogo = config.textLogo ? getPublicR2Url(config.textLogo) : null;

    const cleanConfig = deepRemoveTimestamps(config);
    return sendSuccess(res, 'systemConfig.retrieved', cleanConfig, req.language);
  } catch (error) {
    return sendServerError(
      res,
      'systemConfig.getError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

/**
 * Create new system configuration
 */
export async function createSystemConfigCtrl(req: Request, res: Response) {
  try {
    const userId = (req.user as { userId: string })?.userId;

    // Convert date strings to Date objects if provided
    const { maintenanceStartTime, maintenanceEndTime, ...data } = req.body;

    const createData = {
      ...data,
      ...(maintenanceStartTime && { maintenanceStartTime: new Date(maintenanceStartTime) }),
      ...(maintenanceEndTime && { maintenanceEndTime: new Date(maintenanceEndTime) }),
      lastUpdatedBy: userId,
    };

    const newConfig = await createSystemConfig(createData);
    const cleanConfig = deepRemoveTimestamps(newConfig);

    return sendCreated(res, 'systemConfig.created', cleanConfig, req.language);
  } catch (error) {
    return sendServerError(
      res,
      'systemConfig.createError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

/**
 * Update system configuration
 */
export async function updateSystemConfigCtrl(req: Request, res: Response) {
  try {
    const userId = (req.user as { userId: string })?.userId;

    // Convert date strings to Date objects if provided
    const { maintenanceStartTime, maintenanceEndTime, ...data } = req.body;

    const updateData = {
      ...data,
      ...(maintenanceStartTime && { maintenanceStartTime: new Date(maintenanceStartTime) }),
      ...(maintenanceEndTime && { maintenanceEndTime: new Date(maintenanceEndTime) }),
      lastUpdatedBy: userId,
    };

    const updatedConfig = await updateSystemConfig(updateData);
    const cleanConfig = deepRemoveTimestamps(updatedConfig);

    return sendSuccess(res, 'systemConfig.updated', cleanConfig, req.language);
  } catch (error) {
    if (error instanceof Error && error.message === 'Active system config not found') {
      return sendNotFound(res, 'systemConfig.notFound', null, req.language);
    }

    return sendServerError(
      res,
      'systemConfig.updateError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

/**
 * Upload logo for system configuration
 */
export async function uploadLogoCtrl(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { logoType = 'logo' } = req.body;
    const userId = (req.user as { userId: string })?.userId;

    if (!req.file) {
      return sendBadRequest(res, 'systemConfig.logoRequired', null, req.language);
    }

    if (!['logo', 'textLogo'].includes(logoType)) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return sendBadRequest(res, 'systemConfig.invalidLogoType', null, req.language);
    }

    const updatedConfig = await updateSystemConfigLogo(id, req.file.path, logoType as 'logo' | 'textLogo', userId);

    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const cleanConfig = deepRemoveTimestamps(updatedConfig);
    return sendSuccess(res, 'systemConfig.logoUploaded', cleanConfig, req.language, { logoType });
  } catch (error) {
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error instanceof Error && error.message === 'System config not found') {
      return sendNotFound(res, 'systemConfig.notFound', null, req.language);
    }

    return sendServerError(
      res,
      'systemConfig.logoUploadError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

/**
 * Delete logo from system configuration
 */
export async function deleteLogoCtrl(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { logoType = 'logo' } = req.query;
    const userId = (req.user as { userId: string })?.userId;

    if (!['logo', 'textLogo'].includes(logoType as string)) {
      return sendBadRequest(res, 'systemConfig.invalidLogoType', null, req.language);
    }

    const updatedConfig = await deleteSystemConfigLogo(id, logoType as 'logo' | 'textLogo', userId);

    const cleanConfig = deepRemoveTimestamps(updatedConfig);
    return sendSuccess(res, 'systemConfig.logoDeleted', cleanConfig, req.language, { logoType });
  } catch (error) {
    if (error instanceof Error && error.message === 'System config not found') {
      return sendNotFound(res, 'systemConfig.notFound', null, req.language);
    }

    return sendServerError(
      res,
      'systemConfig.logoDeleteError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}

/**
 * Get system configuration for public display (minimal info)
 */
export async function getPublicSystemConfigCtrl(req: Request, res: Response) {
  try {
    const config = await getSystemConfig();

    if (!config) {
      return sendNotFound(res, 'systemConfig.notFound', null, req.language);
    }

    // Return only public information
    const publicConfig = {
      name: config.name,
      globalName: config.globalName,
      logo: config.logo ? getPublicR2Url(config.logo) : null,
      textLogo: config.textLogo ? getPublicR2Url(config.textLogo) : null,
      isMaintaining: config.isMaintaining,
      maintenanceStartTime: config.maintenanceStartTime,
      maintenanceEndTime: config.maintenanceEndTime,
    };

    return sendSuccess(res, 'systemConfig.publicRetrieved', publicConfig, req.language);
  } catch (error) {
    return sendServerError(
      res,
      'systemConfig.getError',
      error instanceof Error ? { message: error.message } : null,
      req.language
    );
  }
}
