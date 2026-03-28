import { graphql } from '@/gql';

export const UPDATE_ORDER_STATUS = graphql(`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            orderPrice
            deliveryPrice
            originalPrice
            originalDeliveryPrice
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
                    basePrice
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

export const ADMIN_CANCEL_ORDER = graphql(`
    mutation AdminCancelOrder($id: ID!, $reason: String!, $settleDriver: Boolean, $settleBusiness: Boolean) {
        adminCancelOrder(id: $id, reason: $reason, settleDriver: $settleDriver, settleBusiness: $settleBusiness) {
            id
            status
            cancellationReason
            cancelledAt
        }
    }
`);

export const SET_ORDER_ADMIN_NOTE = graphql(`
    mutation SetOrderAdminNote($id: ID!, $note: String) {
        setOrderAdminNote(id: $id, note: $note) {
            id
            adminNote
        }
    }
`);

export const CREATE_TEST_ORDER = graphql(`
    mutation CreateTestOrder {
        createTestOrder {
            id
            orderPrice
            deliveryPrice
            originalPrice
            originalDeliveryPrice
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
                    basePrice
                    unitPrice
                }
            }
        }
    }
`);
