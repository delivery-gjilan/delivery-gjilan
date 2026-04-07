import { graphql } from '@/gql';

// Orders queries
export const GET_BUSINESS_ORDERS = graphql(`
    query GetBusinessOrders {
        orders {
            orders {
                id
                displayId
                userId
                orderPrice
                deliveryPrice
                totalPrice
                orderDate
                updatedAt
                status
                preparationMinutes
                estimatedReadyAt
                preparingAt
                readyAt
                user {
                    id
                    firstName
                    lastName
                    phoneNumber
                }
                driver {
                    id
                    firstName
                    lastName
                }
                dropOffLocation {
                    address
                    latitude
                    longitude
                }
                businesses {
                    business {
                        id
                        name
                    }
                    items {
                        productId
                        name
                        imageUrl
                        quantity
                        unitPrice
                        notes
                    }
                }
            }
            totalCount
        }
    }
`);

// Order mutations
export const UPDATE_ORDER_STATUS = graphql(`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            status
            updatedAt
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

// Subscription for real-time orders
export const ORDERS_SUBSCRIPTION = graphql(`
    subscription AllOrdersUpdated {
        allOrdersUpdated {
            id
            displayId
            userId
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            updatedAt
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
            readyAt
            user {
                id
                firstName
                lastName
                phoneNumber
            }
            driver {
                id
                firstName
                lastName
            }
            dropOffLocation {
                address
                latitude
                longitude
            }
            businesses {
                business {
                    id
                    name
                }
                items {
                    productId
                    name
                    imageUrl
                    quantity
                    unitPrice
                    notes
                }
            }
        }
    }
`);
