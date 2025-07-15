// Helper function to remove timestamp fields from any object
export const removeTimestamps = <T extends Record<string, any>>(
  obj: T
): Omit<T, 'createdAt' | 'updatedAt' | 'deletedAt'> => {
  const { createdAt, updatedAt, deletedAt, ...rest } = obj;
  return rest as Omit<T, 'createdAt' | 'updatedAt' | 'deletedAt'>;
};

// Helper function to recursively remove timestamps from nested objects
export const deepRemoveTimestamps = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(deepRemoveTimestamps);

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (['createdAt', 'updatedAt', 'deletedAt'].includes(key)) continue;
      cleaned[key] = deepRemoveTimestamps(obj[key]);
    }
    return cleaned;
  }

  return obj;
};

export interface TimeRange {
  start: number; // hour (0-23)
  end: number; // hour (0-23)
}

/**
 * Parse time ranges from simple string format
 * @param timeRangesStr - String format: "1-5,7-12,23-2" or "1-5"
 * @returns Array of TimeRange objects
 * @throws Error if format is invalid
 */
export const parseTimeRanges = (timeRangesStr: string): TimeRange[] => {
  if (!timeRangesStr || timeRangesStr.trim() === '') {
    return [];
  }

  const ranges = timeRangesStr.split(',').map((range) => range.trim());
  const timeRanges: TimeRange[] = [];

  for (const range of ranges) {
    const parts = range.split('-').map((part) => part.trim());

    if (parts.length !== 2) {
      throw new Error(`Invalid time range format: "${range}". Expected format: "start-end"`);
    }

    const start = parseInt(parts[0]);
    const end = parseInt(parts[1]);

    // Validate numbers
    if (isNaN(start) || isNaN(end)) {
      throw new Error(`Invalid time range format: "${range}". Start and end must be numbers`);
    }

    // Validate range (0-23)
    if (start < 0 || start > 23 || end < 0 || end > 23) {
      throw new Error(`Invalid time range: "${range}". Hours must be between 0-23`);
    }

    timeRanges.push({ start, end });
  }

  return timeRanges;
};

/**
 * Check if an hour falls within any of the specified time ranges
 * @param hour - Hour to check (0-23)
 * @param timeRanges - Array of time ranges
 * @returns true if hour falls within any range
 */
export const isHourInTimeRanges = (hour: number, timeRanges: TimeRange[]): boolean => {
  return timeRanges.some((range) => {
    if (range.start <= range.end) {
      // Normal range (e.g., 1-5: 1:00-5:59)
      return hour >= range.start && hour <= range.end;
    } else {
      // Overnight range (e.g., 23-2: 23:00-2:59)
      return hour >= range.start || hour <= range.end;
    }
  });
};
