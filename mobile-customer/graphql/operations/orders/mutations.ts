import { graphql } from '@/gql';

export const CREATE_ORDER = graphql(`
    mutation CreateOrder($input: CreateOrderInput!) {
        createOrder(input: $input) {
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
                    businessType
                    isActive
                    isOpen
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

export const UPDATE_ORDER_STATUS = graphql(`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
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

export const CANCEL_ORDER = graphql(`
    mutation CancelOrder($id: ID!) {
        cancelOrder(id: $id) {
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
