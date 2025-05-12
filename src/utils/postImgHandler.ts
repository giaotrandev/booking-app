// postImgHandler.ts - Improved implementation
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { uploadFileToR2, deleteFileFromR2 } from '#services/r2Service';
import { StorageFolders } from '#services/r2Service';

const CLOUDFLARE_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';

/**
 * Handle featured image upload from various sources
 * @param featuredImage - Could be a base64 string, URL, or file object
 * @returns The public URL of the uploaded image
 */
export const handleFeaturedImage = async (featuredImage: any): Promise<string | null> => {
  if (!featuredImage) return null;

  try {
    // Case 1: It's already a URL that points to our storage (no change needed)
    if (typeof featuredImage === 'string' && featuredImage.startsWith(CLOUDFLARE_PUBLIC_URL)) {
      return featuredImage;
    }

    // Case 2: It's a base64 encoded image
    if (typeof featuredImage === 'string' && featuredImage.startsWith('data:image')) {
      return uploadBase64Image(featuredImage);
    }

    // Case 3: It's a File object from multer
    if (featuredImage.path && featuredImage.originalname) {
      return uploadFileImage(featuredImage);
    }

    // Case 4: It's a URL from somewhere else (needs re-upload)
    if (typeof featuredImage === 'string' && (featuredImage.startsWith('http') || featuredImage.startsWith('https'))) {
      // Implementation for downloading and re-uploading external images would go here
      // For now, just return the external URL
      return featuredImage;
    }

    console.error('Unrecognized featured image format:', typeof featuredImage);
    return null;
  } catch (error) {
    console.error('Featured image processing error:', error);
    throw new Error('Failed to process featured image');
  }
};

/**
 * Upload a base64 encoded image
 */
const uploadBase64Image = async (base64String: string): Promise<string> => {
  // Extract MIME type and data
  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string format');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const extension = mimeType.split('/')[1] || 'png';

  // Generate unique filename
  const fileName = `${uuidv4()}.${extension}`;
  const tempFilePath = path.join(process.cwd(), 'temp', fileName);

  // Ensure temp directory exists
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Write base64 to temp file
  fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));

  try {
    // Upload to R2
    const fileKey = await uploadFileToR2(tempFilePath, StorageFolders.DOCUMENTS, fileName, mimeType);

    // Construct public URL
    return `${CLOUDFLARE_PUBLIC_URL}/${fileKey}`;
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};

/**
 * Upload a file from multer
 */
const uploadFileImage = async (file: Express.Multer.File): Promise<string> => {
  // Generate unique filename
  const fileName = `${uuidv4()}${path.extname(file.originalname)}`;

  // Upload to R2
  const fileKey = await uploadFileToR2(file.path, StorageFolders.DOCUMENTS, fileName, file.mimetype);

  // Construct public URL
  return `${CLOUDFLARE_PUBLIC_URL}/${fileKey}`;
};

/**
 * Extract and upload images from post content
 * @param content - HTML content of the post
 * @returns Modified content with uploaded image URLs
 */
export const processContentImages = async (content: string): Promise<string> => {
  if (!content) return '';

  // Use a regex to find base64 or local image sources
  const base64ImageRegex = /src="data:image\/([a-zA-Z]*);base64,([^"]+)"/g;

  let modifiedContent = content;
  const uploadPromises: Promise<void>[] = [];

  // Find and replace base64 images
  const base64Matches = [...content.matchAll(base64ImageRegex)];
  base64Matches.forEach((match) => {
    const fullMatch = match[0];
    const fullBase64String = `data:image/${match[1]};base64,${match[2]}`;

    // Add upload promise
    const uploadPromise = uploadBase64Image(fullBase64String)
      .then((publicUrl) => {
        // Replace base64 source with public URL
        modifiedContent = modifiedContent.replace(fullMatch, `src="${publicUrl}"`);
      })
      .catch((error) => {
        console.error('Content image upload error:', error);
        // Keep the original src if upload fails
      });

    uploadPromises.push(uploadPromise);
  });

  // Wait for all uploads to complete
  await Promise.all(uploadPromises);

  return modifiedContent;
};

/**
 * Delete an image from R2
 * @param imageUrl - Public URL of the image to delete
 */
export const deleteImage = async (imageUrl: string | null): Promise<void> => {
  if (!imageUrl || !imageUrl.startsWith(CLOUDFLARE_PUBLIC_URL)) return;

  try {
    // Extract file key from URL
    const fileKey = imageUrl.replace(`${CLOUDFLARE_PUBLIC_URL}/`, '');

    await deleteFileFromR2(fileKey);
  } catch (error) {
    console.error('Image deletion error:', error);
    // Non-critical error, so we don't throw
  }
};

/**
 * Extract image URLs from content
 * @param content - HTML content
 * @returns Array of image URLs
 */
const extractImageUrls = (content: string): string[] => {
  if (!content) return [];

  const imageRegex = /src="([^"]+)"/g;
  const matches = [...content.matchAll(imageRegex)];
  return matches.map((match) => match[1]).filter((url) => url && url.startsWith(CLOUDFLARE_PUBLIC_URL));
};

/**
 * Clean up images from previous version of post
 * @param oldContent - Previous post content
 * @param newContent - New post content
 * @param oldFeaturedImage - Previous featured image URL
 * @param newFeaturedImage - New featured image URL
 */
export const cleanupUnusedImages = async (
  oldContent: string,
  newContent: string,
  oldFeaturedImage?: string | null,
  newFeaturedImage?: string | null
): Promise<void> => {
  // Compare old and new images in content
  const oldContentImages = extractImageUrls(oldContent);
  const newContentImages = extractImageUrls(newContent);

  // Images to delete from content
  const contentImagesToDelete = oldContentImages.filter((img) => !newContentImages.includes(img));

  // Delete unused content images
  await Promise.all(contentImagesToDelete.map((img) => deleteImage(img)));

  // Handle featured image
  if (oldFeaturedImage && oldFeaturedImage !== newFeaturedImage) {
    await deleteImage(oldFeaturedImage);
  }
};
