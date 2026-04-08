import { gql } from '@apollo/client';

export const GET_ORDERS = gql`
    query GetOrders($limit: Int, $offset: Int) {
        orders(limit: $limit, offset: $offset) {
            totalCount
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
                approvalReasons
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
    }
`;

export const GET_ORDER = gql`
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
            approvalReasons
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
            paymentCollection
            orderPromotions {
                id
                promotionId
                appliesTo
                discountAmount
                promoCode
            }
        }
    }
`;

export const GET_ORDERS_BY_STATUS = gql`
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
`;

export const GET_ORDER_DRIVER = gql`
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
`;

export const UNCOMPLETED_ORDERS = gql`
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
            outForDeliveryAt
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
`;

export const GET_PRIORITY_SURCHARGE_AMOUNT = gql`
    query GetPrioritySurchargeAmount {
        prioritySurchargeAmount
    }
`;
