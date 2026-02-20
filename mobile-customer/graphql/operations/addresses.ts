import { gql } from '@apollo/client';

export const GET_MY_ADDRESSES = gql`
    query GetMyAddresses {
        myAddresses {
            id
            latitude
            longitude
            addressName
            displayName
            priority
            createdAt
        }
    }
`;

export const ADD_USER_ADDRESS = gql`
    mutation AddUserAddress($input: AddUserAddressInput!) {
        addUserAddress(input: $input) {
            id
            latitude
            longitude
            addressName
            displayName
            priority
        }
    }
`;

export const UPDATE_USER_ADDRESS = gql`
    mutation UpdateUserAddress($input: UpdateUserAddressInput!) {
        updateUserAddress(input: $input) {
            id
            addressName
            displayName
            priority
        }
    }
`;

export const DELETE_USER_ADDRESS = gql`
    mutation DeleteUserAddress($id: ID!) {
        deleteUserAddress(id: $id)
    }
`;

export const SET_DEFAULT_ADDRESS = gql`
    mutation SetDefaultAddress($id: ID!) {
        setDefaultAddress(id: $id)
    }
`;
