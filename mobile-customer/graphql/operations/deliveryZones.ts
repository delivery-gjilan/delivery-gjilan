import { gql } from '@apollo/client';

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
