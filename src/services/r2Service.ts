import { s3Client } from '#src/config/cloudflare';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || '';

export const StorageFolders = {
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  TEMP: 'temp',
  TRIPS: 'trips',
  ROUTES: 'trips',
  VEHICLES: 'vehicles',
};

/**
 * Upload a file to Cloudflare R2
 */
export const uploadFileToR2 = async (
  filePath: string,
  folder: string = StorageFolders.TEMP,
  fileName?: string,
  contentType?: string
): Promise<string> => {
  try {
    // Validate bucket name
    if (!BUCKET_NAME) {
      throw new Error('R2 bucket name is not configured');
    }

    // Generate a file name if not provided
    const fileBaseName = fileName || path.basename(filePath);

    // Create the file key with folder structure
    const fileKey = `${folder}/${fileBaseName}`;

    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Determine content type if not provided
    let fileContentType = contentType;
    if (!fileContentType) {
      const extension = path.extname(filePath).toLowerCase();
      fileContentType = getContentTypeFromExtension(extension);
    }

    // Upload to R2
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: fileContent,
      ContentType: fileContentType,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    console.log(`Successfully uploaded file to R2: ${fileKey}`);

    // Verify file exists in R2
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
        })
      );
      console.log(`Verified file exists in R2: ${fileKey}`);
    } catch (verifyError) {
      console.error(`Failed to verify file in R2: ${fileKey}`, verifyError);
      const errorMessage = verifyError instanceof Error ? verifyError.message : 'Unknown error occurred';
      throw new Error(`File upload verification failed: ${errorMessage}`);
    }

    // Return the file key
    return fileKey;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw error;
  }
};

/**
 * Determine content type from file extension
 */
function getContentTypeFromExtension(extension: string): string {
  const contentTypeMap: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
  };

  return contentTypeMap[extension] || 'application/octet-stream';
}

/**
 * Get a signed URL for accessing a file
 */
export const getSignedUrlForFile = async (fileKey: string, expirationInSeconds = 3600): Promise<string> => {
  try {
    // Validate bucket name
    if (!BUCKET_NAME) {
      throw new Error('R2 bucket name is not configured');
    }

    // Check if file exists before generating URL
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
        })
      );
    } catch (error) {
      console.error(`File does not exist in R2: ${fileKey}`, error);
      throw new Error(`File not found in R2: ${fileKey}`);
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
    };

    // Generate signed URL
    const url = await getSignedUrl(s3Client, new GetObjectCommand(params), {
      expiresIn: expirationInSeconds,
    });

    console.log(`Generated signed URL for ${fileKey} (expires in ${expirationInSeconds}s)`);
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

export const deleteFileFromR2 = async (fileKey: string): Promise<void> => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
    };

    await s3Client.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    throw error;
  }
};

/**
 * Get public URL for accessing a file
 */
export function getPublicR2Url(fileKey: string): string {
  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';
  if (!publicBaseUrl) {
    throw new Error('Cloudflare R2 public URL is not configured');
  }
  return `${publicBaseUrl}/${fileKey}`;
}
