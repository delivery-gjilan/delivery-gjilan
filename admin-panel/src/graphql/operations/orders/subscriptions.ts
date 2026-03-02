import { gql } from '@apollo/client';

export const ORDERS_SUBSCRIPTION = gql(`
    subscription OrdersUpdated($token: String!) {
        userOrdersUpdated(input: { token: $token }) {
            id
            displayId
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

export const ALL_ORDERS_SUBSCRIPTION = gql(`
    subscription AllOrdersUpdated {
        allOrdersUpdated {
            id
            displayId
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
                    businessType
                    phoneNumber
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
