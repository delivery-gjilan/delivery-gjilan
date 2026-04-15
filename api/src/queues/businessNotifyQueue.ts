/**
 * Business Notification Queue
 *
 * Delays the "new order" push notification to business users by the
 * configured grace period (store_settings.business_grace_period_minutes).
 *
 * This gives customers a window to call and cancel before the business
 * starts working on the order.
 *
 * Job name: 'business-notify'
 * Job data: { orderId: string; businessUserIds: string[] }
 * Job ID:   `business-notify:<orderId>` (deduplication)
 */
import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@/lib/bullmq';
import logger from '@/lib/logger';

const log = logger.child({ queue: 'business-notify' });

export const BUSINESS_NOTIFY_QUEUE = 'business-notify';

export type BusinessNotifyJobData = {
    orderId: string;
    businessUserIds: string[];
};

let queue: Queue<BusinessNotifyJobData> | null = null;

export function getBusinessNotifyQueue(): Queue<BusinessNotifyJobData> {
    if (!queue) {
        queue = new Queue<BusinessNotifyJobData>(BUSINESS_NOTIFY_QUEUE, {
            connection: getBullMQConnection(),
            defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: 50,
                attempts: 1,
            },
        });
    }
    return queue;
}

/**
 * Start the BullMQ worker that sends delayed business notifications.
 *
 * @param sendNotification Called when the delay expires. Sends the push notification.
 */
export function startBusinessNotifyWorker(
    sendNotification: (orderId: string, businessUserIds: string[]) => Promise<void>,
): Worker<BusinessNotifyJobData> {
    const worker = new Worker<BusinessNotifyJobData>(
        BUSINESS_NOTIFY_QUEUE,
        async (job: Job<BusinessNotifyJobData>) => {
            const { orderId, businessUserIds } = job.data;
            log.info({ orderId, count: businessUserIds.length, jobId: job.id }, 'businessNotify:worker:processing');
            await sendNotification(orderId, businessUserIds);
        },
        {
            connection: getBullMQConnection(),
            concurrency: 10,
        },
    );

    worker.on('completed', (job) => {
        log.info({ orderId: job.data.orderId, jobId: job.id }, 'businessNotify:worker:completed');
    });

    worker.on('failed', (job, err) => {
        log.error({ err, orderId: job?.data.orderId, jobId: job?.id }, 'businessNotify:worker:failed');
    });

    log.info('businessNotify:worker:started');
    return worker;
}

/**
 * Cancel a pending business notification (e.g. order cancelled during grace period).
 */
export async function cancelPendingBusinessNotification(orderId: string): Promise<void> {
    try {
        const q = getBusinessNotifyQueue();
        const job = await q.getJob(`business-notify-${orderId}`);
        if (job) {
            await job.remove();
            log.info({ orderId }, 'businessNotify:cancelled');
        }
    } catch (err) {
        log.warn({ err, orderId }, 'businessNotify:cancel:error');
    }
}
