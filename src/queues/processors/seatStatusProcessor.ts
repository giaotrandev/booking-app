import { QueueType, getQueue } from '#queues/index';
import { PrismaClient } from '@prisma/client';
import { getTimeFromEnv } from '../queues';

const prisma = new PrismaClient();

interface SeatStatusCheckJobData {
  checkId: string; // Unique identifier for tracking
}

/**
 * Set up the processor for checking and updating RESERVED seat status
 */
export function setupSeatStatusProcessor(): void {
  console.log('🚀 Setting up Seat Status Processor');

  try {
    const queue = getQueue(QueueType.SEAT_STATUS_CHECK);

    const concurrency = parseInt(process.env.SEAT_STATUS_CHECK_CONCURRENCY || '1', 10);
    const checkInterval = getTimeFromEnv('SEAT_CHECK_INTERVAL', '1m');
    const reservedTimeout = getTimeFromEnv('SEAT_RESERVED_TIMEOUT', '10m');

    console.log(`Seat status processor concurrency: ${concurrency}`);
    console.log(`Seat status check interval: ${checkInterval}ms`);
    console.log(`Seat reserved timeout: ${reservedTimeout}ms`);

    // Log queue events
    queue.on('error', (error) => {
      console.error('❌ Seat Status Queue Error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    });

    queue.on('waiting', (jobId) => {
      console.log(`🕰️ Seat status check job ${jobId} is waiting in queue`);
    });

    queue.on('active', (job) => {
      console.log(`🏃 Seat status check job ${job.id} is now active`);
    });

    queue.on('completed', (job, result) => {
      console.log(`✅ Seat status check job ${job.id} completed:`, result);
    });

    queue.on('failed', (job, err) => {
      console.error(`❌ Seat status check job ${job.id} failed:`, {
        error: err.message,
        stack: err.stack,
        jobData: job.data,
      });
    });

    // Process seat status check jobs
    queue.process(concurrency, async (job) => {
      const { checkId } = job.data as SeatStatusCheckJobData;

      console.log(`🔍 Processing seat status check ${checkId}`);

      try {
        // Start a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Find all seats with RESERVED status
          const reservedSeats = await tx.seat.findMany({
            where: { status: 'RESERVED' },
          });

          if (reservedSeats.length === 0) {
            console.log('ℹ️ No RESERVED seats found');
            return { success: true, checkId, updatedSeats: 0 };
          }

          const now = new Date();
          let updatedSeats = 0;

          // Check each reserved seat
          for (const seat of reservedSeats) {
            const updatedAt = new Date(seat.updatedAt);
            const timeDiff = now.getTime() - updatedAt.getTime();

            if (timeDiff > reservedTimeout) {
              // Update seat status to AVAILABLE within transaction
              await tx.seat.update({
                where: { id: seat.id },
                data: {
                  status: 'AVAILABLE',
                  updatedAt: new Date(), // Update timestamp
                },
              });
              updatedSeats++;
              console.log(`🔄 Seat ${seat.id} status changed to AVAILABLE due to timeout`);
            }
          }

          return {
            success: true,
            checkId,
            updatedSeats,
            processedAt: new Date().toISOString(),
          };
        });

        return result;
      } catch (error) {
        console.error(`❌ Error processing seat status check ${checkId}:`, error);
        // Prisma transaction automatically rolls back on error
        throw new Error(
          `Failed to process seat status check ${checkId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Schedule repeatable job for periodic checks
    queue.add(
      { checkId: `seat-check-${Date.now()}` },
      {
        repeat: {
          every: checkInterval,
        },
        jobId: 'seat-status-check',
      }
    );

    console.log(`✓ Seat status processor initialized with concurrency ${concurrency}`);
  } catch (error) {
    console.error('❌ Failed to set up Seat Status Processor:', error);
  }
}
