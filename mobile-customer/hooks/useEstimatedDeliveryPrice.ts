import { useQuery } from '@apollo/client/react';
import { DELIVERY_PRICING_CONFIG_QUERY } from '@/graphql/operations/deliveryPricing';
import { useDeliveryLocationStore } from '@/store/useDeliveryLocationStore';
import { calculateHaversineDistance } from '@/utils/haversine';
import { isPointInPolygon } from '@/utils/pointInPolygon';

const DEFAULT_DELIVERY_PRICE = 2.0;

type DeliveryZone = {
    id: string;
    name: string;
    polygon: Array<{ lat: number; lng: number }>;
    deliveryFee: number;
    sortOrder: number;
};

type DeliveryTier = {
    id: string;
    minDistanceKm: number;
    maxDistanceKm: number | null;
    price: number;
    sortOrder: number;
};

export function useEstimatedDeliveryPrice() {
    const { location } = useDeliveryLocationStore();
    const { data, loading } = useQuery(DELIVERY_PRICING_CONFIG_QUERY, {
        fetchPolicy: 'cache-first',
    });

    const estimateDeliveryPrice = (businessLat: number, businessLng: number): number => {
        if (!location || !data?.deliveryPricingConfig) {
            return DEFAULT_DELIVERY_PRICE;
        }

        const zones = (data.deliveryPricingConfig.zones || []) as DeliveryZone[];
        const tiers = (data.deliveryPricingConfig.tiers || []) as DeliveryTier[];

        const dropoffPoint = { lat: location.latitude, lng: location.longitude };

        // 1. Check zones first (priority over distance tiers)
        const matchedZone = zones.find((zone) => isPointInPolygon(dropoffPoint, zone.polygon));
        if (matchedZone) {
            return matchedZone.deliveryFee;
        }

        // 2. Calculate Haversine distance
        const distanceKm = calculateHaversineDistance(
            businessLat,
            businessLng,
            location.latitude,
            location.longitude
        );

        // 3. Match to distance tier
        if (tiers.length === 0) {
            return DEFAULT_DELIVERY_PRICE;
        }

        const matchedTier = tiers.find((tier) => {
            const min = tier.minDistanceKm;
            const max = tier.maxDistanceKm;
            if (max === null || max === undefined) {
                // Open-ended tier (e.g. 10+ km)
                return distanceKm >= min;
            }
            return distanceKm >= min && distanceKm < max;
        });

        if (matchedTier) {
            return matchedTier.price;
        }

        // 4. If distance exceeds all tiers, use the last tier
        const lastTier = tiers[tiers.length - 1];
        return lastTier?.price || DEFAULT_DELIVERY_PRICE;
    };

    return {
        estimateDeliveryPrice,
        loading,
        location,
    };
}
