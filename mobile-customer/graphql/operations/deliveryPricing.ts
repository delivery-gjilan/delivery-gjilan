import { graphql } from '@/gql';

export const CALCULATE_DELIVERY_PRICE = graphql(`
    query CalculateDeliveryPrice($dropoffLat: Float!, $dropoffLng: Float!, $businessId: ID!) {
        calculateDeliveryPrice(dropoffLat: $dropoffLat, dropoffLng: $dropoffLng, businessId: $businessId) {
            distanceKm
            price
            zoneApplied {
                id
                name
                deliveryFee
            }
        }
    }
`);

export const DELIVERY_PRICING_CONFIG_QUERY = graphql(`
    query DeliveryPricingConfig {
        deliveryPricingConfig {
            zones {
                id
                name
                polygon {
                    lat
                    lng
                }
                deliveryFee
                sortOrder
            }
            tiers {
                id
                minDistanceKm
                maxDistanceKm
                price
                sortOrder
            }
        }
    }
`);
