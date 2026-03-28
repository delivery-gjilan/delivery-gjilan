import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
    mutation Login($email: String!, $password: String!) {
        login(input: { email: $email, password: $password }) {
            token
            refreshToken
            user {
                id
                firstName
                lastName
                role
                businessId
            }
            message
        }
    }
`;
