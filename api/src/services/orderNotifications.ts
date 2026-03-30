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
        localeContent: {
            en: {
                title: 'Order Accepted! 🎉',
                body: 'Your order has been accepted and is being prepared.',
            },
            al: {
                title: 'Porosia u pranua! 🎉',
                body: 'Porosia juaj u pranua dhe po pergatitet.',
            },
        },
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
        timeSensitive: false,
        relevanceScore: 0.6,
    }),
    OUT_FOR_DELIVERY: (orderId) => ({
        title: 'On the Way! 🚗',
        body: 'Your order is on its way to you!',
        localeContent: {
            en: {
                title: 'On the Way! 🚗',
                body: 'Your order is on its way to you!',
            },
            al: {
                title: 'Ne rruge! 🚗',
                body: 'Porosia juaj eshte ne rruge drejt jush!',
            },
        },
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
        timeSensitive: true, // ← Time-sensitive: bypass Focus modes
        relevanceScore: 0.9,
        category: 'order-on-the-way', // ← Interactive actions
    }),
    DELIVERED: (orderId) => ({
        title: 'Delivered! ✅',
        body: 'Your order has been delivered. Enjoy!',
        localeContent: {
            en: {
                title: 'Delivered! ✅',
                body: 'Your order has been delivered. Enjoy!',
            },
            al: {
                title: 'U dorezua! ✅',
                body: 'Porosia juaj u dorezua. Ju befte mire!',
            },
        },
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
        timeSensitive: true, // ← Time-sensitive: important notification
        relevanceScore: 1.0,
        category: 'order-delivered', // ← Interactive actions: Rate, Tip, Contact Support
    }),
    CANCELLED: (orderId) => ({
        title: 'Order Cancelled',
        body: 'Your order has been cancelled.',
        localeContent: {
            en: {
                title: 'Order Cancelled',
                body: 'Your order has been cancelled.',
            },
            al: {
                title: 'Porosia u anulua',
                body: 'Porosia juaj u anulua.',
            },
        },
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
 * @param estimatedMinutes - Estimated time in minutes for active phase tracking
 */
export function updateLiveActivity(
    notificationService: NotificationService,
    orderId: string,
    status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled',
    driverName: string = 'Your driver',
    estimatedMinutes: number = 0,
    phaseInitialMinutes?: number,
    phaseStartedAt?: number,
): void {
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
 * Notify a driver that the admin sent them a message.
 */
export function notifyDriverNewAdminMessage(
    notificationService: NotificationService,
    driverId: string,
    body: string,
    alertType: 'INFO' | 'WARNING' | 'URGENT',
): void {
    const titleMap = { INFO: '💬 New Message', WARNING: '⚠️ Warning from Admin', URGENT: '🚨 Urgent Message' };
    const payload: NotificationPayload = {
        title: titleMap[alertType] ?? '💬 New Message',
        body,
        data: { screen: 'messages', type: 'ADMIN_MESSAGE' },
        timeSensitive: alertType !== 'INFO',
        relevanceScore: alertType === 'URGENT' ? 1.0 : alertType === 'WARNING' ? 0.8 : 0.5,
    };

    notificationService
        .sendToUserByAppType(driverId, 'DRIVER', payload, 'ADMIN_ALERT')
        .catch((err) => logger.error({ err, driverId }, 'Failed to send admin message notification to driver'));
}

/**
 * Notify a business user that the admin sent them a message.
 */
export function notifyBusinessUserNewAdminMessage(
    notificationService: NotificationService,
    businessUserId: string,
    body: string,
    alertType: 'INFO' | 'WARNING' | 'URGENT',
): void {
    const titleMap = { INFO: '💬 New Message', WARNING: '⚠️ Warning from Admin', URGENT: '🚨 Urgent Message' };
    const payload: NotificationPayload = {
        title: titleMap[alertType] ?? '💬 New Message',
        body,
        data: { screen: 'messages', type: 'ADMIN_MESSAGE' },
        timeSensitive: alertType !== 'INFO',
        relevanceScore: alertType === 'URGENT' ? 1.0 : alertType === 'WARNING' ? 0.8 : 0.5,
    };

    notificationService
        .sendToUserByAppType(businessUserId, 'BUSINESS', payload, 'ADMIN_ALERT')
        .catch((err) => logger.error({ err, businessUserId }, 'Failed to send admin message notification to business user'));
}

/**
 * End Live Activity when order is completed or cancelled.
 */
export function endLiveActivity(
    notificationService: NotificationService,
    orderId: string,
    finalStatus: 'delivered' | 'cancelled' = 'delivered',
): void {
    notificationService
        .endLiveActivities(orderId, finalStatus)
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
        localeContent: {
            en: {
                title: 'New Order Assigned! 🚀',
                body: pickupAddress
                    ? `New delivery from ${pickupAddress}. Tap to view details.`
                    : 'You have a new delivery. Tap to view details.',
            },
            al: {
                title: 'Porosi e re u caktua! 🚀',
                body: pickupAddress
                    ? `Dergese e re nga ${pickupAddress}. Prek per detaje.`
                    : 'Keni nje dergese te re. Prek per te pare detajet.',
            },
        },
        data: { orderId, screen: 'order-detail', type: 'ORDER_ASSIGNED' },
    };

    notificationService
        .sendToUserByAppType(driverId, 'DRIVER', payload, 'ORDER_ASSIGNED')
        .catch((err) => logger.error({ err, driverId, orderId }, 'Failed to send driver assignment notification'));
}

/**
 * Notify a driver that their order was re-assigned to someone else by an admin.
 */
export function notifyDriverOrderReassigned(
    notificationService: NotificationService,
    previousDriverId: string,
    orderId: string,
): void {
    const payload: NotificationPayload = {
        title: 'Order Reassigned',
        body: 'An admin has reassigned one of your orders to another driver.',
        localeContent: {
            en: {
                title: 'Order Reassigned',
                body: 'An admin has reassigned one of your orders to another driver.',
            },
            al: {
                title: 'Porosia u ricaktua',
                body: 'Nje admin e ricaktoi nje nga porosite tuaja te nje shofer tjeter.',
            },
        },
        data: { orderId, screen: 'orders', type: 'ORDER_REASSIGNED' },
        timeSensitive: true,
        relevanceScore: 1.0,
    };

    notificationService
        .sendToUserByAppType(previousDriverId, 'DRIVER', payload, 'ORDER_REASSIGNED')
        .catch((err) => logger.error({ err, previousDriverId, orderId }, 'Failed to send driver reassignment notification'));
}

export function notifyAdminsNewOrder(
    notificationService: NotificationService,
    adminUserIds: string[],
    orderId: string,
): void {
    if (adminUserIds.length === 0) return;

    const payload: NotificationPayload = {
        title: 'New Order Received',
        body: 'A new order was placed. Tap to review it in admin.',
        localeContent: {
            en: {
                title: 'New Order Received',
                body: 'A new order was placed. Tap to review it in admin.',
            },
            al: {
                title: 'U pranua porosi e re',
                body: 'U vendos nje porosi e re. Prek per ta shqyrtuar ne admin.',
            },
        },
        data: { orderId, screen: 'orders', type: 'NEW_ORDER_ADMIN' },
        timeSensitive: true,
        relevanceScore: 0.9,
    };

    notificationService
        .sendToUsersByAppType(adminUserIds, 'ADMIN', payload, 'ADMIN_ALERT')
        .catch((err) => logger.error({ err, orderId }, 'Failed to send admin new-order notification'));
}

/**
 * Notify admins that an order requires manual approval before moving to PENDING.
 */
export function notifyAdminsOrderNeedsApproval(
    notificationService: NotificationService,
    adminUserIds: string[],
    orderId: string,
): void {
    if (adminUserIds.length === 0) return;

    const payload: NotificationPayload = {
        title: '⚠ Order Needs Approval',
        body: 'An order requires your review before it can proceed. Tap to approve.',
        localeContent: {
            en: {
                title: '⚠ Order Needs Approval',
                body: 'An order requires your review before it can proceed. Tap to approve.',
            },
            al: {
                title: '⚠ Porosi Kërkon Miratim',
                body: 'Një porosi kërkon shqyrtimin tuaj para se të vazhdojë.',
            },
        },
        data: { orderId, screen: 'orders', type: 'ORDER_NEEDS_APPROVAL' },
        timeSensitive: true,
        relevanceScore: 1.0,
    };

    notificationService
        .sendToUsersByAppType(adminUserIds, 'ADMIN', payload, 'ADMIN_ALERT')
        .catch((err) => logger.error({ err, orderId }, 'Failed to send admin approval notification'));
}

/**
 * Notify a set of drivers that a new order is ready for pickup (wave 1).
 */
export function notifyDriversOrderReady(
    notificationService: NotificationService,
    driverIds: string[],
    orderId: string,
    businessName?: string,
): void {
    if (driverIds.length === 0) return;

    const payload: NotificationPayload = {
        title: 'New Order Available! 📦',
        body: businessName
            ? `Order from ${businessName} is ready for pickup.`
            : 'A new order is ready for pickup.',
        localeContent: {
            en: {
                title: 'New Order Available! 📦',
                body: businessName
                    ? `Order from ${businessName} is ready for pickup.`
                    : 'A new order is ready for pickup.',
            },
            al: {
                title: 'Porosi e re e disponueshme! 📦',
                body: businessName
                    ? `Porosia nga ${businessName} eshte gati per marrje.`
                    : 'Nje porosi e re eshte gati per marrje.',
            },
        },
        data: { orderId, screen: 'orders', type: 'ORDER_READY_POOL' },
        timeSensitive: true,
        relevanceScore: 0.9,
    };

    notificationService
        .sendToUsersByAppType(driverIds, 'DRIVER', payload, 'ORDER_READY_POOL')
        .catch((err) => logger.error({ err, orderId }, 'Failed to notify drivers of ready order'));
}

/**
 * Notify the second wave of drivers when the first wave didn't accept in time.
 */
export function notifyDriversOrderExpanded(
    notificationService: NotificationService,
    driverIds: string[],
    orderId: string,
): void {
    if (driverIds.length === 0) return;

    const payload: NotificationPayload = {
        title: 'Order Still Available 📦',
        body: 'An order is waiting for pickup. Tap to claim it.',
        localeContent: {
            en: {
                title: 'Order Still Available 📦',
                body: 'An order is waiting for pickup. Tap to claim it.',
            },
            al: {
                title: 'Porosia ende e disponueshme 📦',
                body: 'Nje porosi po pret per marrje. Prek per ta pranuar.',
            },
        },
        data: { orderId, screen: 'orders', type: 'ORDER_READY_POOL' },
        timeSensitive: true,
        relevanceScore: 0.8,
    };

    notificationService
        .sendToUsersByAppType(driverIds, 'DRIVER', payload, 'ORDER_READY_POOL')
        .catch((err) => logger.error({ err, orderId }, 'Failed to notify expanded drivers'));
}

export function notifyBusinessNewOrder(
    notificationService: NotificationService,
    businessUserIds: string[],
    orderId: string,
): void {
    if (businessUserIds.length === 0) return;

    const payload: NotificationPayload = {
        title: 'New Order for Your Business',
        body: 'You have a new incoming order. Tap to view details.',
        localeContent: {
            en: {
                title: 'New Order for Your Business',
                body: 'You have a new incoming order. Tap to view details.',
            },
            al: {
                title: 'Porosi e re per biznesin tuaj',
                body: 'Keni nje porosi te re hyrse. Prek per te pare detajet.',
            },
        },
        data: { orderId, screen: 'orders', type: 'NEW_ORDER_BUSINESS' },
        timeSensitive: true,
        relevanceScore: 0.9,
    };

    notificationService
        .sendToUsersByAppType(businessUserIds, 'BUSINESS', payload, 'ORDER_STATUS')
        .catch((err) => logger.error({ err, orderId }, 'Failed to send business new-order notification'));
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
        title: copy.titleEn,
        body: copy.bodyEn,
        locale: preferredLanguage,
        localeContent: {
            en: {
                title: copy.titleEn,
                body: copy.bodyEn,
            },
            al: {
                title: copy.titleAl,
                body: copy.bodyAl,
            },
        },
        data: {
            orderId,
            screen: 'orders/active',
            type: copy.type,
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
