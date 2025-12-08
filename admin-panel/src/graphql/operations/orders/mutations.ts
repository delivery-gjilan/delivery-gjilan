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
