import { gql } from '@apollo/client';

export const GET_ORDERS = gql`
    query GetOrders {
        orders {
            id
            orderDate
            status
            orderPrice
            deliveryPrice
            totalPrice
            dropOffLocation {
                latitude
                longitude
                address
            }
            businesses {
                business {
                    id
                    name
                    location {
                        latitude
                        longitude
                        address
                    }
                }
                items {
                    name
                    quantity
                }
            }
            user {
                id
                firstName
                lastName
                phoneNumber
            }
            driver {
                id
                firstName
                lastName
            }
        }
    }
`;

export const GET_ORDER = gql`
    query GetOrder($id: ID!) {
        order(id: $id) {
            id
            orderDate
            status
            orderPrice
            deliveryPrice
            totalPrice
            dropOffLocation {
                latitude
                longitude
                address
            }
            businesses {
                business {
                    id
                    name
                    location {
                        latitude
                        longitude
                        address
                    }
                }
                items {
                    name
                    quantity
                }
            }
            user {
                id
                firstName
                lastName
                phoneNumber
            }
            driver {
                id
                firstName
                lastName
            }
        }
    }
`;

export const ASSIGN_DRIVER_TO_ORDER = gql`
    mutation AssignDriverToOrder($id: ID!, $driverId: ID) {
        assignDriverToOrder(id: $id, driverId: $driverId) {
            id
            status
            driver {
                id
                firstName
                lastName
            }
        }
    }
`;

export const UPDATE_ORDER_STATUS = gql`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            status
        }
    }
`;

export const ALL_ORDERS_UPDATED = gql`
    subscription AllOrdersUpdated {
        allOrdersUpdated {
            id
            orderDate
            status
            orderPrice
            deliveryPrice
            totalPrice
            dropOffLocation {
                latitude
                longitude
                address
            }
            businesses {
                business {
                    id
                    name
                    location {
                        latitude
                        longitude
                        address
                    }
                }
                items {
                    name
                    quantity
                }
            }
            user {
                id
                firstName
                lastName
                phoneNumber
            }
            driver {
                id
                firstName
                lastName
            }
        }
    }
`;
