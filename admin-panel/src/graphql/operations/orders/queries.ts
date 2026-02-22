import { graphql } from '@/gql';

export const GET_ORDERS = graphql(`
    query GetOrders {
        orders {
            id
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            updatedAt
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
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
                    price
                    quantityInStock
                    quantityNeeded
                }
            }
        }
    }
`);

export const GET_ORDER = graphql(`
    query GetOrder($id: ID!) {
        order(id: $id) {
            id
            orderPrice
            deliveryPrice
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
                    price
                    quantityInStock
                    quantityNeeded
                }
            }
        }
    }
`);

export const GET_ORDERS_BY_STATUS = graphql(`
    query GetOrdersByStatus($status: OrderStatus!) {
        ordersByStatus(status: $status) {
            id
            orderPrice
            deliveryPrice
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
                    price
                }
            }
        }
    }
`);
