import { PrismaClient, Prisma, SystemConfigStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { optimizeImage } from './imageService';
import { deleteFileFromR2, StorageFolders, uploadFileToR2 } from './r2Service';

const prisma = new PrismaClient();

interface CreateSystemConfigData {
  name: string;
  globalName?: string;
  rateLimit?: number;
  rateLimitWindow?: number;
  emailRateLimit?: number;
  emailRateLimitWindow?: number;
  maxLoginAttempts?: number;
  loginLockDuration?: number;
  bookingRateLimit?: number;
  bookingRateLimitWindow?: number;
  isMaintaining?: boolean;
  maintenanceStartTime?: Date;
  maintenanceEndTime?: Date;
  lastUpdatedBy?: string;
}

interface UpdateSystemConfigData extends Partial<CreateSystemConfigData> {
  id: string;
}

/**
 * Get active system config, create default if none exists
 */
export async function getSystemConfig() {
  let config = await prisma.systemConfig.findFirst({
    where: { status: SystemConfigStatus.ACTIVE },
  });

  if (!config) {
    const count = await prisma.systemConfig.count({
      where: { status: SystemConfigStatus.ACTIVE },
    });

    if (count === 0) {
      config = await prisma.systemConfig.create({
        data: {
          name: process.env.COMPANY_NAME ?? 'Bus Company',
          globalName: process.env.COMPANY_NAME_EN ?? 'Bus Company',
          status: SystemConfigStatus.ACTIVE,
        },
      });
    }
  }

  return config;
}

/**
 * Create new system config (deactivates existing ones)
 */
export async function createSystemConfig(data: CreateSystemConfigData) {
  try {
    // Start transaction to ensure only one active config
    const result = await prisma.$transaction(async (tx) => {
      // Deactivate all existing configs
      await tx.systemConfig.deleteMany({
        where: { status: SystemConfigStatus.ACTIVE },
      });

      // Create new active config
      const newConfig = await tx.systemConfig.create({
        data: {
          ...data,
          status: SystemConfigStatus.ACTIVE,
        },
      });

      return newConfig;
    });

    return result;
  } catch (error) {
    console.error('Error creating system config:', error);
    throw error;
  }
}

/**
 * Update existing system config
 */
export async function updateSystemConfig(data: UpdateSystemConfigData) {
  try {
    const { id, ...updateData } = data;

    // Ensure we're updating an active config
    const existingConfig = await prisma.systemConfig.findFirst({
      where: {
        id,
        status: SystemConfigStatus.ACTIVE,
      },
    });

    if (!existingConfig) {
      throw new Error('Active system config not found');
    }

    const updatedConfig = await prisma.systemConfig.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return updatedConfig;
  } catch (error) {
    console.error('Error updating system config:', error);
    throw error;
  }
}

/**
 * Upload and optimize logo image
 */
export async function uploadSystemLogo(
  filePath: string,
  logoType: 'logo' | 'textLogo' | 'logoDark' | 'textLogoDark' | 'favicon' | 'icon' | 'appleIcon' = 'logo'
): Promise<string> {
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileExtension = path.extname(filePath).toLowerCase();
    const isVector = fileExtension === '.svg';
    const isIco = fileExtension === '.ico';

    let optimizedPath: string;
    let finalFileName: string;
    let mimeType: string;

    const optimizationSettings: Record<string, { width: number; height: number; quality: number }> = {
      logo: { width: 200, height: 200, quality: 90 },
      logoDark: { width: 200, height: 200, quality: 90 },
      textLogo: { width: 300, height: 80, quality: 90 },
      textLogoDark: { width: 300, height: 80, quality: 90 },
      favicon: { width: 32, height: 32, quality: 85 },
      icon: { width: 192, height: 192, quality: 90 },
      appleIcon: { width: 180, height: 180, quality: 90 },
    };

    if (isVector) {
      const svgFileName = `${logoType}-${crypto.randomBytes(8).toString('hex')}.svg`;
      optimizedPath = path.join(tempDir, svgFileName);
      fs.copyFileSync(filePath, optimizedPath);
      finalFileName = svgFileName;
      mimeType = 'image/svg+xml';
    } else if (isIco && logoType === 'favicon') {
      const icoFileName = `${logoType}-${crypto.randomBytes(8).toString('hex')}.ico`;
      optimizedPath = path.join(tempDir, icoFileName);
      fs.copyFileSync(filePath, optimizedPath);
      finalFileName = icoFileName;
      mimeType = 'image/x-icon';
    } else {
      const webpFileName = `${logoType}-${crypto.randomBytes(8).toString('hex')}.webp`;
      const settings = optimizationSettings[logoType];

      optimizedPath = await optimizeImage(filePath, {
        ...settings,
        format: 'webp',
      });

      const finalPath = path.join(tempDir, webpFileName);
      fs.renameSync(optimizedPath, finalPath);
      optimizedPath = finalPath;
      finalFileName = webpFileName;
      mimeType = 'image/webp';
    }

    const logoKey = await uploadFileToR2(optimizedPath, StorageFolders.SYSTEM_CONFIG, finalFileName, mimeType);

    fs.unlinkSync(optimizedPath);

    return logoKey;
  } catch (error) {
    console.error('Error uploading system logo:', error);
    throw error;
  }
}

