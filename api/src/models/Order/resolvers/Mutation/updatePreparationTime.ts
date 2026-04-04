import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';
import {
    updateLiveActivity,
    notifyCustomerPrepTimeUpdated,
    notifyDriverPrepTimeUpdated,
    notifyAdminsPrepTimeExtended,
} from '@/services/orderNotifications';
import { emitOrderEvent } from '@/repositories/OrderEventRepository';
import { usersTable } from '@/database/schema';
import { and, inArray, isNull } from 'drizzle-orm';
import { getDispatchService } from '@/services/driverServices.init';
import { cache } from '@/lib/cache';

export const updatePreparationTime: NonNullable<MutationResolvers['updatePreparationTime']> = async (
    _parent,
    { id, preparationMinutes },
    context,
) => {
    const { orderService, userData, db } = context;
    logger.info({ orderId: id, preparationMinutes }, 'order:updatePreparationTime');

    const role = userData?.role;
    if (!role) {
        throw AppError.unauthorized();
    }

    const isBusinessAdmin = role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE';
    const isSuperAdmin = role === 'SUPER_ADMIN';

    if (!isBusinessAdmin && !isSuperAdmin) {
        throw AppError.forbidden('Not authorized to update preparation time');
    }

    if (isBusinessAdmin) {
        if (!userData.businessId) {
            throw AppError.forbidden('Business admin has no business assigned');
        }
        const canAccess = await orderService.orderContainsBusiness(id, userData.businessId);
        if (!canAccess) {
            throw AppError.forbidden('Not authorized to update this order');
        }
    }

    if (preparationMinutes < 1 || preparationMinutes > 180) {
        throw AppError.badInput('Preparation time must be between 1 and 180 minutes');
    }

    const prevDbOrder = await orderService.orderRepository.findById(id);
    const previousMinutes = prevDbOrder?.preparationMinutes ?? 0;

    const order = await orderService.updatePreparationTime(id, preparationMinutes);

    const dbOrder = await orderService.orderRepository.findById(id);
    if (dbOrder) {
        await orderService.publishSingleUserOrder(dbOrder.userId, id);
        await orderService.publishAllOrders();

        if (dbOrder.status === 'PREPARING') {
            updateLiveActivity(
                context.notificationService,
                id,
                'preparing',
                'Your driver',
                preparationMinutes,
                preparationMinutes,
                dbOrder.preparingAt ? new Date(dbOrder.preparingAt).getTime() : Date.now(),
            );

            // Reschedule early driver dispatch using the updated prep time.
            // Only reschedule if dispatch hasn't fired yet (state = 'pending').
            // If 'fired', drivers are already notified — leave it alone.
            try {
                const earlyState = await cache.get<string>(`dispatch:early:${id}`);
                if (earlyState === 'pending') {
                    const dispatchService = getDispatchService();
                    const preparingAtMs = dbOrder.preparingAt ? new Date(dbOrder.preparingAt).getTime() : Date.now();
                    logger.info({ orderId: id, preparationMinutes }, 'updatePreparationTime:rescheduling earlyDispatch');
                    await dispatchService.rescheduleEarlyDispatch(id, preparingAtMs, preparationMinutes, context.notificationService);
                }
            } catch (err) {
                logger.warn({ err, orderId: id }, 'updatePreparationTime:rescheduleDispatch:serviceNotReady');
            }
        }

        emitOrderEvent({
            orderId: id,
            eventType: 'PREP_TIME_UPDATED',
            actorType: isBusinessAdmin ? 'RESTAURANT' : 'ADMIN',
            actorId: userData?.userId,
            businessId: userData?.businessId ?? undefined,
            metadata: {
                newPreparationMinutes: preparationMinutes,
                previousEstimatedReadyAt: dbOrder?.estimatedReadyAt,
            },
        });

        // Notify customer always
        notifyCustomerPrepTimeUpdated(context.notificationService, dbOrder.userId, id, preparationMinutes);

        // Notify driver if assigned
        if (dbOrder.driverId) {
            notifyDriverPrepTimeUpdated(context.notificationService, dbOrder.driverId, id, preparationMinutes);
        }

        // Notify admins only if delay is >= 10 min
        const addedMinutes = preparationMinutes - previousMinutes;
        if (addedMinutes >= 10) {
            try {
                const adminRows = await db
                    .select({ id: usersTable.id })
                    .from(usersTable)
                    .where(and(inArray(usersTable.role, ['SUPER_ADMIN', 'ADMIN']), isNull(usersTable.deletedAt)));
                const adminUserIds = adminRows.map((row: { id: string }) => row.id);
                notifyAdminsPrepTimeExtended(context.notificationService, adminUserIds, id, addedMinutes, preparationMinutes);
            } catch (err) {
                logger.error({ err, orderId: id }, 'Failed to fetch admin IDs for prep-time-extended notification');
            }
        }

        const auditLog = createAuditLogger(db, context);
        await auditLog.log({
            action: 'ORDER_PREPARATION_TIME_UPDATED',
            entityType: 'ORDER',
            entityId: id,
            metadata: {
                orderId: id,
                newValue: { preparationMinutes },
                changedFields: ['preparationMinutes', 'estimatedReadyAt'],
            },
        });
    }

    return order;
};