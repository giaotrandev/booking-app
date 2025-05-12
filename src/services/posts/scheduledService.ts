// src/services/posts/scheduled.service.ts
import { addJob, getAllQueues, QueueType } from '#queues/index';
import cron from 'node-cron';
import ms from 'ms';
import { prisma } from '#src/config/db';

/**
 * Get time in ms from environment variable or use default
 * @param envVar - Environment variable name
 * @param defaultValue - Default value if env var not set
 * @returns Time in milliseconds
 */
function getTimeFromEnv(envVar: string, defaultValue: string): number {
  const timeString = process.env[envVar] || defaultValue;
  try {
    return ms(timeString as ms.StringValue);
  } catch (error) {
    console.warn(`Invalid time format for ${envVar}: ${timeString}. Using default: ${defaultValue}`);
    return ms(defaultValue as ms.StringValue);
  }
}

// Get batch size from environment variables
const POSTS_BATCH_SIZE = parseInt(process.env.POSTS_BATCH_SIZE || '5', 10);

// Get future post window duration
const FUTURE_POSTS_WINDOW = getTimeFromEnv('FUTURE_POSTS_WINDOW', '1h');

// Get small delay between processing posts
const POST_PROCESSING_DELAY = getTimeFromEnv('POST_PROCESSING_DELAY', '100ms');

/**
 * Check if queues are ready to process jobs
 * This improved version checks multiple indicators of readiness
 */
function areQueuesReady(): boolean {
  const queues = getAllQueues();

  if (Object.keys(queues).length === 0) {
    console.log('No queues have been initialized yet');
    return false;
  }

  const queue = queues[QueueType.SCHEDULED_POSTS];
  if (!queue) {
    console.log('SCHEDULED_POSTS queue has not been initialized');
    return false;
  }

  // Log trạng thái chi tiết để debug
  console.log(`Queue status details:`, {
    clientExists: !!queue.client,
    clientStatus: queue.client?.status,
    queueName: queue.name,
  });

  // Nếu client tồn tại và có trạng thái ready hoặc connecting
  return !!(queue.client && (queue.client.status === 'ready' || queue.client.status === 'connecting'));
}

/**
 * Check for posts that need to be published and schedule them
 */
export async function schedulePostsForPublishing(): Promise<void> {
  try {
    // Check if queues are ready before proceeding
    if (!areQueuesReady()) {
      console.log('Queues not ready yet, skipping scheduled posts check');
      return;
    }

    const now = new Date();

    // Find posts that need to be published now
    const postsToPublishNow = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now,
          not: null,
        },
        isDeleted: false,
      },
      select: {
        id: true,
      },
      take: POSTS_BATCH_SIZE,
    });

    if (postsToPublishNow.length > 0) {
      console.log(`Found ${postsToPublishNow.length} posts to publish immediately`);

      // Process posts one by one to avoid memory spikes
      for (const post of postsToPublishNow) {
        try {
          await addJob(QueueType.SCHEDULED_POSTS, { postId: post.id }, { removeOnComplete: true });
          console.log(`Queued post ${post.id} for publishing`);

          // Small delay to spread load
          await new Promise((resolve) => setTimeout(resolve, POST_PROCESSING_DELAY));
        } catch (error) {
          console.error(`Error scheduling post ${post.id}:`, error);
          // Continue with next post
        }
      }
    }

    // Only process future posts occasionally to save resources
    // Get check frequency from env var
    const CHECK_FUTURE_POSTS_MINUTES = parseInt(process.env.CHECK_FUTURE_POSTS_MINUTES || '15', 10);

    if (now.getMinutes() % CHECK_FUTURE_POSTS_MINUTES === 0) {
      // Get posts scheduled within the future window
      const futureTime = new Date(now.getTime() + FUTURE_POSTS_WINDOW);

      const postsToSchedule = await prisma.post.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            gt: now,
            lte: futureTime,
            not: null,
          },
          isDeleted: false,
        },
        select: {
          id: true,
          scheduledAt: true,
        },
        take: POSTS_BATCH_SIZE,
      });

      if (postsToSchedule.length > 0) {
        console.log(`Found ${postsToSchedule.length} posts to schedule for future publishing`);

        // Schedule these with delay
        for (const post of postsToSchedule) {
          if (!post.scheduledAt) continue;

          const delay = post.scheduledAt.getTime() - now.getTime();

          if (delay > 0) {
            try {
              await addJob(
                QueueType.SCHEDULED_POSTS,
                { postId: post.id },
                {
                  delay,
                  jobId: `publish-post-${post.id}`,
                  removeOnComplete: true,
                }
              );
              console.log(`Scheduled post ${post.id} to be published at ${post.scheduledAt}`);
            } catch (error) {
              console.error(`Error scheduling future post ${post.id}:`, error);
              // Continue with next post
            }
          }

          // Small delay to spread load
          await new Promise((resolve) => setTimeout(resolve, POST_PROCESSING_DELAY));
        }
      }
    }
  } catch (error) {
    console.error('Error scheduling posts for publishing:', error);
  }
}

/**
 * Set up the cron job for post scheduling with an initial delay
 */
export function setupPostScheduler(): void {
  // Get cron expression from environment variable or use default
  const cronExpression = process.env.POST_SCHEDULER_CRON || '*/5 * * * *';

  // Get initial delay to let Redis connect first
  const INITIAL_DELAY = getTimeFromEnv('POST_SCHEDULER_INITIAL_DELAY', '15s');

  console.log(`⏱️  Post scheduler will start in ${ms(INITIAL_DELAY, { long: true })}`);

  // Delay the first run to allow Redis to connect
  setTimeout(() => {
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error(`Invalid cron expression: ${cronExpression}. Using default: */5 * * * *`);

      // Use default cron expression
      const task = cron.schedule('*/5 * * * *', async () => {
        console.log('Running post scheduler');
        await schedulePostsForPublishing();
      });

      // Make sure the task doesn't prevent the process from exiting
      task.start();
    } else {
      // Schedule with specified cron expression
      const task = cron.schedule(cronExpression, async () => {
        console.log(`Running post scheduler with schedule: ${cronExpression}`);
        await schedulePostsForPublishing();
      });

      // Make sure the task doesn't prevent the process from exiting
      task.start();
    }

    console.log(`✓ Post scheduler started with cron expression: ${cronExpression}`);

    // Run immediately after delay if configured
    if (process.env.POST_SCHEDULER_RUN_ON_STARTUP === 'true') {
      console.log('Running post scheduler on startup');
      schedulePostsForPublishing().catch((error) => {
        console.error('Error on initial post scheduling:', error);
      });
    }
  }, INITIAL_DELAY);
}
