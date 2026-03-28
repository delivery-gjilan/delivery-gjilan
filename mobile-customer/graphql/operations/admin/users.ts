import { gql } from '@apollo/client';

// ─── Admin Users Queries ───

export const ADMIN_GET_USERS = gql`
    query AdminGetUsers {
        users {
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

export const ADMIN_USER_BEHAVIOR = gql`
    query AdminUserBehavior($userId: ID!) {
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

// ─── Admin Users Mutations ───

export const ADMIN_UPDATE_USER_NOTE = gql`
    mutation AdminUpdateUserNote($userId: ID!, $note: String, $flagColor: String) {
        updateUserNote(userId: $userId, note: $note, flagColor: $flagColor) {
            id
            adminNote
            flagColor
        }
    }
`;
