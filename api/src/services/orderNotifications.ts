import { NotificationService, NotificationPayload } from '@/services/NotificationService';
import logger from '@/lib/logger';

/**
 * Notification message templates for order status changes.
 * Sent to the customer who placed the order.
 */
const customerStatusMessages: Record<string, (orderId: string) => NotificationPayload> = {
    PREPARING: (orderId) => ({
        title: 'Order Accepted! 🎉',
        body: 'Your order has been accepted and is being prepared.',
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
    }),
    READY: (orderId) => ({
        title: 'Order Ready! 📦',
        body: 'Your order is ready and waiting for a driver.',
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
    }),
    OUT_FOR_DELIVERY: (orderId) => ({
        title: 'On the Way! 🚗',
        body: 'Your order is on its way to you!',
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
    }),
    DELIVERED: (orderId) => ({
        title: 'Delivered! ✅',
        body: 'Your order has been delivered. Enjoy!',
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
    }),
    CANCELLED: (orderId) => ({
        title: 'Order Cancelled',
        body: 'Your order has been cancelled.',
        data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
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
    const builder = customerStatusMessages[newStatus];
    if (!builder) return;

    const payload = builder(orderId);

    // Fire-and-forget — do not await
    notificationService
        .sendToUser(customerId, payload, 'ORDER_STATUS')
        .catch((err) => logger.error({ err, customerId, orderId, newStatus }, 'Failed to send order status notification'));
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
