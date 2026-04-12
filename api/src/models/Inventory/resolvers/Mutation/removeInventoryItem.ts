import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { personalInventory } from '@/database/schema/personalInventory';
import { eq, and } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const removeInventoryItem: NonNullable<MutationResolvers['removeInventoryItem']> = async (
    _parent,
    { businessId, productId },
    ctx,
) => {
    if (ctx.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can manage inventory', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const db = await getDB();

    const deleted = await db
        .delete(personalInventory)
        .where(
            and(
                eq(personalInventory.businessId, businessId),
                eq(personalInventory.productId, productId),
            ),
        )
        .returning();

    return deleted.length > 0;
};
