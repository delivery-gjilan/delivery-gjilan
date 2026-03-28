import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { orders as ordersTable } from '../../../../../database/schema/orders';
import { eq } from 'drizzle-orm';

export const setOrderAdminNote: NonNullable<MutationResolvers['setOrderAdminNote']> = async (
    _parent,
    { id, note },
    context,
) => {
    const { orderService, userData, db } = context;

    if (!userData.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only admins can set order notes', { extensions: { code: 'FORBIDDEN' } });
    }

    const dbOrder = await orderService.orderRepository.findById(id);
    if (!dbOrder) {
        throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    }

    const trimmedNote = note ? note.trim() : null;

    await db
        .update(ordersTable)
        .set({ adminNote: trimmedNote })
        .where(eq(ordersTable.id, id));

    const updated = await orderService.orderRepository.findById(id);
    return orderService.mapToOrderPublic(updated!);
};