import { graphql } from '@/gql';

export const LOGIN_MUTATION = graphql(`
    mutation Login($email: String!, $password: String!) {
        login(input: { email: $email, password: $password }) {
            token
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
`);
