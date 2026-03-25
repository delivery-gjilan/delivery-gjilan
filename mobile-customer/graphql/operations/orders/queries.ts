import { graphql } from '@/gql';

export const GET_ORDERS = graphql(`
    query GetOrders {
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
                    isActive
                    location {
                        latitude
                        longitude
                        address
                    }
                    workingHours {
                        opensAt
                        closesAt
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

export const GET_ORDER = graphql(`
    query GetOrder($id: ID!) {
        order(id: $id) {
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
            outForDeliveryAt
            deliveredAt
            driverNotes
            dropOffLocation {
                latitude
                longitude
                address
            }
            pickupLocations {
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
                    isActive
                    location {
                        latitude
                        longitude
                        address
                    }
                    workingHours {
                        opensAt
                        closesAt
                    }
                    createdAt
                    updatedAt
                    isOpen
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
            originalPrice
            originalDeliveryPrice
            paymentCollection
            orderPromotions {
                id
                promotionId
                appliesTo
                discountAmount
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
            totalPrice
            orderDate
            updatedAt
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
                    isActive
                    location {
                        latitude
                        longitude
                        address
                    }
                    workingHours {
                        opensAt
                        closesAt
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

export const GET_ORDER_DRIVER = graphql(`
    query GetOrderDriver($id: ID!) {
        order(id: $id) {
            id
            status
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
        }
    }
`);

export const UNCOMPLETED_ORDERS = graphql(`
    query UncompletedOrders {
        uncompletedOrders {
            id
            displayId
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            updatedAt
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
