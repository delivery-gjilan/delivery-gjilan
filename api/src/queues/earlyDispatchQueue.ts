/**
 * Early Dispatch Queue
 *
 * Replaces the in-memory setTimeout approach for scheduling the pre-READY
 * driver dispatch.  Using BullMQ means:
 *  - Jobs survive process restarts (persisted in Redis)
 *  - Safe across multiple API instances (only one worker processes each job)
 *  - No manual recovery logic needed on startup
 *
 * Job name: 'early-dispatch'
 * Job data: { orderId: string }
 * Job ID:   `early-dispatch:<orderId>`  (deduplication — only one pending job per order)
 */
import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@/lib/bullmq';
import logger from '@/lib/logger';

const log = logger.child({ queue: 'early-dispatch' });

export const EARLY_DISPATCH_QUEUE = 'early-dispatch';

export type EarlyDispatchJobData = {
    orderId: string;
};

let queue: Queue<EarlyDispatchJobData> | null = null;

export function getEarlyDispatchQueue(): Queue<EarlyDispatchJobData> {
    if (!queue) {
        queue = new Queue<EarlyDispatchJobData>(EARLY_DISPATCH_QUEUE, {
            connection: getBullMQConnection(),
            defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: 50, // keep last 50 failed jobs for inspection
                attempts: 1,      // dispatch is a one-shot — don't retry (idempotency via Redis state)
            },
        });
    }
    return queue;
}

/**
 * Start the BullMQ worker that processes early-dispatch jobs.
 *
 * The processor callback receives the orderId and calls the provided
 * `runDispatch` function (injected to break circular dependencies).
 *
 * @param runDispatch  Called when a job fires. Should call dispatchOrder().
 */
export function startEarlyDispatchWorker(
    runDispatch: (orderId: string) => Promise<void>,
): Worker<EarlyDispatchJobData> {
    const worker = new Worker<EarlyDispatchJobData>(
        EARLY_DISPATCH_QUEUE,
        async (job: Job<EarlyDispatchJobData>) => {
            const { orderId } = job.data;
            log.info({ orderId, jobId: job.id }, 'earlyDispatch:worker:processing');
            await runDispatch(orderId);
        },
        {
            connection: getBullMQConnection(),
            concurrency: 10,
        },
    );

    worker.on('completed', (job) => {
        log.info({ orderId: job.data.orderId, jobId: job.id }, 'earlyDispatch:worker:completed');
    });

    worker.on('failed', (job, err) => {
        log.error({ err, orderId: job?.data.orderId, jobId: job?.id }, 'earlyDispatch:worker:failed');
    });

    log.info('earlyDispatch:worker:started');
    return worker;
}
