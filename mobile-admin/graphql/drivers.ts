import { gql } from '@apollo/client';

// ─── Drivers Queries ───

export const GET_DRIVERS = gql`
    query GetDrivers {
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

// ─── Drivers Mutations ───

export const ADMIN_UPDATE_DRIVER_SETTINGS = gql`
    mutation AdminUpdateDriverSettings($driverId: ID!, $commissionPercentage: Float, $maxActiveOrders: Int) {
        adminUpdateDriverSettings(driverId: $driverId, commissionPercentage: $commissionPercentage, maxActiveOrders: $maxActiveOrders) {
            id
            commissionPercentage
            maxActiveOrders
        }
    }
`;

export const ADMIN_UPDATE_DRIVER_LOCATION = gql`
    mutation AdminUpdateDriverLocation($driverId: ID!, $latitude: Float!, $longitude: Float!) {
        adminUpdateDriverLocation(driverId: $driverId, latitude: $latitude, longitude: $longitude) {
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
            isOnline
            firstName
            lastName
        }
    }
`;

// ─── Drivers Subscriptions ───

export const DRIVERS_UPDATED_SUBSCRIPTION = gql`
    subscription DriversUpdated {
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
