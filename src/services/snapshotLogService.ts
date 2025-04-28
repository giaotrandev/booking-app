import { prisma } from '#src/config/db';
import zlib from 'zlib';
import { promisify } from 'util';

// Promisify zlib functions
const compress = promisify(zlib.gzip);
const decompress = promisify(zlib.gunzip);

interface SnapshotLogOptions {
  entityId: string;
  entityType: string;
  actionType: string;
  snapshot: any;
  metadata?: Record<string, any>;
  performedBy?: string;
}

export async function createSnapshotLog(options: SnapshotLogOptions) {
  try {
    // Convert snapshot to JSON string
    const snapshotString = JSON.stringify(options.snapshot || {});

    // Compress the JSON string
    const compressedSnapshot = await compress(Buffer.from(snapshotString));

    return await prisma.snapshotLog.create({
      data: {
        entityId: options.entityId,
        entityType: options.entityType,
        actionType: options.actionType,
        compressedSnapshot: compressedSnapshot,
        metadata: options.metadata || {},
        performedBy: options.performedBy,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error creating snapshot log:', error);
    throw error;
  }
}

export async function getDecompressedSnapshot(logId: string) {
  const log = await prisma.snapshotLog.findUnique({
    where: { id: logId },
  });

  if (!log) {
    throw new Error('Snapshot log not found');
  }

  try {
    // Decompress the snapshot
    const decompressedBuffer = await decompress(log.compressedSnapshot);

    // Convert buffer to string and parse JSON
    return JSON.parse(decompressedBuffer.toString('utf-8'));
  } catch (error) {
    console.error('Error decompressing snapshot:', error);
    throw new Error('Failed to decompress snapshot');
  }
}

export async function getLatestSnapshotAtTimestamp(entityId: string, entityType: string, timestamp: Date) {
  const logs = await prisma.snapshotLog.findMany({
    where: {
      entityId,
      entityType,
      createdAt: { lte: timestamp },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  if (logs.length === 0) {
    return null;
  }

  return getDecompressedSnapshot(logs[0].id);
}
