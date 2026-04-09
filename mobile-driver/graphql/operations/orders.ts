import { gql } from '@apollo/client';

export const GET_ORDERS = gql`
    query GetOrders {
        orders {
            id
            displayId
            orderDate
            status
            estimatedReadyAt
            orderPrice
            deliveryPrice
            totalPrice
            dropOffLocation {
                latitude
                longitude
                address
            }
            driverNotes
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
                    notes
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
            displayId
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
            driverNotes
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
                    notes
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

export const DRIVER_NOTIFY_CUSTOMER = gql`
    mutation DriverNotifyCustomer($orderId: ID!, $kind: DriverCustomerNotificationKind!) {
        driverNotifyCustomer(orderId: $orderId, kind: $kind)
    }
`;

export const ALL_ORDERS_UPDATED = gql`
    subscription AllOrdersUpdated {
        allOrdersUpdated {
            id
            displayId
            orderDate
            status
            estimatedReadyAt
            orderPrice
            deliveryPrice
            totalPrice
            dropOffLocation {
                latitude
                longitude
                address
            }
            driverNotes
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
                    notes
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

export const ORDER_STATUS_UPDATED = gql`
    subscription OrderStatusUpdated($orderId: ID!) {
        orderStatusUpdated(orderId: $orderId) {
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
