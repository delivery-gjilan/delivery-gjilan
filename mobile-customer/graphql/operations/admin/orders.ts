import { gql } from '@apollo/client';

// ─── Admin Orders Queries ───

export const ADMIN_GET_ORDERS = gql`
    query AdminGetOrders {
        orders {
            hasMore
            totalCount
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
    }
`;

export const ADMIN_GET_ORDER = gql`
    query AdminGetOrder($id: ID!) {
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

// ─── Admin Orders Mutations ───

export const ADMIN_UPDATE_ORDER_STATUS = gql`
    mutation AdminUpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            status
        }
    }
`;

export const ADMIN_START_PREPARING = gql`
    mutation AdminStartPreparing($id: ID!, $preparationMinutes: Int!) {
        startPreparing(id: $id, preparationMinutes: $preparationMinutes) {
            id
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
        }
    }
`;

export const ADMIN_UPDATE_PREPARATION_TIME = gql`
    mutation AdminUpdatePreparationTime($id: ID!, $preparationMinutes: Int!) {
        updatePreparationTime(id: $id, preparationMinutes: $preparationMinutes) {
            id
            preparationMinutes
            estimatedReadyAt
        }
    }
`;

export const ADMIN_CANCEL_ORDER = gql`
    mutation AdminCancelOrder($id: ID!) {
        cancelOrder(id: $id) {
            id
            status
        }
    }
`;

export const ADMIN_ASSIGN_DRIVER_TO_ORDER = gql`
    mutation AdminAssignDriverToOrder($id: ID!, $driverId: ID) {
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

// ─── Admin Orders Subscriptions ───

export const ADMIN_ALL_ORDERS_SUBSCRIPTION = gql`
    subscription AdminAllOrdersUpdated {
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
