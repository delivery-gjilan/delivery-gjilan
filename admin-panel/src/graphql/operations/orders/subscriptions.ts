import { gql } from '@apollo/client';

export const ORDERS_SUBSCRIPTION = gql`
    subscription OrdersUpdated($token: String!) {
        userOrdersUpdated(input: { token: $token }) {
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

export const ALL_ORDERS_SUBSCRIPTION = gql`
    subscription AllOrdersUpdated {
        allOrdersUpdated {
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
