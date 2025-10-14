import Bull, { Queue, JobOptions } from 'bull';
import ms from 'ms';
import { getRedisQueueUrl } from '#config/redis';

// Queue types
export enum QueueType {
  EMAIL = 'email',
  EMAIL_BOOKING_CONFIRMATION = 'email-booking-confirmation',
  HISTORY = 'history',
  SCHEDULED_POSTS = 'scheduled-posts',
  IMAGE_PROCESSING = 'image-processing',
  BOOKING_CANCELLATION = 'booking-cancellation',
  SEAT_STATUS_CHECK = 'seat-status-check',
}

/**
 * Get time in ms from environment variable or use default
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
const CLEANUP_INTERVAL = getTimeFromEnv('QUEUE_CLEANUP_INTERVAL', '30m'); // TĂNG từ 10m → 30m
const FAILED_JOB_RETENTION = getTimeFromEnv('QUEUE_FAILED_JOB_RETENTION', '1d');
const OLD_JOB_CLEANUP_TIME = getTimeFromEnv('QUEUE_OLD_JOB_CLEANUP_TIME', '1h');
const LIMITER_DURATION = getTimeFromEnv('QUEUE_LIMITER_DURATION', '60s'); // TĂNG từ 10s → 60s
const MEMORY_CHECK_INTERVAL = getTimeFromEnv('QUEUE_MEMORY_CHECK_INTERVAL', '10m');

const MAX_ATTEMPTS = parseInt(process.env.QUEUE_MAX_ATTEMPTS || '2', 10);
const MAX_FAILED_JOBS = parseInt(process.env.QUEUE_MAX_FAILED_JOBS || '5', 10); // GIẢM từ 10 → 5
const LIMITER_MAX = parseInt(process.env.QUEUE_LIMITER_MAX || '50', 10);

// Memory-optimized options
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
 * LAZY LOADING: Queue chỉ được tạo khi cần thiết
 */
export function getQueue(name: QueueType): Queue {
  if (queues[name]) {
    return queues[name];
  }

  const redisUrl = getRedisQueueUrl();
  const verboseLogging = process.env.REDIS_VERBOSE_LOGGING === 'true';

  try {
    console.log(`🔄 Creating queue: ${name}...`);

    const queue = new Bull(name, redisUrl, {
      defaultJobOptions,
      limiter: {
        max: LIMITER_MAX,
        duration: LIMITER_DURATION,
      },
      redis: {
        tls: {
          rejectUnauthorized: process.env.NODE_ENV !== 'development',
        },
        maxRetriesPerRequest: null,
        connectTimeout: 30000, // TĂNG từ 20s → 30s
        retryStrategy: function (times) {
          // TĂNG delay để tránh spam reconnect
          const delay = Math.min(times * 500, 10000); // 500ms → 10s max
          return delay;
        },
        enableOfflineQueue: true,
        reconnectOnError: (err: Error & { code?: string }) => {
          const targetError = err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED';
          return targetError ? 2 : false;
        },
        keepAlive: 30000, // TĂNG từ 20s → 30s
        noDelay: true,
      },
      settings: {
        lockDuration: 30000,
        lockRenewTime: 15000,
        stalledInterval: 60000, // TĂNG từ 30s → 60s để giảm check frequency
        maxStalledCount: 1,
      },
    });

    // Logging với throttling
    if (verboseLogging) {
      queue.client.on('connect', () => console.log(`Redis client for queue ${name} connected`));
      queue.client.on('ready', () => console.log(`Redis client for queue ${name} ready`));
      queue.client.on('error', (err) => console.error(`Redis client for queue ${name} error:`, err));
      queue.client.on('reconnecting', () => console.log(`Redis client for queue ${name} reconnecting...`));
    } else {
      // Minimal logging
      queue.client.once('ready', () => {
        console.log(`✓ Redis client for queue ${name} connected and ready`);
      });

      // Throttled error logging
      const errorLog = new Map<string, number>();
      const ERROR_THROTTLE_MS = 300000; // 5 phút

      queue.client.on('error', (err) => {
        const errorKey = `${(err as any).code || 'UNKNOWN'}`;
        const now = Date.now();
        const lastLog = errorLog.get(errorKey);

        if (!lastLog || now - lastLog > ERROR_THROTTLE_MS) {
          console.error(`Redis error (${name}): ${errorKey}`);
          errorLog.set(errorKey, now);
        }
      });

      // Limit reconnection logs
      let reconnectCount = 0;
      queue.client.on('reconnecting', () => {
        if (reconnectCount < 3) {
          console.log(`Redis client for queue ${name} reconnecting (${reconnectCount + 1})...`);
          reconnectCount++;
        }
      });
    }

    // Setup cleanup với longer interval
    setupQueueCleanup(queue);
    queues[name] = queue;

    return queue;
  } catch (error) {
    console.error(`❌ Error creating queue ${name}:`, error);
    throw error;
  }
}

/**
 * Add job với retry logic cho rate limiting
 */
