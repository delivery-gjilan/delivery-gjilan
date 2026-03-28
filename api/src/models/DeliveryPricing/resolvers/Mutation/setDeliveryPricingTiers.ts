import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryPricingTiers } from '@/database/schema/deliveryPricingTiers';
import { asc } from 'drizzle-orm';

/**
 * Replaces ALL tiers with the provided set.
 * This is the primary way the admin configures delivery pricing.
 */
export const setDeliveryPricingTiers: NonNullable<MutationResolvers['setDeliveryPricingTiers']> = async (
    _parent,
    { input },
    _ctx
) => {
    const db = await getDB();

    // Delete all existing tiers
    await db.delete(deliveryPricingTiers);

    // Insert new tiers
    if (input.tiers.length === 0) {
        return [];
    }

    const values = input.tiers.map((tier, index) => ({
        minDistanceKm: tier.minDistanceKm,
        maxDistanceKm: tier.maxDistanceKm ?? null,
        price: tier.price,
        sortOrder: tier.sortOrder ?? index,
    }));

    const inserted = await db
        .insert(deliveryPricingTiers)
        .values(values)
        .returning();

    return inserted
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((t) => ({
            id: t.id,
            minDistanceKm: t.minDistanceKm,
            maxDistanceKm: t.maxDistanceKm,
            price: t.price,
            sortOrder: t.sortOrder,
            isActive: t.isActive,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));
};