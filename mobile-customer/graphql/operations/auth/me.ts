import { gql } from '@apollo/client';

export const ME_QUERY = gql`
    query Me {
        me {
            id
            email
            firstName
            lastName
            signupStep
            emailVerified
            phoneVerified
            phoneNumber
            address
            role
            preferredLanguage
            emailOptOut
        }
    }
`;
