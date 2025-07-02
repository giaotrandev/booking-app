import { QueueType, getQueue, addJob, initializeQueues, setupMemoryMonitoring, getAllQueues } from './queues';

// Export main queue functionality
export { QueueType, getQueue, addJob, initializeQueues, setupMemoryMonitoring, getAllQueues };

// Import processors
import { setupEmailProcessor } from './processors/emailProcessor';
import { setupScheduledPostsProcessor } from './processors/scheduledPostsProcessor';
import { setupBookingCancellationProcessor } from './processors/bookingCancellationProcessor';
import { setupSeatStatusProcessor } from './processors/seatStatusProcessor';

/**
 * Initialize all queue processors
 */
export function setupQueueProcessors(): void {
  // Set up processors for each queue type
  // setupEmailProcessor();
  setupScheduledPostsProcessor();
  setupBookingCancellationProcessor();
  // setupSeatStatusProcessor();
  console.log('✓ All queue processors initialized');
}
