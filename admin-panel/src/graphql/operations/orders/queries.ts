import { graphql } from '@/gql';

export const GET_ORDERS = graphql(`
    query GetOrders($limit: Int, $offset: Int, $statuses: [OrderStatus!], $startDate: String, $endDate: String) {
        orders(limit: $limit, offset: $offset, statuses: $statuses, startDate: $startDate, endDate: $endDate) {
            totalCount
            hasMore
            orders {
                id
                displayId
                orderPrice
                deliveryPrice
                originalPrice
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
                needsApproval
                locationFlagged
                approvalReasons
                driver {
                    id
                    firstName
                    lastName
                    email
                }
                user {
                    id
                    firstName
                    lastName
                    email
                    phoneNumber
                    adminNote
                    flagColor
                    totalOrders
                    isTrustedCustomer
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
                        unitPrice
                    }
                }
                settlementPreview {
                    lineItems {
                        type
                        direction
                        amount
                        reason
                        businessId
                        driverId
                        ruleId
                    }
                    totalReceivable
                    totalPayable
                    netMargin
                    driverAssigned
                }
                orderPromotions {
                    id
                    promotionId
                    appliesTo
                    discountAmount
                    promoCode
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
            totalPrice
            orderDate
            updatedAt
            status
            cancelledAt
            cancellationReason
            adminNote
            driverNotes
            needsApproval
            locationFlagged
            approvalReasons
            driver {
                id
                firstName
                lastName
                email
            }
            user {
                id
                firstName
                lastName
                email
                phoneNumber
                adminNote
                flagColor
                totalOrders
                isTrustedCustomer
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
            settlementPreview {
                lineItems {
                    type
                    direction
                    amount
                    reason
                    businessId
                    driverId
                    ruleId
                }
                totalReceivable
                totalPayable
                netMargin
                driverAssigned
            }
            orderPromotions {
                id
                promotionId
                appliesTo
                discountAmount
                promoCode
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
            totalPrice
            orderDate
            status
            needsApproval
            locationFlagged
            approvalReasons
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
