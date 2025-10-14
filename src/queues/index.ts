import { QueueType, getQueue, addJob, initializeQueues, setupMemoryMonitoring, getAllQueues } from './queues';

// Export main queue functionality
export { QueueType, getQueue, addJob, initializeQueues, setupMemoryMonitoring, getAllQueues };

// Import processors
import { setupEmailProcessor } from './processors/emailProcessor';
import { setupScheduledPostsProcessor } from './processors/scheduledPostsProcessor';
import { setupBookingCancellationProcessor } from './processors/bookingCancellationProcessor';
import { setupSeatStatusProcessor } from './processors/seatStatusProcessor';
import { setupBookingEmailProcessor } from './processors/bookingEmailProcessor';

/**
 * Initialize all queue processors với STAGGERED STARTUP
 * Đây là KEY để tránh "Too many requests" error!
 */
export function setupQueueProcessors(): void {
  // Stagger delay từ env hoặc dùng default 3 giây
  const STAGGER_DELAY = parseInt(process.env.QUEUE_PROCESSOR_STAGGER_DELAY || '3000', 10);

  const processors = [
    { name: 'Email', setup: setupEmailProcessor, delay: 0 },
    { name: 'Booking Email', setup: setupBookingEmailProcessor, delay: STAGGER_DELAY },
    { name: 'Scheduled Posts', setup: setupScheduledPostsProcessor, delay: STAGGER_DELAY * 2 },
    { name: 'Booking Cancellation', setup: setupBookingCancellationProcessor, delay: STAGGER_DELAY * 3 },
    { name: 'Seat Status', setup: setupSeatStatusProcessor, delay: STAGGER_DELAY * 4 },
  ];

  console.log(`⏳ Initializing ${processors.length} processors with ${STAGGER_DELAY}ms stagger delay...`);

  processors.forEach(({ name, setup, delay }) => {
    if (delay === 0) {
      // Khởi tạo processor đầu tiên ngay lập tức
      try {
        setup();
        console.log(`✓ ${name} processor initialized (immediate)`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${name} processor:`, error);
      }
    } else {
      // Các processors còn lại được khởi tạo với delay
      setTimeout(() => {
        try {
          setup();
          console.log(`✓ ${name} processor initialized (after ${delay}ms)`);
        } catch (error) {
          console.error(`❌ Failed to initialize ${name} processor:`, error);
        }
      }, delay);
    }
  });

  const totalTime = STAGGER_DELAY * (processors.length - 1);
  console.log(`⏱️  All processors will be ready in approximately ${(totalTime / 1000).toFixed(1)}s`);
}
