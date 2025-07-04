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
