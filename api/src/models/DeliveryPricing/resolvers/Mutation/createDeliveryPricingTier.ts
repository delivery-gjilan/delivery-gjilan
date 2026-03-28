import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryPricingTiers } from '@/database/schema/deliveryPricingTiers';

export const createDeliveryPricingTier: NonNullable<MutationResolvers['createDeliveryPricingTier']> = async (
    _parent,
    { input },
    _ctx
) => {
    const db = await getDB();

    const [tier] = await db
        .insert(deliveryPricingTiers)
        .values({
            minDistanceKm: input.minDistanceKm,
            maxDistanceKm: input.maxDistanceKm ?? null,
            price: input.price,
            sortOrder: input.sortOrder ?? 0,
        })
        .returning();

    return {
        id: tier.id,
        minDistanceKm: tier.minDistanceKm,
        maxDistanceKm: tier.maxDistanceKm,
        price: tier.price,
        sortOrder: tier.sortOrder,
        isActive: tier.isActive,
        createdAt: tier.createdAt,
        updatedAt: tier.updatedAt,
    };
};