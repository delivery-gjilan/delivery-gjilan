import { gql } from '@apollo/client';

export const DRIVER_LOGIN_MUTATION = gql`
    mutation DriverLogin($input: DriverLoginInput!) {
        driverLogin(input: $input) {
            token
            refreshToken
            driver {
                id
                email
                firstName
                lastName
                phoneNumber
                onlinePreference
                connectionStatus
                lastHeartbeatAt
                lastLocationUpdate
                driverLat
                driverLng
            }
            message
        }
    }
`;

export const DRIVER_REGISTER_MUTATION = gql`
    mutation DriverRegister($input: DriverRegisterInput!) {
        driverRegister(input: $input) {
            token
            refreshToken
            driver {
                id
                email
                firstName
                lastName
                phoneNumber
                onlinePreference
                connectionStatus
                lastHeartbeatAt
                lastLocationUpdate
                driverLat
                driverLng
            }
            message
        }
    }
`;
