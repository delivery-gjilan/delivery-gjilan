import { graphql } from '@/gql';

export const GET_ORDERS = graphql(`
    query GetOrders($limit: Int, $offset: Int) {
        orders(limit: $limit, offset: $offset) {
            id
            displayId
            orderPrice
            deliveryPrice
            originalPrice
            originalDeliveryPrice
            totalPrice
            orderDate
            updatedAt
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
            cancelledAt
            cancellationReason
            adminNote
            driverNotes
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
                commissionPercentage
                commissionPercentage
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
                    basePrice
                    unitPrice
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
            originalPrice
            originalDeliveryPrice
            totalPrice
            orderDate
            updatedAt
            status
            cancelledAt
            cancellationReason
            adminNote
            driverNotes
            user {
                id
                firstName
                lastName
                email
                address
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
                    basePrice
                    unitPrice
                }
            }
        }
    }
`);

export const GET_ORDERS_BY_STATUS = graphql(`
    query GetOrdersByStatus($status: OrderStatus!) {
        ordersByStatus(status: $status) {
            id
            displayId
            orderPrice
            deliveryPrice
            originalPrice
            originalDeliveryPrice
            totalPrice
            orderDate
            status
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
                    basePrice
                    unitPrice
                }
            }
        }
    }
`);

export const GET_CANCELLED_ORDERS = graphql(`
    query GetCancelledOrders {
        cancelledOrders {
            id
            displayId
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            cancelledAt
            cancellationReason
            adminNote
            user {
                id
                firstName
                lastName
                email
                phoneNumber
            }
            driver {
                id
                firstName
                lastName
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
                    quantity
                    unitPrice
                }
            }
            dropOffLocation {
                latitude
                longitude
                address
            }
        }
    }
`);