export async function addJob<T>(queueType: QueueType, data: T, options?: JobOptions): Promise<void> {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 3000, 5000]; // Exponential backoff

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const queue = getQueue(queueType);

      // TẮT job count check để giảm Redis commands
      const shouldCheckJobCounts = process.env.QUEUE_CHECK_JOB_COUNTS === 'true';

      if (shouldCheckJobCounts && queue.client?.status === 'ready') {
        try {
          const MAX_WAITING_JOBS = parseInt(process.env.QUEUE_MAX_WAITING_JOBS || '100', 10);
          const jobCounts = await queue.getJobCounts();

          if (jobCounts.waiting > MAX_WAITING_JOBS) {
            console.warn(`⚠️  Queue ${queueType} has ${jobCounts.waiting} waiting jobs`);
          }
        } catch (countError) {
          // Ignore count errors
        }
      }

      await queue.add(data, {
        ...defaultJobOptions,
        ...options,
        removeOnComplete: options?.removeOnComplete ?? true,
      });

      return; // Success!
    } catch (error) {
      const err = error as Error;

      if (err.message?.includes('Too many requests')) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt];
          console.warn(`⚠️  Rate limited on ${queueType}, retrying in ${delay}ms (${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      console.error(`❌ Error adding job to queue ${queueType}:`, error);
      throw error;
    }
  }
}

/**
 * Setup cleanup với LONGER interval để giảm Redis commands
 */
function setupQueueCleanup(queue: Queue): void {
  setInterval(async () => {
    try {
      // Batch cleanup để giảm số lượng commands
      await Promise.all([
        queue.clean(0, 'completed'),
        queue.clean(FAILED_JOB_RETENTION, 'failed'),
        queue.clean(OLD_JOB_CLEANUP_TIME, 'delayed'),
        queue.clean(OLD_JOB_CLEANUP_TIME, 'active'),
      ]);
    } catch (error) {
      // Don't log every cleanup error
      if (Math.random() < 0.1) {
        // Log only 10% of errors
        console.error(`Error cleaning queue ${queue.name}:`, error);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * KHÔNG khởi tạo queues ngay lập tức - chỉ log cấu hình
 */
export function initializeQueues(): void {
  try {
    console.log('✓ Queue system initialized (LAZY LOADING enabled)');
    console.log(`  • Job timeout: ${ms(JOB_TIMEOUT, { long: true })}`);
    console.log(`  • Retry delay: ${ms(RETRY_DELAY, { long: true })}`);
    console.log(`  • Cleanup interval: ${ms(CLEANUP_INTERVAL, { long: true })}`);
    console.log(`  • Rate limit: ${LIMITER_MAX} jobs per ${ms(LIMITER_DURATION, { long: true })}`);
    console.log('  • Queues will be created on-demand (lazy loading)');
  } catch (error) {
    console.error('Failed to initialize queues:', error);
  }
}

/**
 * Check Redis memory
 */
export async function checkRedisMemory(): Promise<void> {
  try {
    let queue: Queue | null = null;
    for (const queueName in QueueType) {
      if (queues[QueueType[queueName as keyof typeof QueueType]]) {
        queue = queues[QueueType[queueName as keyof typeof QueueType]];
        break;
      }
    }

    if (!queue) {
      return; // No queues yet, skip
    }

    const client = queue.client;
    if (!client.status || client.status !== 'ready') {
      return;
    }

    const info = await client.info();
    const memoryMatch = info.match(/used_memory_human:(\S+)/);

    if (memoryMatch?.[1]) {
      const memoryUsed = memoryMatch[1];
      const MEMORY_WARNING_THRESHOLD = parseFloat(process.env.REDIS_MEMORY_WARNING_MB || '20');

      // Only log if memory is high
      if (memoryUsed.includes('MB') && parseFloat(memoryUsed) > MEMORY_WARNING_THRESHOLD) {
        console.warn(`⚠️  Redis memory: ${memoryUsed} (threshold: ${MEMORY_WARNING_THRESHOLD}MB)`);

        // Emergency cleanup
        for (const queueName in queues) {
          const q = queues[queueName];
          await Promise.all([q.clean(0, 'completed'), q.clean(0, 'failed')]);
        }
      }
    }
  } catch (error) {
    // Don't crash on memory check error
  }
}

/**
 * Setup memory monitoring với delay
 */
export function setupMemoryMonitoring(): void {
  const INITIAL_DELAY = getTimeFromEnv('QUEUE_MEMORY_CHECK_INITIAL_DELAY', '30s'); // TĂNG từ 10s → 30s

  console.log(`✓ Memory monitoring will start in ${ms(INITIAL_DELAY, { long: true })}`);

  setTimeout(() => {
    checkRedisMemory().catch(() => {});

    setInterval(() => {
      checkRedisMemory().catch(() => {});
    }, MEMORY_CHECK_INTERVAL);

    console.log(`✓ Redis memory monitoring started (every ${ms(MEMORY_CHECK_INTERVAL, { long: true })})`);
  }, INITIAL_DELAY);
}

/**
 * Get all available queues
 */
export function getAllQueues(): Record<string, Queue> {
  return { ...queues };
}
