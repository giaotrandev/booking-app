import Bull, { Queue, JobOptions } from 'bull';
import ms from 'ms';
import { getRedisQueueUrl, waitForRedisConnection } from '#config/redis';

// Queue types
export enum QueueType {
  EMAIL = 'email',
  HISTORY = 'history',
  SCHEDULED_POSTS = 'scheduled-posts',
  IMAGE_PROCESSING = 'image-processing',
  BOOKING_CANCELLATION = 'booking-cancellation',
  SEAT_STATUS_CHECK = 'seat-status-check',
}

/**
 * Get time in ms from environment variable or use default
 * @param envVar - Environment variable name
 * @param defaultValue - Default value if env var not set
 * @returns Time in milliseconds
 */
export function getTimeFromEnv(envVar: string, defaultValue: string): number {
  const timeString = process.env[envVar] || defaultValue;
  try {
    return ms(timeString as ms.StringValue);
  } catch (error) {
    console.warn(`Invalid time format for ${envVar}: ${timeString}. Using default: ${defaultValue}`);
    return ms(defaultValue as ms.StringValue);
  }
}

// Get timing configurations from environment variables
const JOB_TIMEOUT = getTimeFromEnv('QUEUE_JOB_TIMEOUT', '30s');
const RETRY_DELAY = getTimeFromEnv('QUEUE_RETRY_DELAY', '5s');
const CLEANUP_INTERVAL = getTimeFromEnv('QUEUE_CLEANUP_INTERVAL', '10m');
const FAILED_JOB_RETENTION = getTimeFromEnv('QUEUE_FAILED_JOB_RETENTION', '1d');
const OLD_JOB_CLEANUP_TIME = getTimeFromEnv('QUEUE_OLD_JOB_CLEANUP_TIME', '1h');
const LIMITER_DURATION = getTimeFromEnv('QUEUE_LIMITER_DURATION', '5s');
const MEMORY_CHECK_INTERVAL = getTimeFromEnv('QUEUE_MEMORY_CHECK_INTERVAL', '5m');

// Get max retry attempts from environment variable
const MAX_ATTEMPTS = parseInt(process.env.QUEUE_MAX_ATTEMPTS || '2', 10);

// Get max failed jobs to keep from environment variable
const MAX_FAILED_JOBS = parseInt(process.env.QUEUE_MAX_FAILED_JOBS || '10', 10);

// Get rate limiter max value from environment variable
const LIMITER_MAX = parseInt(process.env.QUEUE_LIMITER_MAX || '5', 10);

// Memory-optimized options for 25MB Redis instance
const defaultJobOptions: JobOptions = {
  removeOnComplete: true,
  removeOnFail: MAX_FAILED_JOBS,
  attempts: MAX_ATTEMPTS,
  backoff: {
    type: 'fixed',
    delay: RETRY_DELAY,
  },
  timeout: JOB_TIMEOUT,
};

// Queue instance cache
const queues: Record<string, Queue> = {};

/**
 * Get a queue instance with memory optimizations and reduced logging
 */
