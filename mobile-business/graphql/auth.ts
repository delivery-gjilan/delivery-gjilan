import { gql } from '@apollo/client';

export const GET_ME = gql`
    query GetMeBusiness {
        me {
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
    }
`;

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

export const CHANGE_MY_PASSWORD = gql`
    mutation ChangeMyPassword($currentPassword: String!, $newPassword: String!) {
        changeMyPassword(currentPassword: $currentPassword, newPassword: $newPassword)
    }
`;

export const SET_MY_PREFERRED_LANGUAGE = gql`
    mutation SetMyPreferredLanguage($language: AppLanguage!) {
        setMyPreferredLanguage(language: $language) {
            id
            preferredLanguage
        }
    }
`;

export const DELETE_MY_ACCOUNT = gql`
    mutation DeleteMyAccount {
        deleteMyAccount
    }
`;
