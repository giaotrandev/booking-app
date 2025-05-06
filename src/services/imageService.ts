import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Define image optimization options
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

// Default optimization settings
const defaultOptions: ImageOptimizationOptions = {
  width: 500,
  quality: 80,
  format: 'webp', // WebP offers great compression with good quality
};

export const optimizeImage = async (filePath: string, options: ImageOptimizationOptions = {}): Promise<string> => {
  try {
    // Merge default options with provided options
    const settings = { ...defaultOptions, ...options };

    // Create a new file name for the optimized image
    const parsedPath = path.parse(filePath);
    const optimizedDir = path.join(parsedPath.dir, 'optimized');
    const uniqueId = crypto.randomBytes(4).toString('hex');
    const outputFormat = settings.format || 'webp';
    const outputFilename = `${parsedPath.name}-optimized-${uniqueId}.${outputFormat}`;
    const outputPath = path.join(optimizedDir, outputFilename);

    // Create the output directory if it doesn't exist
    if (!fs.existsSync(optimizedDir)) {
      fs.mkdirSync(optimizedDir, { recursive: true });
    }

    // Process image with sharp
    const sharpInstance = sharp(filePath);

    // Resize if dimensions provided
    if (settings.width || settings.height) {
      sharpInstance.resize({
        width: settings.width,
        height: settings.height,
        fit: 'cover',
        position: 'center',
      });
    }

    // Set output format and quality
    switch (settings.format) {
      case 'jpeg':
        await sharpInstance.jpeg({ quality: settings.quality }).toFile(outputPath);
        break;
      case 'png':
        await sharpInstance.png({ quality: settings.quality }).toFile(outputPath);
        break;
      case 'avif':
        await sharpInstance.avif({ quality: settings.quality }).toFile(outputPath);
        break;
      case 'webp':
      default:
        await sharpInstance.webp({ quality: settings.quality }).toFile(outputPath);
        break;
    }

    return outputPath;
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw error;
  }
};

export const generateAvatarVariants = async (
  filePath: string
): Promise<{ original: string; medium: string; thumbnail: string }> => {
  // Generate multiple sizes for different use cases
  const medium = await optimizeImage(filePath, { width: 300, height: 300 });
  const thumbnail = await optimizeImage(filePath, { width: 100, height: 100 });

  return {
    original: filePath,
    medium,
    thumbnail,
  };
};