export function getQueue(name: QueueType): Queue {
  if (queues[name]) {
    return queues[name];
  }

  // Get Redis URL from the helper function
  const redisUrl = getRedisQueueUrl();

  // Control logging verbosity with environment variable
  const verboseLogging = process.env.REDIS_VERBOSE_LOGGING === 'true';
  const enableOfflineQueue = process.env.REDIS_ENABLE_OFFLINE_QUEUE === 'true';
  const enableReadyCheck = process.env.REDIS_ENABLE_READY_CHECK === 'true';

  try {
    // Create a queue with Redis URL
    // const queue = new Bull(name, redisUrl, {
    //   defaultJobOptions,
    //   limiter: {
    //     max: LIMITER_MAX,
    //     duration: LIMITER_DURATION,
    //   },
    //   redis: {
    //     maxRetriesPerRequest: 3,
    //     // enableOfflineQueue: enableOfflineQueue,
    //     // enableReadyCheck: enableReadyCheck,
    //     // Add connection timeout
    //     connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
    //     // Add reconnect strategy with minimum 5 second delay to avoid excessive reconnects
    //     retryStrategy: function (times) {
    //       const delay = parseInt(process.env.REDIS_RECONNECT_DELAY || '5000', 10);
    //       const maxDelay = parseInt(process.env.REDIS_MAX_RECONNECT_DELAY || '30000', 10);
    //       return Math.min(times * delay, maxDelay); // Max 30 second delay between retries
    //     },
    //     // Add automatic reconnection with limits
    //     reconnectOnError: function (err) {
    //       const targetError = err.message.includes('ECONNRESET') || err.message.includes('Connection lost');
    //       // Only reconnect on specific errors
    //       return targetError ? 2 : false; // 2 = reconnect and resend failed command
    //     },
    //     // Reduce connection overhead
    //     keepAlive: 10000, // Send keep-alive packet every 10 seconds
    //     noDelay: true, // Disable Nagle's algorithm
    //   },
    // });

    const queue = new Bull(name, redisUrl, {
      defaultJobOptions,
      limiter: {
        max: LIMITER_MAX,
        duration: LIMITER_DURATION,
      },
      redis: {
        tls: {
          rejectUnauthorized: !(process.env.NODE_ENV == 'development'),
        },
        maxRetriesPerRequest: null,
        connectTimeout: 20000,
        retryStrategy: function (times) {
          const delay = Math.min(times * 200, 5000);
          return delay;
        },
        enableOfflineQueue: true,
        reconnectOnError: (err: Error & { code?: string }) => {
          const targetError = err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED';
          return targetError ? 2 : false;
        },
        keepAlive: 20000,
        noDelay: true,
      },
    });

    // Add connection event listeners with reduced verbosity
    if (verboseLogging) {
      // Full verbose logging
      queue.client.on('connect', () => {
        console.log(`Redis client for queue ${name} connected`);
      });

      queue.client.on('ready', () => {
        console.log(`Redis client for queue ${name} ready`);
      });

      queue.client.on('error', (err) => {
        // Only log full error in verbose mode
        console.error(`Redis client for queue ${name} error:`, err);
      });

      queue.client.on('reconnecting', () => {
        console.log(`Redis client for queue ${name} reconnecting...`);
      });

      queue.client.on('close', () => {
        console.log(`Redis client for queue ${name} connection closed`);
      });

      queue.client.on('end', () => {
        console.log(`Redis client for queue ${name} connection ended`);
      });
    } else {
      // Reduced logging for production - only log important events

      // Log initial connection once
      let initialConnectionLogged = false;
      queue.client.once('ready', () => {
        console.log(`✓ Redis client for queue ${name} connected and ready`);
        initialConnectionLogged = true;
      });

      // Log errors but with minimal details to reduce noise
      const errorLog = new Set(); // Track unique error messages
      queue.client.on('error', (err) => {
        // Extract just the essential error info
        const errorKey = `${(err as any).code || 'UNKNOWN'}:${(err as any).syscall || 'unknown'}`;

        // Only log each unique error once per 5 minutes to reduce spam
        if (!errorLog.has(errorKey)) {
          errorLog.add(errorKey);
          console.error(`Redis client error (${name}): ${(err as any).code} [${(err as any).syscall}]`);

          // Clear this error from the log after 5 minutes so it can be logged again
          setTimeout(
            () => {
              errorLog.delete(errorKey);
            },
            5 * 60 * 1000
          );
        }
      });

      // For reconnections, just log the first few then stop to avoid log spam
      let reconnectCount = 0;
      queue.client.on('reconnecting', () => {
        if (reconnectCount < 5) {
          console.log(`Redis client for queue ${name} reconnecting (${reconnectCount + 1})...`);
          reconnectCount++;
        } else if (reconnectCount === 5) {
          console.log(`Redis client for queue ${name} continuing to reconnect silently...`);
          reconnectCount++;
        }
        // Reset counter after successful reconnection
        queue.client.once('ready', () => {
          if (reconnectCount > 5) {
            console.log(`✓ Redis client for queue ${name} reconnected successfully after ${reconnectCount} attempts`);
          }
          reconnectCount = 0;
        });
      });
    }

    // Set up automatic cleanup for the queue
    setupQueueCleanup(queue);

    // Store in cache
    queues[name] = queue;

    return queue;
  } catch (error) {
    console.error(`Error creating queue ${name}:`, error);
    throw error;
  }
}

/**
 * Add a job to a queue with safer connection handling
 */
export async function addJob<T>(queueType: QueueType, data: T, options?: JobOptions): Promise<void> {
  try {
    const queue = getQueue(queueType);

    // Flag to control job counts check
    const shouldCheckJobCounts = process.env.QUEUE_CHECK_JOB_COUNTS !== 'false';

    // Only check job counts if configured and Redis is likely to be ready
    if (shouldCheckJobCounts && queue.client && queue.client.status === 'ready') {
      try {
        // Get max waiting jobs from environment
        const MAX_WAITING_JOBS = parseInt(process.env.QUEUE_MAX_WAITING_JOBS || '100', 10);

        // Check queue size first to avoid memory issues
        const jobCounts = await queue.getJobCounts();

        if (jobCounts.waiting > MAX_WAITING_JOBS) {
          console.warn(`Queue ${queueType} has ${jobCounts.waiting} waiting jobs. Consider scaling workers.`);
        }
      } catch (countError) {
        // Don't fail if we can't get job counts
        console.warn(
          `Could not get job counts for ${queueType}:`,
          countError instanceof Error ? countError.message : 'Unknown error'
        );
      }
    }

    // Key change: directly add the job without waiting for Redis to be ready
    // Bull will handle queuing internally if REDIS_ENABLE_OFFLINE_QUEUE=true
    await queue.add(data, {
      ...defaultJobOptions,
      ...options,
      removeOnComplete: options?.removeOnComplete ?? true,
    });
  } catch (error) {
    console.error(`Error adding job to queue ${queueType}:`, error);
    throw error;
  }
}

