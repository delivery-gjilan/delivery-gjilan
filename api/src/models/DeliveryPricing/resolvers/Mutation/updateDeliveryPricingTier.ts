import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryPricingTiers } from '@/database/schema/deliveryPricingTiers';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const updateDeliveryPricingTier: NonNullable<MutationResolvers['updateDeliveryPricingTier']> = async (
    _parent,
    { id, input },
    _ctx
) => {
    const db = await getDB();

    const updateData: Record<string, any> = {};
    if (input.minDistanceKm !== undefined && input.minDistanceKm !== null) updateData.minDistanceKm = input.minDistanceKm;
    if (input.maxDistanceKm !== undefined) updateData.maxDistanceKm = input.maxDistanceKm;
    if (input.price !== undefined && input.price !== null) updateData.price = input.price;
    if (input.sortOrder !== undefined && input.sortOrder !== null) updateData.sortOrder = input.sortOrder;
    if (input.isActive !== undefined && input.isActive !== null) updateData.isActive = input.isActive;

    const [updated] = await db
        .update(deliveryPricingTiers)
        .set(updateData)
        .where(eq(deliveryPricingTiers.id, id))
        .returning();

    if (!updated) {
        throw new GraphQLError(`Delivery pricing tier with ID ${id} not found`);
    }

    return {
        id: updated.id,
        minDistanceKm: updated.minDistanceKm,
        maxDistanceKm: updated.maxDistanceKm,
        price: updated.price,
        sortOrder: updated.sortOrder,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
    };
};