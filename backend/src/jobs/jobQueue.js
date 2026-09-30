import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

const QUEUE_NAME = 'eduflow-background-jobs';

// 1. Task handler registry for serializable job execution
const taskRegistry = new Map();

export function registerTaskHandler(taskType, handlerFn) {
  taskRegistry.set(taskType, handlerFn);
}

// 2. Redis Connection Setup
let redisConnection = null;
let jobQueue = null;
let worker = null;
let queueEvents = null;
let useRedis = false;

const redisUrl = config?.REDIS_URL || process.env.REDIS_URL;
const redisHost = config?.REDIS_HOST || process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(config?.REDIS_PORT || process.env.REDIS_PORT || 6379);

try {
  const connectionOptions = redisUrl
    ? redisUrl
    : {
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      };

  redisConnection = new Redis(connectionOptions, {
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('Redis unavailable. Falling back to in-memory background job runner.');
        return null; // Stop reconnecting and trigger fallback
      }
      return Math.min(times * 500, 2000);
    }
  });

  redisConnection.on('error', (err) => {
    logger.warn(`Redis connection error: ${err.message}. Operating in fallback mode if needed.`);
  });

  // Test connection
  await redisConnection.connect().then(() => {
    useRedis = true;
    logger.info('Connected to Redis for durable background queue (BullMQ).');

    jobQueue = new Queue(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000
        },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 } // Retain failed jobs as dead-letter log
      }
    });

    // Concurrency limit: max 3 jobs processed at once
    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const { taskType, payload } = job.data;
        const handler = taskRegistry.get(taskType);
        if (!handler) {
          throw new Error(`No task handler registered for task type: ${taskType}`);
        }
        return await handler(payload);
      },
      {
        connection: redisConnection,
        concurrency: 3
      }
    );

    worker.on('failed', (job, err) => {
      logger.error(`BullMQ job ${job?.id} (${job?.data?.taskType}) failed on attempt ${job?.attemptsMade}: ${err.message}`);
    });

    worker.on('completed', (job) => {
      logger.info(`BullMQ job ${job?.id} (${job?.data?.taskType}) completed successfully.`);
    });
  }).catch(() => {
    useRedis = false;
  });
} catch (e) {
  useRedis = false;
  logger.warn('Redis connection failed on initialization. Falling back to memory queue.');
}

// 3. In-memory fallback map for non-redis environments
const memoryJobs = new Map();

/**
 * Enqueues a job durably via BullMQ if Redis is active,
 * or runs via an in-memory queue if Redis is not configured.
 *
 * @param {string} jobId - Unique job identifier
 * @param {string|Function} taskOrType - Registered task name (for BullMQ) or raw function (fallback)
 * @param {Object} [payload={}] - Serializable payload for worker
 */
export async function enqueue(jobId, taskOrType, payload = {}) {
  // If Redis & BullMQ are available and task is registered by name
  if (useRedis && jobQueue && typeof taskOrType === 'string') {
    try {
      await jobQueue.add(
        taskOrType,
        { taskType: taskOrType, payload, jobId },
        { jobId }
      );
      return jobId;
    } catch (err) {
      logger.error(`BullMQ enqueue failed for ${jobId}, executing via in-memory runner: ${err.message}`);
    }
  }

  // Fallback in-process runner
  memoryJobs.set(jobId, { status: 'queued', error: null });
  setImmediate(async () => {
    memoryJobs.set(jobId, { status: 'running', error: null });
    try {
      if (typeof taskOrType === 'function') {
        await taskOrType();
      } else if (taskRegistry.has(taskOrType)) {
        const handler = taskRegistry.get(taskOrType);
        await handler(payload);
      } else {
        throw new Error(`Task type ${taskOrType} has no registered handler`);
      }
      memoryJobs.set(jobId, { status: 'done', error: null });
    } catch (err) {
      logger.error(`Background job ${jobId} failed: ${err.message}`);
      memoryJobs.set(jobId, { status: 'failed', error: err.message });
    }
  });

  return jobId;
}

/**
 * Retrieves the status of a job from BullMQ or memory fallback.
 */
export async function getJobStatus(jobId) {
  if (useRedis && jobQueue) {
    try {
      const job = await jobQueue.getJob(jobId);
      if (!job) return { status: 'unknown' };

      const state = await job.getState();
      const error = job.failedReason || null;

      const statusMap = {
        completed: 'done',
        active: 'running',
        waiting: 'queued',
        delayed: 'queued',
        failed: 'failed'
      };

      return {
        status: statusMap[state] || state,
        error,
        attemptsMade: job.attemptsMade
      };
    } catch (err) {
      logger.error(`Failed to fetch BullMQ job status: ${err.message}`);
    }
  }

  return memoryJobs.get(jobId) || { status: 'unknown' };
}