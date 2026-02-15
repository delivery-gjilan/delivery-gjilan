import { graphql } from '@/gql';

export const ORDERS_SUBSCRIPTION = graphql(`
    subscription OrdersUpdated($token: String!) {
        userOrdersUpdated(input: { token: $token }) {
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

export const ALL_ORDERS_SUBSCRIPTION = graphql(`
    subscription AllOrdersUpdated {
        allOrdersUpdated {
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
