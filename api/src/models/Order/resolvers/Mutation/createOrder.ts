import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import { AppError } from '@/lib/errors';
import logger from '@/lib/logger';
import { users } from '@/database/schema';
import { and, inArray, isNull } from 'drizzle-orm';
import { notifyAdminsNewOrder, notifyBusinessNewOrder, updateLiveActivity } from '@/services/orderNotifications';

const log = logger.child({ resolver: 'createOrder' });

export const createOrder: NonNullable<MutationResolvers['createOrder']> = async (
    _parent,
    { input },
    context,
) => {
    const { userData, orderService, db } = context;
    if (!userData.userId) {
        throw AppError.unauthorized();
    }
    const order = await orderService.createOrder(userData.userId, input);

    // Best-effort side effects: the order is already persisted, so don't fail the
    // mutation response if realtime publish throws (e.g. transient WS/pubsub issues).
    try {
        await orderService.publishSingleUserOrder(userData.userId!, order.id);
    } catch (error) {
        log.error({ err: error, userId: userData.userId, orderId: order.id }, 'createOrder:publishSingleUserOrder:failed');
    }

    try {
        await orderService.publishAllOrders();
    } catch (error) {
        log.error({ err: error, userId: userData.userId, orderId: order.id }, 'createOrder:publishAllOrders:failed');
    }

    // Push notifications for platform/admin visibility and business order intake.
    try {
        const adminRows = await db
            .select({ id: users.id })
            .from(users)
            .where(
                and(
                    inArray(users.role, ['SUPER_ADMIN', 'ADMIN']),
                    isNull(users.deletedAt),
                ),
            );
        notifyAdminsNewOrder(context.notificationService, adminRows.map((row) => row.id), String(order.id));
    } catch (error) {
        log.error({ err: error, orderId: order.id }, 'createOrder:notifyAdminsNewOrder:failed');
    }

    try {
        const orderBusinessIds = Array.from(
            new Set(
                (order.businesses ?? [])
                    .map((entry) => entry?.business?.id)
                    .filter((id): id is string => Boolean(id)),
            ),
        );

        if (orderBusinessIds.length > 0) {
            const businessUserRows = await db
                .select({ id: users.id })
                .from(users)
                .where(
                    and(
                        inArray(users.businessId, orderBusinessIds),
                        inArray(users.role, ['BUSINESS_OWNER', 'BUSINESS_EMPLOYEE']),
                        isNull(users.deletedAt),
                    ),
                );

            notifyBusinessNewOrder(
                context.notificationService,
                businessUserRows.map((row) => row.id),
                String(order.id),
            );
        }
    } catch (error) {
        log.error({ err: error, orderId: order.id }, 'createOrder:notifyBusinessNewOrder:failed');
    }

    try {
        updateLiveActivity(
            context.notificationService,
            String(order.id),
            'pending',
            'Your driver',
            0,
        );
    } catch (error) {
        log.error({ err: error, orderId: order.id }, 'createOrder:updateLiveActivity:failed');
    }

    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: String(order.id),
        metadata: { orderId: String(order.id), userId: userData.userId, totalPrice: order.totalPrice },
    });

    return order;
};
