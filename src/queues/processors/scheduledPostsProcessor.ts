// src/queues/processors/scheduled-posts.processor.ts
import { QueueType, getQueue } from '#queues/index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PublishPostJobData {
  postId: string;
}

/**
 * Set up the processor for scheduled posts
 */
export function setupScheduledPostsProcessor(): void {
  console.log('🚀 Setting up Scheduled Posts Processor');

  try {
    const queue = getQueue(QueueType.SCHEDULED_POSTS);

    console.log('Queue object created:', queue);
    console.log('Queue client status:', queue.client?.status);

    const concurrency = parseInt(process.env.SCHEDULED_POSTS_CONCURRENCY || '2', 10);
    console.log(`Processor concurrency: ${concurrency}`);

    // Log chi tiết các event của queue
    queue.on('error', (error) => {
      console.error('❌ Queue Error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    });

    queue.on('waiting', (jobId) => {
      console.log(`🕰️ Job ${jobId} is waiting in queue`);
    });

    queue.on('active', (job) => {
      console.log(`🏃 Job ${job.id} is now active`);
    });

    queue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed:`, result);
    });

    queue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, {
        error: err.message,
        stack: err.stack,
      });
    });

    // Kiểm tra trạng thái queue trước khi xử lý
    if (!queue.client || queue.client.status !== 'ready') {
      console.warn('⚠️  Queue client is not ready. Waiting for connection...');
    }

    queue.process(concurrency, async (job) => {
      const { postId } = job.data as PublishPostJobData;

      console.log(`🔍 Attempting to process post ${postId}`);

      try {
        const result = await prisma.$transaction(async (tx) => {
          const post = await tx.post.findUnique({
            where: { id: postId },
            select: {
              id: true,
              status: true,
              scheduledAt: true,
              authorId: true,
            },
          });

          if (!post) {
            console.error(`❌ Post ${postId} not found`);
            throw new Error(`Post ${postId} not found`);
          }

          console.log(`📋 Post details:`, {
            id: post.id,
            status: post.status,
            scheduledAt: post.scheduledAt,
          });

          const now = new Date();

          const updatedPost = await tx.post.update({
            where: { id: postId },
            data: {
              status: 'PUBLISHED',
              publishedAt: now,
              scheduledAt: null,
            },
          });

          await tx.postHistory.create({
            data: {
              postId,
              changedFields: {
                status: {
                  from: 'SCHEDULED',
                  to: 'PUBLISHED',
                },
                publishedAt: {
                  from: null,
                  to: now,
                },
              },
              changedBy: post.authorId,
              changeReason: 'Auto-published by scheduler',
            },
          });

          console.log(`✅ Successfully published post ${postId}`, updatedPost);
          return { success: true, post: updatedPost };
        });

        return result;
      } catch (error) {
        console.error(`❌ Critical error publishing post ${postId}:`, error);
        return {
          success: false,
          reason: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    console.log(`✓ Scheduled posts processor initialized with concurrency ${concurrency}`);
  } catch (error) {
    console.error('❌ Failed to set up Scheduled Posts Processor:', error);
  }
}
