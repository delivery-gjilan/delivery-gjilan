import { gql } from '@apollo/client';
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