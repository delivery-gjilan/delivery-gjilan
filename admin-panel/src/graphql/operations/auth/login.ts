import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
    mutation Login($email: String!, $password: String!) {
        login(input: { email: $email, password: $password }) {
            token
            user {
                firstName
                lastName
                role
            }
            message
        }
    }
`;