/**
 * Update system config with new logo
 */
export async function updateSystemConfigLogo(
  configId: string,
  logoPath: string,
  logoType: 'logo' | 'textLogo' | 'logoDark' | 'textLogoDark' | 'favicon' | 'icon' | 'appleIcon' = 'logo',
  lastUpdatedBy?: string
) {
  try {
    const currentConfig = await prisma.systemConfig.findUnique({
      where: { id: configId },
    });

    if (!currentConfig) {
      throw new Error('System config not found');
    }

    const newLogoKey = await uploadSystemLogo(logoPath, logoType);

    const oldLogoKey = {
      logo: currentConfig.logo,
      logoDark: currentConfig.logoDark,
      textLogo: currentConfig.textLogo,
      textLogoDark: currentConfig.textLogoDark,
      favicon: currentConfig.favicon,
      icon: currentConfig.icon,
      appleIcon: currentConfig.appleIcon,
    }[logoType];

    if (oldLogoKey) {
      try {
        await deleteFileFromR2(oldLogoKey);
      } catch (deleteError) {
        console.warn('Failed to delete old logo:', deleteError);
      }
    }

    const updateData = {
      [logoType]: newLogoKey,
      lastUpdatedBy,
      updatedAt: new Date(),
    };

    const updatedConfig = await prisma.systemConfig.update({
      where: { id: configId },
      data: updateData,
    });

    return updatedConfig;
  } catch (error) {
    console.error('Error updating system config logo:', error);
    throw error;
  }
}

/**
 * Delete system config logo
 */
export async function deleteSystemConfigLogo(
  configId: string,
  logoType: 'logo' | 'textLogo' | 'logoDark' | 'textLogoDark' = 'logo',
  lastUpdatedBy?: string
) {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new Error('System config not found');
    }

    const propertiesObj = {
      logo: config.logo,
      logoDark: config.logoDark,
      textLogo: config.textLogo,
      textLogoDark: config.textLogoDark,
    };

    const logoKey = propertiesObj[logoType];

    if (logoKey) {
      // Delete from R2
      await deleteFileFromR2(logoKey);

      // Update config
      const updateData = {
        [logoType]: null,
        lastUpdatedBy,
        updatedAt: new Date(),
      };

      const updatedConfig = await prisma.systemConfig.update({
        where: { id: configId },
        data: updateData,
      });

      return updatedConfig;
    }

    return config;
  } catch (error) {
    console.error('Error deleting system config logo:', error);
    throw error;
  }
}

/**
 * Get rate limit configuration
 */
export async function getRateLimitConfig(type = 'general') {
  const config = await getSystemConfig();

  return {
    limit: type === 'email' ? config?.emailRateLimit : config?.rateLimit,
    window: type === 'email' ? config?.emailRateLimitWindow : config?.rateLimitWindow,
  };
}

/**
 * Check if maintenance mode is active
 */
export async function isMaintenanceModeActive() {
  const config = await getSystemConfig();

  if (!config?.isMaintaining) return false;

  const now = new Date();
  return (
    (!config?.maintenanceStartTime || now >= config?.maintenanceStartTime) &&
    (!config?.maintenanceEndTime || now <= config?.maintenanceEndTime)
  );
}

/**
 * Get rate limit configuration for middleware
 */
export async function getRateLimitMiddlewareConfig(type = 'general') {
  const { limit, window } = await getRateLimitConfig(type);
  return { max: limit, windowMs: window };
}
