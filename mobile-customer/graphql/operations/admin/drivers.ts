import { gql } from '@apollo/client';

// ─── Admin Drivers Queries ───

export const ADMIN_GET_DRIVERS = gql`
    query AdminGetDrivers {
        drivers {
            id
            email
            firstName
            lastName
            role
            imageUrl
            phoneNumber
            commissionPercentage
            maxActiveOrders
            driverLocation {
                latitude
                longitude
                address
            }
            driverLocationUpdatedAt
            driverConnection {
                onlinePreference
                connectionStatus
                lastHeartbeatAt
                lastLocationUpdate
                disconnectedAt
            }
        }
    }
`;

// ─── Admin Drivers Mutations ───

export const ADMIN_UPDATE_DRIVER_SETTINGS = gql`
    mutation AdminUpdateDriverSettings($driverId: ID!, $commissionPercentage: Float, $maxActiveOrders: Int) {
        adminUpdateDriverSettings(driverId: $driverId, commissionPercentage: $commissionPercentage, maxActiveOrders: $maxActiveOrders) {
            id
            commissionPercentage
            maxActiveOrders
        }
    }
`;

export const ADMIN_SET_DRIVER_ONLINE_STATUS = gql`
    mutation AdminSetDriverOnlineStatus($isOnline: Boolean!) {
        updateDriverOnlineStatus(isOnline: $isOnline) {
            id
            isOnline
            firstName
            lastName
        }
    }
`;

// ─── Admin Drivers Subscriptions ───

export const ADMIN_DRIVERS_UPDATED_SUBSCRIPTION = gql`
    subscription AdminDriversUpdated {
        driversUpdated {
            id
            email
            firstName
            lastName
            role
            imageUrl
            phoneNumber
            driverLocation {
                latitude
                longitude
                address
            }
            driverLocationUpdatedAt
            driverConnection {
                onlinePreference
                connectionStatus
                lastHeartbeatAt
                lastLocationUpdate
                disconnectedAt
            }
        }
    }
`;
