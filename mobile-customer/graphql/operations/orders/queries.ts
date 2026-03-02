import { graphql } from '@/gql';

export const GET_ORDERS = graphql(`
    query GetOrders {
        orders {
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

export const GET_ORDER = graphql(`
    query GetOrder($id: ID!) {
        order(id: $id) {
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
