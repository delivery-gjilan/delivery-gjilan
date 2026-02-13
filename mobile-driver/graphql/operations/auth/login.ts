import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
    mutation Login($input: LoginInput!) {
        login(input: $input) {
            token
            user {
                id
                email
                firstName
                lastName
                role
                signupStep
                emailVerified
                phoneVerified
                phoneNumber
                driverConnection {
                    onlinePreference
                    connectionStatus
                    lastLocationUpdate
                }
            }
            message
        }
    }
`;
