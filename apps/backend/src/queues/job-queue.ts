import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import { createRedisConnection } from '../lib/redis';
import { recalculateUserTotals } from '../services/statistics.service';
import { fetchProfileUser, buildProfileResponse } from '../services/profile.service';
import { setProfileSummaryCache } from '../cache/profile-cache';
import { refreshMatchSnapshot } from '../cache/match-cache';

const queueName = 'trayb-jobs';

const defaultJobOptions: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 200,
};

export const queue = new Queue(queueName, {
  connection: createRedisConnection(),
  defaultJobOptions,
});

const events = new QueueEvents(queueName, {
  connection: createRedisConnection(),
});

let worker: Worker | null = null;
let workerLogger: FastifyBaseLogger | null = null;
let metricsInterval: NodeJS.Timeout | null = null;

events.on('failed', ({ jobId, failedReason }) => {
  workerLogger?.error({ jobId, failedReason }, 'Job failed');
});

events.on('completed', ({ jobId }) => {
  workerLogger?.debug({ jobId }, 'Job completed');
});

export const enqueueProfileRefresh = async (userId: string, includeFullHistory = false) =>
  queue.add(
    'profile:refresh',
    { userId, includeFullHistory },
    {
      jobId: `profile:refresh:${userId}:${includeFullHistory ? 'full' : 'recent'}`,
    },
  );

export const enqueueMatchSnapshotRefresh = async (matchId: string) =>
  queue.add(
    'match:snapshot:refresh',
    { matchId },
    {
      jobId: `match:snapshot:${matchId}`,
      delay: 1000,
    },
  );

export const enqueueEloRecalculation = async (matchId: string) =>
  queue.add(
    'elo:recalculate',
    { matchId },
    {
      jobId: `elo:recalc:${matchId}`,
      delay: 1500,
    },
  );

type QueueMetricUpdater = (counts: {
  waiting?: number;
  failed?: number;
  active?: number;
  delayed?: number;
  completed?: number;
}) => void;

export async function startJobWorkers(
  logger: FastifyBaseLogger,
  updateMetrics?: QueueMetricUpdater,
): Promise<void> {
  if (worker) {
    return;
  }

  workerLogger = logger;

  worker = new Worker(
    queueName,
    async (job) => {
      switch (job.name) {
        case 'profile:refresh': {
          const userId: string = job.data.userId;
          const includeFullHistory: boolean = Boolean(job.data.includeFullHistory);
          await recalculateUserTotals([userId]);
          const user = await fetchProfileUser(userId);
          if (!user) {
            return;
          }
          const payload = await buildProfileResponse(user, { includeFullHistory });
          await setProfileSummaryCache(userId, includeFullHistory, payload);
          break;
        }
        case 'match:snapshot:refresh': {
          const matchId: string = job.data.matchId;
          if (matchId) {
            await refreshMatchSnapshot(matchId);
          }
          break;
        }
        case 'elo:recalculate': {
          // Placeholder for heavy Elo recomputation. For now we simply log the request.
          workerLogger?.info({ matchId: job.data.matchId }, 'Queued elo:recalculate job received');
          break;
        }
        default:
          workerLogger?.warn({ jobName: job.name }, 'Received unknown job name');
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'BullMQ worker job failed');
  });

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id, name: job.name }, 'BullMQ worker job completed');
  });

  if (updateMetrics) {
    const intervalMs = parseInt(process.env.BULLMQ_METRICS_POLL_MS || '15000', 10);
    metricsInterval = setInterval(async () => {
      try {
        const counts = await queue.getJobCounts(
          'waiting',
          'failed',
          'active',
          'delayed',
          'completed',
        );
        updateMetrics(counts);
      } catch (error) {
        logger.error({ err: error }, 'Failed to collect BullMQ metrics');
      }
    }, intervalMs);
  }
}

export async function shutdownJobWorkers(): Promise<void> {
  await Promise.all([
    worker?.close().catch(() => undefined),
    queue.close().catch(() => undefined),
    events.close().catch(() => undefined),
  ]);

  worker = null;
  workerLogger = null;
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
}


