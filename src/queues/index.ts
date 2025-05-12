import { QueueType, getQueue, addJob, initializeQueues, setupMemoryMonitoring, getAllQueues } from './queues';

// Export main queue functionality
export { QueueType, getQueue, addJob, initializeQueues, setupMemoryMonitoring, getAllQueues };

// Import processors
import { setupEmailProcessor } from './processors/emailProcessor';
import { setupScheduledPostsProcessor } from './processors/scheduledPostsProcessor';

/**
 * Initialize all queue processors
 */
export function setupQueueProcessors(): void {
  // Set up processors for each queue type
  // setupEmailProcessor();
  setupScheduledPostsProcessor();

  console.log('✓ All queue processors initialized');
}
