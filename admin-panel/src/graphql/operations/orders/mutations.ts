import { gql } from '@apollo/client';

export const UPDATE_ORDER_STATUS = gql`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            status
            user {
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

export const CANCEL_ORDER = gql`
    mutation CancelOrder($id: ID!) {
        cancelOrder(id: $id) {
            id
            status
        }
    }
`;

export const ASSIGN_DRIVER_TO_ORDER = gql`
    mutation AssignDriverToOrder($id: ID!, $driverId: ID) {
        assignDriverToOrder(id: $id, driverId: $driverId) {
            id
            driver {
                id
                firstName
                lastName
                email
            }
            status
        }
    }
`;
