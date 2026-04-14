import { graphql } from '@/gql';

export const INITIATE_SIGNUP_MUTATION = graphql(`
    mutation InitiateSignup($input: InitiateSignupInput!) {
        initiateSignup(input: $input) {
            token
            refreshToken
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
            }
            message
        }
    }
`);