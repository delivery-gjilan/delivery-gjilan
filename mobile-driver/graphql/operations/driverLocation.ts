import { gql } from '@apollo/client';

export const UPDATE_DRIVER_LOCATION = gql`
    mutation UpdateDriverLocation($latitude: Float!, $longitude: Float!) {
        updateDriverLocation(latitude: $latitude, longitude: $longitude) {
            id
            driverLocation {
                latitude
                longitude
                address
            }
            driverLocationUpdatedAt
        }
    }
`;
