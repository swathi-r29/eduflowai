import { logger } from '../utils/logger.js';

/**
 * Minimal in-process background job runner so long-running video/document
 * processing never blocks the HTTP request (spec section 46). Upload
 * handlers enqueue a job and return immediately with a job id; the caller
 * polls GET /api/videos/:id or /api/documents/:id for status.
 *
 * This is intentionally simple (no Redis) to keep the app runnable with
 * zero extra infra. For production/multi-instance deployment, swap this
 * for BullMQ + Redis behind the same enqueue() function signature.
 */
const jobs = new Map();

export function enqueue(jobId, taskFn) {
  jobs.set(jobId, { status: 'queued', error: null });
  setImmediate(async () => {
    jobs.set(jobId, { status: 'running', error: null });
    try {
      await taskFn();
      jobs.set(jobId, { status: 'done', error: null });
    } catch (err) {
      logger.error(`Background job ${jobId} failed:`, err.message);
      jobs.set(jobId, { status: 'failed', error: err.message });
    }
  });
  return jobId;
}

export function getJobStatus(jobId) {
  return jobs.get(jobId) || { status: 'unknown' };
}
