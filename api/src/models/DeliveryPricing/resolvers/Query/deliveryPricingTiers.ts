import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryPricingTiers as tiersTable } from '@/database/schema/deliveryPricingTiers';
import { asc } from 'drizzle-orm';

export const deliveryPricingTiers: NonNullable<QueryResolvers['deliveryPricingTiers']> = async (
    _parent,
    _args,
    _ctx
) => {
    const db = await getDB();

    const tiers = await db
        .select()
        .from(tiersTable)
        .orderBy(asc(tiersTable.sortOrder), asc(tiersTable.minDistanceKm));

    return tiers.map((t) => ({
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