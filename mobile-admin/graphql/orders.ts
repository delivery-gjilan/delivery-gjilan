import { graphql } from '@/gql';

// ─── Orders Queries ───

export const GET_ORDERS = graphql(`
    query GetOrders($limit: Int, $offset: Int, $statuses: [OrderStatus!]) {
        orders(limit: $limit, offset: $offset, statuses: $statuses) {
            totalCount
            hasMore
            orders {
                id
                displayId
                orderPrice
                deliveryPrice
                totalPrice
                orderDate
                updatedAt
                status
                needsApproval
                locationFlagged
                approvalReasons
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
`);

export const GET_ORDER = graphql(`
    query GetOrder($id: ID!) {
        order(id: $id) {
            id
            displayId
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            updatedAt
            status
            needsApproval
            locationFlagged
            approvalReasons
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
`);

// ─── Orders Mutations ───

export const UPDATE_ORDER_STATUS = graphql(`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            status
        }
    }
`);

export const START_PREPARING = graphql(`
    mutation StartPreparing($id: ID!, $preparationMinutes: Int!) {
        startPreparing(id: $id, preparationMinutes: $preparationMinutes) {
            id
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
        }
    }
`);

export const UPDATE_PREPARATION_TIME = graphql(`
    mutation UpdatePreparationTime($id: ID!, $preparationMinutes: Int!) {
        updatePreparationTime(id: $id, preparationMinutes: $preparationMinutes) {
            id
            preparationMinutes
            estimatedReadyAt
        }
    }
`);

export const CANCEL_ORDER = graphql(`
    mutation CancelOrder($id: ID!) {
        cancelOrder(id: $id) {
            id
            status
        }
    }
`);

export const ASSIGN_DRIVER_TO_ORDER = graphql(`
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
`);

export const APPROVE_ORDER = graphql(`
    mutation ApproveOrder($id: ID!) {
        approveOrder(id: $id) {
            id
            status
            needsApproval
        }
    }
`);

export const CREATE_TEST_ORDER = graphql(`
    mutation CreateTestOrder {
        createTestOrder {
            id
            status
            totalPrice
        }
    }
`);

// ─── Orders Subscriptions ───

export const ALL_ORDERS_SUBSCRIPTION = graphql(`
    subscription AllOrdersUpdated {
        allOrdersUpdated {
            id
            displayId
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            updatedAt
            status
            needsApproval
            locationFlagged
            approvalReasons
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
`);
