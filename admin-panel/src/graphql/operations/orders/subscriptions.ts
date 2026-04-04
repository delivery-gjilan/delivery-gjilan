import { gql } from '@apollo/client';

export const ORDERS_SUBSCRIPTION = gql(`
    subscription OrdersUpdated {
        userOrdersUpdated {
            id
            displayId
            orderPrice
            deliveryPrice
            originalPrice
            totalPrice
            orderDate
            updatedAt
            status
            user {
                id
                firstName
                lastName
                email
                address
                phoneNumber
                adminNote
                flagColor
                totalOrders
                isTrustedCustomer
            }
            driver {
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

export const ALL_ORDERS_SUBSCRIPTION = gql(`
    subscription AllOrdersUpdated {
        allOrdersUpdated {
            id
            displayId
            orderPrice
            deliveryPrice
            originalPrice
            totalPrice
            orderDate
            updatedAt
            status
            adminNote
            needsApproval
            locationFlagged
            approvalReasons
            preparationMinutes
            estimatedReadyAt
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
