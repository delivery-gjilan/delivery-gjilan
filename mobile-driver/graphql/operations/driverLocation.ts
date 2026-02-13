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
export const UPDATE_DRIVER_ONLINE_STATUS = gql`
    mutation UpdateDriverOnlineStatus($isOnline: Boolean!) {
        updateDriverOnlineStatus(isOnline: $isOnline) {
            id
            firstName
            lastName
            driverConnection {
                onlinePreference
                connectionStatus
                lastLocationUpdate
            }
        }
    }
`;