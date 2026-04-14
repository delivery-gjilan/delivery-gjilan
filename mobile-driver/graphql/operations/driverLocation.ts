import { graphql } from '@/gql';
export const UPDATE_DRIVER_ONLINE_STATUS = graphql(`
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
`);