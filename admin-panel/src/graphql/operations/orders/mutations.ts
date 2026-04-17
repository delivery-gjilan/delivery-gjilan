import { graphql } from '@/gql';

export const UPDATE_ORDER_STATUS = graphql(`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            orderPrice
            deliveryPrice
            originalPrice
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
                    phoneNumber
                    businessType
                    commissionPercentage
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
            orderPrice
            deliveryPrice
            originalPrice
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
                    phoneNumber
                    businessType
                    commissionPercentage
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

export const CREATE_DIRECT_DISPATCH_ORDER = graphql(`
    mutation CreateDirectDispatchOrder($input: CreateDirectDispatchOrderInput!) {
        createDirectDispatchOrder(input: $input) {
            id
            displayId
            status
            channel
            recipientPhone
            recipientName
            orderDate
            businesses {
                business {
                    id
                    name
                }
                items {
                    productId
                    name
                    quantity
                    unitPrice
                }
            }
        }
    }
`);

export const REMOVE_ORDER_ITEM = graphql(`
    mutation RemoveOrderItem($orderId: ID!, $orderItemId: ID!, $reason: String!, $quantity: Int) {
        removeOrderItem(orderId: $orderId, orderItemId: $orderItemId, reason: $reason, quantity: $quantity) {
            id
            orderPrice
            deliveryPrice
            totalPrice
            businesses {
                business {
                    id
                    name
                }
                items {
                    id
                    productId
                    name
                    quantity
                    unitPrice
                    inventoryQuantity
                }
                removedItems {
                    id
                    productId
                    name
                    removedQuantity
                    unitPrice
                    reason
                    removedAt
                }
            }
        }
    }
`);
