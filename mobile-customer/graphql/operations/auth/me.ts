import { graphql } from '@/gql';

export const ME_QUERY = graphql(`
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
        }
    }
`);
