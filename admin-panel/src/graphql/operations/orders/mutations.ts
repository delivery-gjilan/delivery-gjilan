import { graphql } from '@/gql';

export const UPDATE_ORDER_STATUS = graphql(`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            status
            user {
                id
                firstName
                lastName
                email
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

export const CANCEL_ORDER = graphql(`
    mutation CancelOrder($id: ID!) {
        cancelOrder(id: $id) {
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

export const ASSIGN_DRIVER_TO_ORDER = graphql(`
    mutation AssignDriverToOrder($id: ID!, $driverId: ID) {
        assignDriverToOrder(id: $id, driverId: $driverId) {
            id
            driver {
                id
                firstName
                lastName
                email
            }
            status
        }
    }
`);

export const CREATE_TEST_ORDER = graphql(`
    mutation CreateTestOrder {
        createTestOrder {
            id
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            status
            user {
                id
                firstName
                lastName
                email
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
