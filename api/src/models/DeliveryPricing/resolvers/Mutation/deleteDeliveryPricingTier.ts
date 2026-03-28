import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryPricingTiers } from '@/database/schema/deliveryPricingTiers';
import { eq } from 'drizzle-orm';

export const deleteDeliveryPricingTier: NonNullable<MutationResolvers['deleteDeliveryPricingTier']> = async (
    _parent,
    { id },
    _ctx
) => {
    const db = await getDB();

    const result = await db
        .delete(deliveryPricingTiers)
        .where(eq(deliveryPricingTiers.id, id))
        .returning();

    return result.length > 0;
};