/**
 * Set up periodic cleanup for queue
 */
function setupQueueCleanup(queue: Queue): void {
  // Clean completed jobs periodically
  setInterval(async () => {
    try {
      // Remove all completed jobs
      await queue.clean(0, 'completed');

      // Remove failed jobs older than configured time
      await queue.clean(FAILED_JOB_RETENTION, 'failed');

      // Also clean delayed and active jobs that are too old (stuck jobs)
      await queue.clean(OLD_JOB_CLEANUP_TIME, 'delayed');
      await queue.clean(OLD_JOB_CLEANUP_TIME, 'active');
    } catch (error) {
      console.error(`Error cleaning queue ${queue.name}:`, error);
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Initialize queue system
 */
export function initializeQueues(): void {
  try {
    // Get queues to initialize from environment
    const queuesToInit = (process.env.QUEUE_INIT_QUEUES || 'EMAIL').split(',');

    // Initialize specified queues
    for (const queueName of queuesToInit) {
      const queueType = queueName.trim() as QueueType;
      if (Object.values(QueueType).includes(queueType)) {
        getQueue(queueType);
      }
    }

    console.log('✓ Queue system initialized (memory-optimized for 25MB Redis)');
    console.log(`Job timeout: ${ms(JOB_TIMEOUT, { long: true })}`);
    console.log(`Retry delay: ${ms(RETRY_DELAY, { long: true })}`);
    console.log(`Cleanup interval: ${ms(CLEANUP_INTERVAL, { long: true })}`);
  } catch (error) {
    console.error('Failed to initialize queues:', error);
  }
}

/**
 * Check Redis memory usage
 */
export async function checkRedisMemory(): Promise<void> {
  try {
    // Use the first available queue to access Redis client
    let queue: Queue | null = null;
    for (const queueName in QueueType) {
      if (queues[QueueType[queueName as keyof typeof QueueType]]) {
        queue = queues[QueueType[queueName as keyof typeof QueueType]];
        break;
      }
    }

    if (!queue) {
      // If no queue exists yet, do nothing - we'll check on next interval
      console.log('No queues available yet for memory check, skipping...');
      return;
    }

    const client = queue.client;

    // Check if client is ready before proceeding
    if (!client.status || client.status !== 'ready') {
      console.log('Redis client not ready yet, skipping memory check...');
      return;
    }

    const info = await client.info();
    const memoryMatch = info.match(/used_memory_human:(\S+)/);

    if (memoryMatch && memoryMatch[1]) {
      const memoryUsed = memoryMatch[1];
      console.log(`Redis memory usage: ${memoryUsed}`);

      // Get memory warning threshold from environment
      const MEMORY_WARNING_THRESHOLD = parseFloat(process.env.REDIS_MEMORY_WARNING_MB || '20');

      if (memoryUsed.includes('MB') && parseFloat(memoryUsed) > MEMORY_WARNING_THRESHOLD) {
        console.warn(`⚠️ WARNING: Redis memory usage is above ${MEMORY_WARNING_THRESHOLD}MB`);

        // Emergency cleanup
        for (const queueName in queues) {
          const q = queues[queueName as any];
          await q.clean(0, 'completed');
          await q.clean(0, 'failed');
        }
      }
    }
  } catch (error) {
    // Don't crash the application on memory check error
    console.error('Error checking Redis memory:', error);
  }
}

/**
 * Set up memory monitoring with delayed initial check
 */
export function setupMemoryMonitoring(): void {
  // Wait a reasonable time for Redis to connect before first check
  const INITIAL_DELAY = getTimeFromEnv('QUEUE_MEMORY_CHECK_INITIAL_DELAY', '10s');

  console.log(`✓ Memory monitoring will start in ${ms(INITIAL_DELAY, { long: true })}`);

  // Delay the initial check to allow connections to establish
  setTimeout(() => {
    // Start the first check
    checkRedisMemory().catch((err) => {
      console.error('Failed to perform initial memory check:', err);
    });

    // Set up regular interval checks
    setInterval(() => {
      checkRedisMemory().catch((err) => {
        console.error('Failed to perform scheduled memory check:', err);
      });
    }, MEMORY_CHECK_INTERVAL);

    console.log('✓ Redis memory monitoring started, checking every', ms(MEMORY_CHECK_INTERVAL, { long: true }));
  }, INITIAL_DELAY);
}

/**
 * Get all available queues
 */
export function getAllQueues(): Record<string, Queue> {
  return { ...queues };
}
