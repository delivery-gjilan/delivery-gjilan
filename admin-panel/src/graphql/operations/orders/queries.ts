import { gql } from '@apollo/client';

export const GET_ORDERS = gql`
    query GetOrders {
        orders {
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
`;

export const GET_ORDER = gql`
    query GetOrder($id: ID!) {
        order(id: $id) {
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
`;

export const GET_ORDERS_BY_STATUS = gql`
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
                    businessType
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
`;
