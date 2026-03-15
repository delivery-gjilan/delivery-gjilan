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
    subscription UserOrdersUpdated {
        userOrdersUpdated {
            id
            displayId
            userId
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
            driver {
                id
                firstName
                lastName
                phoneNumber
                imageUrl
                driverLocation {
                    latitude
                    longitude
                    address
                }
                driverLocationUpdatedAt
                driverConnection {
                    activeOrderId
                    navigationPhase
                    remainingEtaSeconds
                    etaUpdatedAt
                }
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
                    id
                    productId
                    name
                    imageUrl
                    quantity
                    unitPrice
                    parentOrderItemId
                    selectedOptions {
                        id
                        optionGroupId
                        optionGroupName
                        optionId
                        optionName
                        priceAtOrder
                    }
                    childItems {
                        id
                        productId
                        name
                        imageUrl
                        quantity
                        unitPrice
                        selectedOptions {
                            id
                            optionGroupId
                            optionGroupName
                            optionId
                            optionName
                            priceAtOrder
                        }
                    }
                }
            }
        }
    }
`);

export const ORDER_DRIVER_LIVE_TRACKING = graphql(`
    subscription OrderDriverLiveTracking($orderId: ID!) {
        orderDriverLiveTracking(orderId: $orderId) {
            orderId
            driverId
            latitude
            longitude
            navigationPhase
            remainingEtaSeconds
            etaUpdatedAt
        }
    }
`);
