import { graphql } from '@/gql';

export const GET_MY_ADDRESSES = graphql(`
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
`);
export const ADD_USER_ADDRESS = graphql(`
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
`);
export const UPDATE_USER_ADDRESS = graphql(`
    mutation UpdateUserAddress($input: UpdateUserAddressInput!) {
        updateUserAddress(input: $input) {
            id
            addressName
            displayName
            priority
        }
    }
`);
export const DELETE_USER_ADDRESS = graphql(`
    mutation DeleteUserAddress($id: ID!) {
        deleteUserAddress(id: $id)
    }
`);
export const SET_DEFAULT_ADDRESS = graphql(`
    mutation SetDefaultAddress($id: ID!) {
        setDefaultAddress(id: $id)
    }
`);