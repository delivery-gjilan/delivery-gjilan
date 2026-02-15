import { graphql } from '@/gql';

export const GET_DELIVERY_ZONES = graphql(`
    query GetDeliveryZones {
        deliveryZones {
            id
            name
            description
            feeDelta
            color
            priority
            isActive
            geometry
            createdAt
            updatedAt
        }
    }
`);

export const GET_DELIVERY_ZONE = graphql(`
    query GetDeliveryZone($id: ID!) {
        deliveryZone(id: $id) {
            id
            name
            description
            feeDelta
            color
            priority
            isActive
            geometry
            createdAt
            updatedAt
        }
    }
`);

export const CALCULATE_DELIVERY_FEE = graphql(`
    query CalculateDeliveryFee($latitude: Float!, $longitude: Float!, $baseDeliveryFee: Float!) {
        calculateDeliveryFee(latitude: $latitude, longitude: $longitude, baseDeliveryFee: $baseDeliveryFee) {
            zone {
                id
                name
                feeDelta
                color
            }
            totalFee
            baseDeliveryFee
        }
    }
`);
