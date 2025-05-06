import { setTimeout } from 'timers/promises';
import fs from 'fs';

/**
 * Safely delete a file with retries for Windows EBUSY errors
 */
export default async function safeDeleteFile(filePath: string, maxRetries = 5, delayMs = 100): Promise<void> {
  if (!fs.existsSync(filePath)) {
    return;
  }

  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Successfully deleted file: ${filePath}`);
      return;
    } catch (error) {
      attempts++;

      // If this is an EBUSY error (common on Windows) and we have retries left
      if (error instanceof Error && 'code' in error && error.code === 'EBUSY' && attempts < maxRetries) {
        console.log(`File busy (attempt ${attempts}/${maxRetries}), retrying in ${delayMs}ms: ${filePath}`);
        await setTimeout(delayMs);
        // Increase delay for next retry (exponential backoff)
        delayMs *= 2;
      } else if (attempts >= maxRetries) {
        console.warn(`Failed to delete file after ${maxRetries} attempts: ${filePath}`);
        // Don't throw the error, just log a warning
        return;
      } else {
        // For other errors, log but don't throw
        console.error(`Error deleting file: ${filePath}`, error);
        return;
      }
    }
  }
}
