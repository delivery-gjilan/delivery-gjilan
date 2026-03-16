import { NotificationService, NotificationPayload } from '@/services/NotificationService';
import logger from '@/lib/logger';
import { cache } from '@/lib/cache';

/**
 * Notification message templates for order status changes.
 * Sent to the customer who placed the order.
 */
const customerStatusMessages: Record<string, (orderId: string) => NotificationPayload> = {
    PREPARING: (orderId) => ({
        title: 'Order Accepted! 🎉',
        body: 'Your order has been accepted and is being prepared.',
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
        timeSensitive: false,
        relevanceScore: 0.6,
    }),
    READY: (orderId) => ({
        title: 'Order Ready! 📦',
        body: 'Your order is ready and waiting for a driver.',
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
        timeSensitive: false,
        relevanceScore: 0.7,
    }),
    OUT_FOR_DELIVERY: (orderId) => ({
        title: 'On the Way! 🚗',
        body: 'Your order is on its way to you!',
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
        timeSensitive: true, // ← Time-sensitive: bypass Focus modes
        relevanceScore: 0.9,
        category: 'order-on-the-way', // ← Interactive actions
    }),
    DELIVERED: (orderId) => ({
        title: 'Delivered! ✅',
        body: 'Your order has been delivered. Enjoy!',
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
        timeSensitive: true, // ← Time-sensitive: important notification
        relevanceScore: 1.0,
        category: 'order-delivered', // ← Interactive actions: Rate, Tip, Contact Support
    }),
    CANCELLED: (orderId) => ({
        title: 'Order Cancelled',
        body: 'Your order has been cancelled.',
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
        timeSensitive: true, // ← Time-sensitive: user needs to know immediately
        relevanceScore: 0.95,
        category: 'order-cancelled', // ← Interactive action: Contact Support
    }),
};

/**
 * Send a push notification to the customer when their order status changes.
 * Runs async (fire-and-forget) so it doesn't block the mutation response.
 */
export function notifyCustomerOrderStatus(
    notificationService: NotificationService,
    customerId: string,
    orderId: string,
    newStatus: string,
): void {
    logger.info({ customerId, orderId, newStatus }, 'orderNotification:notifyCustomerOrderStatus — triggered');

    const builder = customerStatusMessages[newStatus];
    if (!builder) {
        logger.warn({ newStatus }, 'orderNotification:notifyCustomerOrderStatus — no message template for status, skipping');
        return;
    }

    const payload = builder(orderId);
    logger.info({ customerId, orderId, newStatus, title: payload.title }, 'orderNotification:notifyCustomerOrderStatus — sending push');

    // Fire-and-forget — do not await
    notificationService
        .sendToUser(customerId, payload, 'ORDER_STATUS')
        .then((result) => logger.info({ customerId, orderId, newStatus, result }, 'orderNotification:notifyCustomerOrderStatus — push result'))
        .catch((err) => logger.error({ err, customerId, orderId, newStatus }, 'orderNotification:notifyCustomerOrderStatus — FAILED'));
}

/**
 * Update Live Activity (Dynamic Island) with new order status and ETA.
 * This updates the Dynamic Island on iPhone 14 Pro+ and Lock Screen on iPhone 12+.
 * 
 * @param notificationService - Notification service instance
 * @param orderId - Order ID
 * @param status - New order status
 * @param driverName - Driver's name (defaults to "Your driver" if not provided)
 * @param estimatedMinutes - Estimated time in minutes until delivery/ready
 */
export function updateLiveActivity(
    notificationService: NotificationService,
    orderId: string,
    status: 'preparing' | 'ready' | 'out_for_delivery' | 'delivered',
    driverName: string = 'Your driver',
    estimatedMinutes: number = 0,
    phaseInitialMinutes?: number,
    phaseStartedAt?: number,
): void {
    // Only send Live Activity updates for relevant statuses
    if (!['preparing', 'ready', 'out_for_delivery', 'delivered'].includes(status)) {
        return;
    }

    // Fire-and-forget — do not await
    notificationService
        .sendLiveActivityUpdate(orderId, {
            driverName,
            estimatedMinutes,
            status,
            phaseInitialMinutes,
            phaseStartedAt,
        })
        .catch((err) => logger.error({ err, orderId, status }, 'Failed to send Live Activity update'));
}

/**
 * End Live Activity when order is completed or cancelled.
 */
export function endLiveActivity(
    notificationService: NotificationService,
    orderId: string,
): void {
    notificationService
        .endLiveActivities(orderId)
        .catch((err) => logger.error({ err, orderId }, 'Failed to end Live Activity'));
}


