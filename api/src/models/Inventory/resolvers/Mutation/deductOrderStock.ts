import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { GraphQLError } from 'graphql';
import { deductOrderStockCore } from '../../lib/deductOrderStockCore';

export const deductOrderStock: NonNullable<MutationResolvers['deductOrderStock']> = async (
    _parent,
    { orderId },
    ctx,
) => {
    if (ctx.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can deduct stock', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const db = await getDB();
    return deductOrderStockCore(orderId, db);
};
