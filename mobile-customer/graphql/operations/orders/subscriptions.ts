import { graphql } from '@/gql';

export const ORDER_STATUS_UPDATED = graphql(`
    subscription OrderStatusUpdated($orderId: ID!) {
        orderStatusUpdated(orderId: $orderId) {
            id
            status
        }
    }
`);

export const USER_ORDERS_UPDATED = graphql(`
    subscription UserOrdersUpdated($input: SubscriptionInput!) {
        userOrdersUpdated(input: $input) {
            id
            displayId
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
            dropOffLocation {
                latitude
                longitude
                address
            }
            businesses {
                business {
                    id
                    name
                    imageUrl
                    businessType
                    createdAt
                    updatedAt
                    isActive
                    isOpen
                    location {
                        address
                        longitude
                        latitude
                    }
                    workingHours {
                        closesAt
                        opensAt
                    }
                }
                items {
                    productId
                    name
                    imageUrl
                    quantity
                    price
                }
            }
        }
    }
`);
