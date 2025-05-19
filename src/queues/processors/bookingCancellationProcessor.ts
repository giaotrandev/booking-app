import { QueueType, getQueue } from '#queues/index';
import { cancelExpiredBooking } from '#controllers/bookingController';

interface CancelBookingJobData {
  bookingId: string;
  reason?: string;
}

/**
 * Set up the processor for booking cancellation
 */
export function setupBookingCancellationProcessor(): void {
  console.log('🚀 Setting up Booking Cancellation Processor');

  try {
    const queue = getQueue(QueueType.BOOKING_CANCELLATION);

    const concurrency = parseInt(process.env.BOOKING_CANCELLATION_CONCURRENCY || '5', 10);
    console.log(`Booking cancellation processor concurrency: ${concurrency}`);

    // Log queue events
    queue.on('error', (error) => {
      console.error('❌ Booking Cancellation Queue Error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    });

    queue.on('waiting', (jobId) => {
      console.log(`🕰️ Booking cancellation job ${jobId} is waiting in queue`);
    });

    queue.on('active', (job) => {
      console.log(`🏃 Booking cancellation job ${job.id} is now active`);
    });

    queue.on('completed', (job, result) => {
      console.log(`✅ Booking cancellation job ${job.id} completed:`, result);
    });

    queue.on('failed', (job, err) => {
      console.error(`❌ Booking cancellation job ${job.id} failed:`, {
        error: err.message,
        stack: err.stack,
        jobData: job.data,
      });
    });

    // Process booking cancellation jobs
    queue.process(concurrency, async (job) => {
      const { bookingId, reason } = job.data as CancelBookingJobData;

      console.log(`🔍 Processing booking cancellation for booking ${bookingId}`);

      try {
        // Call the cancellation function from booking controller
        await cancelExpiredBooking(bookingId);

        return {
          success: true,
          bookingId,
          reason: reason || 'Payment timeout',
          processedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`❌ Error cancelling booking ${bookingId}:`, error);

        // Re-throw the error so Bull marks the job as failed
        throw new Error(
          `Failed to cancel booking ${bookingId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    console.log(`✓ Booking cancellation processor initialized with concurrency ${concurrency}`);
  } catch (error) {
    console.error('❌ Failed to set up Booking Cancellation Processor:', error);
  }
}
