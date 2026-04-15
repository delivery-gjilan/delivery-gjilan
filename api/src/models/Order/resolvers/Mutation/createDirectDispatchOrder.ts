import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { DirectDispatchService } from '@/services/DirectDispatchService';
import { DriverRepository } from '@/repositories/DriverRepository';
import { OrderRepository } from '@/repositories/OrderRepository';
import { getDispatchService } from '@/services/driverServices.init';
import logger from '@/lib/logger';

const log = logger.child({ module: 'createDirectDispatchOrder' });

export const createDirectDispatchOrder: NonNullable<MutationResolvers['createDirectDispatchOrder']> = async (
    _parent,
    { input },
    context,
) => {
    const { db, userData, orderService, notificationService } = context;
    const { userId, role, businessId } = userData;

    // Only business owners/employees can create direct dispatch orders
    if (!role || !businessId) {
        throw new GraphQLError('Only business users can create direct dispatch orders', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (role !== 'BUSINESS_OWNER' && role !== 'BUSINESS_EMPLOYEE') {
        throw new GraphQLError('Only business users can create direct dispatch orders', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (!userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const driverRepo = new DriverRepository(db);
    const orderRepo = orderService.orderRepository;
    const service = new DirectDispatchService(db, driverRepo, orderRepo);

    const dbOrder = await service.createOrder(
        {
            businessId,
            dropOffLocation: input.dropOffLocation,
            agreedAmount: input.agreedAmount,
            recipientPhone: input.recipientPhone,
            recipientName: input.recipientName ?? null,
            driverNotes: input.driverNotes ?? null,
        },
        userId,
    );

    // Fire dispatch (reuse existing dispatch pipeline)
    try {
        const dispatchService = getDispatchService();
        await dispatchService.dispatchOrder(dbOrder.id, notificationService);
    } catch (err) {
        log.error({ err, orderId: dbOrder.id }, 'directDispatch:dispatch:error');
        // Order is still created — dispatch will be retried or admin can assign manually
    }

    // Map to GraphQL Order type
    const order = await orderService.getOrderById(dbOrder.id);
    if (!order) {
        throw new GraphQLError('Order created but could not be retrieved', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
    }

    return order;
};