/**
 * Send a push notification to a driver when an order is assigned to them.
 */
export function notifyDriverOrderAssigned(
    notificationService: NotificationService,
    driverId: string,
    orderId: string,
    pickupAddress?: string,
): void {
    const payload: NotificationPayload = {
        title: 'New Order Assigned! 🚀',
        body: pickupAddress
            ? `New delivery from ${pickupAddress}. Tap to view details.`
            : 'You have a new delivery. Tap to view details.',
        data: { orderId, screen: 'order-detail', type: 'ORDER_ASSIGNED' },
    };

    notificationService
        .sendToUser(driverId, payload, 'ORDER_ASSIGNED')
        .catch((err) => logger.error({ err, driverId, orderId }, 'Failed to send driver assignment notification'));
}

/**
 * Send a push notification to all super admins when notable events occur.
 */
export function notifyAdmins(
    notificationService: NotificationService,
    adminUserIds: string[],
    payload: NotificationPayload,
): void {
    if (adminUserIds.length === 0) return;

    notificationService
        .sendToUsers(adminUserIds, payload, 'ADMIN_ALERT')
        .catch((err) => logger.error({ err }, 'Failed to send admin alert notification'));
}

export type DriverCustomerNotificationKind = 'ETA_LT_3_MIN' | 'ARRIVED_WAITING';

const DRIVER_CUSTOMER_NOTIFICATION_TTL_SECONDS = 4 * 60 * 60;

function driverCustomerNotificationKey(orderId: string, kind: DriverCustomerNotificationKind): string {
    return `cache:driver-customer-notification:${orderId}:${kind}`;
}

export async function hasDriverCustomerNotificationBeenSent(
    orderId: string,
    kind: DriverCustomerNotificationKind,
): Promise<boolean> {
    const sent = await cache.get<boolean>(driverCustomerNotificationKey(orderId, kind));
    return Boolean(sent);
}

export async function markDriverCustomerNotificationSent(
    orderId: string,
    kind: DriverCustomerNotificationKind,
): Promise<void> {
    await cache.set(
        driverCustomerNotificationKey(orderId, kind),
        true,
        DRIVER_CUSTOMER_NOTIFICATION_TTL_SECONDS,
    );
}

export function notifyCustomerFromDriver(
    notificationService: NotificationService,
    customerId: string,
    orderId: string,
    kind: DriverCustomerNotificationKind,
    etaMinutes?: number,
    preferredLanguage: 'en' | 'al' = 'en',
): void {
    const etaLabelEn =
        etaMinutes && etaMinutes > 0
            ? `Your driver is about ${etaMinutes} minute${etaMinutes === 1 ? '' : 's'} away.`
            : 'Your driver is less than 3 minutes away.';
    const etaLabelAl =
        etaMinutes && etaMinutes > 0
            ? `Shoferi eshte rreth ${etaMinutes} minute${etaMinutes === 1 ? '' : 'a'} larg.`
            : 'Shoferi eshte me pak se 3 minuta larg.';

    const contentByKind: Record<DriverCustomerNotificationKind, {
        type: string;
        titleEn: string;
        titleAl: string;
        bodyEn: string;
        bodyAl: string;
    }> = {
        ETA_LT_3_MIN: {
            type: 'DRIVER_ETA_LT_3_MIN',
            titleEn: 'Driver is almost there',
            titleAl: 'Shoferi pothuajse ka arritur',
            bodyEn: etaLabelEn,
            bodyAl: etaLabelAl,
        },
        ARRIVED_WAITING: {
            type: 'DRIVER_ARRIVED_WAITING',
            titleEn: 'Driver is waiting outside',
            titleAl: 'Shoferi po pret jashte',
            bodyEn: 'Your driver has arrived and is waiting for you.',
            bodyAl: 'Shoferi ka arritur dhe po ju pret.',
        },
    };

    const copy = contentByKind[kind];

    const payload: NotificationPayload = {
        title: preferredLanguage === 'al' ? copy.titleAl : copy.titleEn,
        body: preferredLanguage === 'al' ? copy.bodyAl : copy.bodyEn,
        data: {
            orderId,
            screen: 'orders/active',
            type: copy.type,
            language: preferredLanguage,
        },
        timeSensitive: true,
        relevanceScore: kind === 'ETA_LT_3_MIN' ? 0.98 : 1,
        category: 'order-on-the-way',
    };

    notificationService
        .sendToUser(customerId, payload, 'ORDER_STATUS')
        .catch((err) =>
            logger.error({ err, customerId, orderId, kind }, 'Failed to send driver-to-customer notification'),
        );
}
