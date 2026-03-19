import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
    mutation BusinessLogin($input: LoginInput!) {
        login(input: $input) {
            token
            refreshToken
            user {
                id
                email
                firstName
                lastName
                role
                permissions
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
`;
