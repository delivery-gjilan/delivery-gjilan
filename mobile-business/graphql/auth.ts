import { graphql } from '@/gql';

export const LOGIN_MUTATION = graphql(`
    mutation BusinessLogin($input: LoginInput!) {
        login(input: $input) {
            token
            user {
                id
                email
                firstName
                lastName
                role
                businessId
                business {
                    id
                    name
                    imageUrl
                    businessType
                    isActive
                }
            }
            message
        }
    }
`);
