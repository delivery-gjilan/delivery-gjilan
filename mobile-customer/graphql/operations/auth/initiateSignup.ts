import { gql } from '@apollo/client';

export const INITIATE_SIGNUP_MUTATION = gql`
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
`;
