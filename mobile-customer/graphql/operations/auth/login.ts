import { graphql } from '@/gql';

export const LOGIN_MUTATION = graphql(`
    mutation Login($input: LoginInput!) {
        login(input: $input) {
            token
            user {
                id
                email
                firstName
                lastName
                signupStep
                emailVerified
                phoneVerified
                phoneNumber
                role
                preferredLanguage
            }
            message
        }
    }
`);
