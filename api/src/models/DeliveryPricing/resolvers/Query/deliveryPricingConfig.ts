import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryPricingTiers } from '@/database/schema/deliveryPricingTiers';
import { deliveryZones } from '@/database/schema/deliveryZones';
import { asc, eq } from 'drizzle-orm';

export const deliveryPricingConfig: NonNullable<QueryResolvers['deliveryPricingConfig']> = async (_parent, _arg, _ctx) => {
    const db = await getDB();

    // Fetch all active zones
    const zonesData = await db
        .select()
        .from(deliveryZones)
        .where(eq(deliveryZones.isActive, true))
        .orderBy(asc(deliveryZones.sortOrder), asc(deliveryZones.createdAt));

    // Fetch all active tiers
    const tiersData = await db
        .select()
        .from(deliveryPricingTiers)
        .where(eq(deliveryPricingTiers.isActive, true))
        .orderBy(asc(deliveryPricingTiers.sortOrder), asc(deliveryPricingTiers.minDistanceKm));

    return {
        zones: zonesData.map((z) => ({
            id: z.id,
            name: z.name,
            polygon: z.polygon,
            deliveryFee: z.deliveryFee,
            sortOrder: z.sortOrder,
            isActive: z.isActive,
            createdAt: z.createdAt,
            updatedAt: z.updatedAt,
        })),
        tiers: tiersData.map((t) => ({
            id: t.id,
            minDistanceKm: t.minDistanceKm,
            maxDistanceKm: t.maxDistanceKm,
            price: t.price,
            sortOrder: t.sortOrder,
            isActive: t.isActive,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        })),
    };
};