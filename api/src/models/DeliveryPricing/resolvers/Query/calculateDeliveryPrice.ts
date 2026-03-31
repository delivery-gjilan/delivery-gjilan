import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryPricingTiers } from '@/database/schema/deliveryPricingTiers';
import { deliveryZones } from '@/database/schema/deliveryZones';
import { businesses } from '@/database/schema/businesses';
import { asc, eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { calculateDrivingDistanceKm } from '@/lib/haversine';
import { isPointInPolygon } from '@/lib/pointInPolygon';

const DEFAULT_DELIVERY_PRICE = 2.0;

export const calculateDeliveryPrice: NonNullable<QueryResolvers['calculateDeliveryPrice']> = async (
    _parent,
    { dropoffLat, dropoffLng, businessId },
    _ctx
) => {
    const db = await getDB();

    // 1. Get business location
    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId));

    if (!business) {
        throw AppError.notFound(`Business with ID ${businessId}`);
    }

    // 2. Calculate driving distance via Mapbox Directions API
    const { distanceKm } = await calculateDrivingDistanceKm(
        business.locationLat,
        business.locationLng,
        dropoffLat,
        dropoffLng,
    );

    const roundedDistance = Math.round(distanceKm * 100) / 100;

    // 3. Check delivery zones first — only non-service zones can override tier pricing.
    // Service zones are coverage boundaries and must not set delivery fee.
    const zones = await db
        .select()
        .from(deliveryZones)
        .where(eq(deliveryZones.isActive, true))
        .orderBy(asc(deliveryZones.sortOrder));

    const dropoffPoint = { lat: dropoffLat, lng: dropoffLng };
    const matchedZone = zones.find(
        (zone) => !zone.isServiceZone && isPointInPolygon(dropoffPoint, zone.polygon),
    );

    if (matchedZone) {
        return {
            distanceKm: roundedDistance,
            price: matchedZone.deliveryFee,
            tierApplied: null,
            zoneApplied: {
                id: matchedZone.id,
                name: matchedZone.name,
                deliveryFee: matchedZone.deliveryFee,
            },
        };
    }

    // 4. No zone matched — fall back to distance-based tiers
    const tiers = await db
        .select()
        .from(deliveryPricingTiers)
        .where(eq(deliveryPricingTiers.isActive, true))
        .orderBy(asc(deliveryPricingTiers.sortOrder), asc(deliveryPricingTiers.minDistanceKm));

    if (tiers.length === 0) {
        return {
            distanceKm: roundedDistance,
            price: DEFAULT_DELIVERY_PRICE,
            tierApplied: null,
            zoneApplied: null,
        };
    }

    // Find the tier that matches the distance
    const matchedTier = tiers.find((t) => {
        const min = t.minDistanceKm;
        const max = t.maxDistanceKm;
        if (max === null || max === undefined) {
            return distanceKm >= min;
        }
        return distanceKm >= min && distanceKm < max;
    });

    if (!matchedTier) {
        const lastTier = tiers[tiers.length - 1];
        return {
            distanceKm: roundedDistance,
            price: lastTier.price,
            tierApplied: {
                id: lastTier.id,
                minDistanceKm: lastTier.minDistanceKm,
                maxDistanceKm: lastTier.maxDistanceKm,
                price: lastTier.price,
                sortOrder: lastTier.sortOrder,
                isActive: lastTier.isActive,
                createdAt: lastTier.createdAt,
                updatedAt: lastTier.updatedAt,
            },
            zoneApplied: null,
        };
    }

    return {
        distanceKm: roundedDistance,
        price: matchedTier.price,
        tierApplied: {
            id: matchedTier.id,
            minDistanceKm: matchedTier.minDistanceKm,
            maxDistanceKm: matchedTier.maxDistanceKm,
            price: matchedTier.price,
            sortOrder: matchedTier.sortOrder,
            isActive: matchedTier.isActive,
            createdAt: matchedTier.createdAt,
            updatedAt: matchedTier.updatedAt,
        },
        zoneApplied: null,
    };
};