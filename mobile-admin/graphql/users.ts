import { gql } from '@apollo/client';

// ─── Users Queries ───

export const GET_USERS = gql`
    query GetUsers {
        users(limit: 500) {
            id
            email
            firstName
            lastName
            role
            phoneNumber
            address
            adminNote
            flagColor
            permissions
            business {
                id
                name
            }
        }
    }
`;

export const USER_BEHAVIOR_QUERY = gql`
    query UserBehavior($userId: ID!) {
        userBehavior(userId: $userId) {
            userId
            totalOrders
            deliveredOrders
            cancelledOrders
            totalSpend
            avgOrderValue
            firstOrderAt
            lastOrderAt
            lastDeliveredAt
        }
    }
`;

// ─── Users Mutations ───

export const CREATE_USER = gql`
    mutation CreateUser(
        $email: String!
        $password: String!
        $firstName: String!
        $lastName: String!
        $role: UserRole!
        $businessId: ID
    ) {
        createUser(
            input: {
                email: $email
                password: $password
                firstName: $firstName
                lastName: $lastName
                role: $role
                businessId: $businessId
            }
        ) {
            token
            user {
                id
                email
                firstName
                lastName
                role
                businessId
            }
            message
        }
    }
`;

export const UPDATE_USER = gql`
    mutation UpdateUser(
        $id: ID!
        $firstName: String!
        $lastName: String!
        $role: UserRole!
        $businessId: ID
    ) {
        updateUser(
            input: {
                id: $id
                firstName: $firstName
                lastName: $lastName
                role: $role
                businessId: $businessId
            }
        ) {
            id
            email
            firstName
            lastName
            role
        }
    }
`;

export const DELETE_USER = gql`
    mutation DeleteUser($id: ID!) {
        deleteUser(id: $id)
    }
`;

export const UPDATE_USER_NOTE = gql`
    mutation UpdateUserNote($userId: ID!, $note: String, $flagColor: String) {
        updateUserNote(userId: $userId, note: $note, flagColor: $flagColor) {
            id
            adminNote
            flagColor
        }
    }
`;

export const SET_USER_PERMISSIONS = gql`
    mutation SetUserPermissions($userId: ID!, $permissions: [UserPermission!]!) {
        setUserPermissions(userId: $userId, permissions: $permissions) {
            id
            permissions
        }
    }
`;
