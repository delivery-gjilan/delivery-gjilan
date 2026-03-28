import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';
import {
    DriverCustomerNotificationKind,
    hasDriverCustomerNotificationBeenSent,
    markDriverCustomerNotificationSent,
    notifyCustomerFromDriver,
} from '@/services/orderNotifications';
import { emitOrderEvent } from '@/repositories/OrderEventRepository';
import { orders as ordersTable } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const driverNotifyCustomer: NonNullable<MutationResolvers['driverNotifyCustomer']> = async (
    _parent,
    { orderId, kind },
    context,
) => {
    const { userData, orderService, notificationService, authService, db } = context;

    if (!userData?.userId || userData.role !== 'DRIVER') {
        throw AppError.forbidden('Only drivers can notify customers');
    }

    const dbOrder = await orderService.orderRepository.findById(orderId);
    if (!dbOrder) {
        throw AppError.notFound('Order');
    }

    if (!dbOrder.driverId || dbOrder.driverId !== userData.userId) {
        throw AppError.forbidden('You are not assigned to this order');
    }

    if (dbOrder.status !== 'OUT_FOR_DELIVERY') {
        throw AppError.businessRule('Order must be OUT_FOR_DELIVERY to notify the customer');
    }

    if (kind === 'ETA_LT_3_MIN') {
        const alreadySent = await hasDriverCustomerNotificationBeenSent(
            orderId,
            kind as DriverCustomerNotificationKind,
        );
        if (alreadySent) {
            return true;
        }

        await markDriverCustomerNotificationSent(orderId, kind as DriverCustomerNotificationKind);
    }

    // Persist driver arrival timestamp and emit analytics event (first ARRIVED_WAITING only)
    if (kind === 'ARRIVED_WAITING' && !dbOrder.driverArrivedAtPickup) {
        const arrivedAt = new Date().toISOString();
        await db.update(ordersTable)
            .set({ driverArrivedAtPickup: arrivedAt })
            .where(eq(ordersTable.id, orderId));

        emitOrderEvent({
            orderId,
            eventType: 'DRIVER_ARRIVED_PICKUP',
            eventTs: arrivedAt,
            actorType: 'DRIVER',
            actorId: userData.userId,
            driverId: userData.userId,
            metadata: { previousReadyAt: dbOrder.readyAt },
        });
    }

    const customer = await authService.authRepository.findById(dbOrder.userId);
    const customerPreferredLanguage: 'en' | 'al' = customer?.preferredLanguage === 'al' ? 'al' : 'en';

    notifyCustomerFromDriver(
        notificationService,
        dbOrder.userId,
        orderId,
        kind as DriverCustomerNotificationKind,
        undefined,
        customerPreferredLanguage,
    );

    return true;
};