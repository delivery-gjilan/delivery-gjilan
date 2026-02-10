import { gql } from '@apollo/client';

export const GET_DELIVERY_ZONES = gql`
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
`;

export const GET_DELIVERY_ZONE = gql`
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
`;

export const CALCULATE_DELIVERY_FEE = gql`
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
`;
