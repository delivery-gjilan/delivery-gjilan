/**
 * Schedules (or immediately sends) the "new order" push notification to
 * business users, respecting the store-level grace period.
 *
 * If businessGracePeriodMinutes > 0, the notification is enqueued as a
 * delayed BullMQ job so the customer has time to cancel. If the order is
 * cancelled before the job fires, call cancelPendingBusinessNotification().
 */
import { getDB } from '@/database';
import { storeSettings } from '@/database/schema/storeSettings';
import { eq } from 'drizzle-orm';
import { notifyBusinessNewOrder } from '@/services/orderNotifications';
import { getBusinessNotifyQueue } from '@/queues/businessNotifyQueue';
import type { NotificationService } from '@/services/NotificationService';
import logger from '@/lib/logger';

const log = logger.child({ module: 'scheduleBusinessNotification' });

export async function scheduleBusinessNotification(
    notificationService: NotificationService,
    businessUserIds: string[],
    orderId: string,
): Promise<void> {
    if (businessUserIds.length === 0) return;

    const db = await getDB();
    const rows = await db
        .select({ gracePeriod: storeSettings.businessGracePeriodMinutes })
        .from(storeSettings)
        .where(eq(storeSettings.id, 'default'))
        .limit(1);

    const gracePeriodMinutes = rows[0]?.gracePeriod ?? 0;

    if (gracePeriodMinutes <= 0) {
        // No grace period — notify immediately.
        notifyBusinessNewOrder(notificationService, businessUserIds, orderId);
        return;
    }

    const delayMs = gracePeriodMinutes * 60_000;
    log.info({ orderId, gracePeriodMinutes, delayMs }, 'businessNotify:scheduled');

    const q = getBusinessNotifyQueue();
    // Remove any existing pending job for this order before adding the new one.
    const existing = await q.getJob(`business-notify:${orderId}`);
    if (existing) await existing.remove().catch(() => {});

    await q.add(
        'business-notify',
        { orderId, businessUserIds },
        {
            jobId: `business-notify:${orderId}`,
            delay: delayMs,
        },
    );
}
