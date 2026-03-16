import { gql } from '@apollo/client';

// ─── Orders Queries ───

export const GET_ORDERS = gql`
    query GetOrders {
        orders {
            id
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            updatedAt
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
            user {
                id
                firstName
                lastName
                email
                address
                phoneNumber
            }
            driver {
                id
                firstName
                lastName
                email
                phoneNumber
            }
            dropOffLocation {
                latitude
                longitude
                address
            }
            businesses {
                business {
                    id
                    name
                    phoneNumber
                    businessType
                    location {
                        latitude
                        longitude
                        address
                    }
                }
                items {
                    productId
                    name
                    imageUrl
                    quantity
                    unitPrice
                }
            }
        }
    }
`;

export const GET_ORDER = gql`
    query GetOrder($id: ID!) {
        order(id: $id) {
            id
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            updatedAt
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
            user {
                id
                firstName
                lastName
                email
                address
                phoneNumber
            }
            driver {
                id
                firstName
                lastName
                email
                phoneNumber
            }
            dropOffLocation {
                latitude
                longitude
                address
            }
            businesses {
                business {
                    id
                    name
                    phoneNumber
                    businessType
                    location {
                        latitude
                        longitude
                        address
                    }
                }
                items {
                    productId
                    name
                    imageUrl
                    quantity
                    unitPrice
                }
            }
        }
    }
`;

// ─── Orders Mutations ───

export const UPDATE_ORDER_STATUS = gql`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            status
        }
    }
`;

export const START_PREPARING = gql`
    mutation StartPreparing($id: ID!, $preparationMinutes: Int!) {
        startPreparing(id: $id, preparationMinutes: $preparationMinutes) {
            id
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
        }
    }
`;

export const UPDATE_PREPARATION_TIME = gql`
    mutation UpdatePreparationTime($id: ID!, $preparationMinutes: Int!) {
        updatePreparationTime(id: $id, preparationMinutes: $preparationMinutes) {
            id
            preparationMinutes
            estimatedReadyAt
        }
    }
`;

export const CANCEL_ORDER = gql`
    mutation CancelOrder($id: ID!) {
        cancelOrder(id: $id) {
            id
            status
        }
    }
`;

export const ASSIGN_DRIVER_TO_ORDER = gql`
    mutation AssignDriverToOrder($id: ID!, $driverId: ID) {
        assignDriverToOrder(id: $id, driverId: $driverId) {
            id
            driver {
                id
                firstName
                lastName
            }
            status
        }
    }
`;

export const CREATE_TEST_ORDER = gql`
    mutation CreateTestOrder {
        createTestOrder {
            id
            status
            totalPrice
        }
    }
`;

// ─── Orders Subscriptions ───

export const ALL_ORDERS_SUBSCRIPTION = gql`
    subscription AllOrdersUpdated {
        allOrdersUpdated {
            id
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            updatedAt
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
            user {
                id
                firstName
                lastName
                email
                address
                phoneNumber
            }
            driver {
                id
                firstName
                lastName
                email
                phoneNumber
            }
            dropOffLocation {
                latitude
                longitude
                address
            }
            businesses {
                business {
                    id
                    name
                    businessType
                    phoneNumber
                    location {
                        latitude
                        longitude
                        address
                    }
                }
                items {
                    productId
                    name
                    imageUrl
                    quantity
                    unitPrice
                }
            }
        }
    }
`;
