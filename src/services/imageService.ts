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

interface ConversionOptions {
  width?: number;
  height?: number | null;
  quality?: number;
  background?: {
    r: number;
    g: number;
    b: number;
    alpha: number;
  };
}

/**
 * Convert SVG to PNG for email compatibility
 * @param svgBuffer - SVG file buffer
 * @param options - Conversion options
 * @returns PNG buffer
 */
export async function convertSvgToPng(svgBuffer: Buffer, options: ConversionOptions = {}): Promise<Buffer> {
  const {
    width = 400,
    height = null,
    quality = 90,
    background = { r: 255, g: 255, b: 255, alpha: 0 }, // transparent background
  } = options;

  try {
    const pngBuffer = await sharp(svgBuffer)
      .png({
        quality,
        compressionLevel: 9,
        adaptiveFiltering: false,
      })
      .resize(width, height, {
        withoutEnlargement: true,
        fit: 'inside',
        background,
      })
      .toBuffer();

    return pngBuffer;
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
    throw new Error(`SVG conversion failed: ${(error as Error).message}`);
  }
}

export async function processLogoForEmail(
  logoPath: string,
  getPublicR2Url: (path: string) => string
): Promise<string | null> {
  if (!logoPath) return null;

  try {
    // Get the public URL
    const imageUrl = await getPublicR2Url(logoPath);
    console.log('Processing logo from:', imageUrl);

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || '';

    console.log('Original file size:', buffer.length, 'bytes');
    console.log('MIME type:', mimeType);

    let finalBuffer: Buffer = buffer;
    let finalMimeType: string = mimeType;

    // Convert SVG to PNG for better email compatibility
    if (mimeType.includes('svg') || logoPath.toLowerCase().includes('.svg')) {
      console.log('Converting SVG to PNG...');

      finalBuffer = await convertSvgToPng(buffer, {
        width: 400, // Max width for email
        quality: 90,
        background: { r: 255, g: 255, b: 255, alpha: 0 }, // transparent
      });
      finalMimeType = 'image/png';

      console.log('Converted PNG size:', finalBuffer.length, 'bytes');
    }

    // Optimize other image formats if needed
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      finalBuffer = await sharp(buffer)
        .jpeg({ quality: 85, progressive: true })
        .resize(400, null, { withoutEnlargement: true, fit: 'inside' })
        .toBuffer();
      finalMimeType = 'image/jpeg';
    } else if (mimeType.includes('png')) {
      finalBuffer = await sharp(buffer)
        .png({ quality: 90, compressionLevel: 9 })
        .resize(400, null, { withoutEnlargement: true, fit: 'inside' })
        .toBuffer();
      finalMimeType = 'image/png';
    }

    // Check final size (should be under 100KB for email)
    const finalSizeKB = finalBuffer.length / 1024;
    console.log(`Final image: ${finalMimeType}, ${finalSizeKB.toFixed(1)}KB`);

    if (finalSizeKB > 100) {
      console.warn('Image size is large for email:', finalSizeKB.toFixed(1) + 'KB');
    }

    // Create base64 data URL
    const base64String = finalBuffer.toString('base64');
    const dataUrl = `data:${finalMimeType};base64,${base64String}`;

    console.log('Base64 data URL length:', dataUrl.length, 'characters');

    return dataUrl;
  } catch (error) {
    console.error('Error processing logo for email:', error);
    return null;
  }
}
