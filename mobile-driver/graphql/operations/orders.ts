import { graphql } from '@/gql';

export const GET_ORDERS = graphql(`
    query GetOrders {
        orders {
            orders {
                id
                displayId
                channel
                recipientPhone
                recipientName
                orderDate
                status
                preparationMinutes
                estimatedReadyAt
                preparingAt
                orderPrice
                deliveryPrice
                totalPrice
                inventoryPrice
                driverTip
                cashToCollect
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
                        inventoryQuantity
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
    }
`);
export const GET_ORDER = graphql(`
    query GetOrder($id: ID!) {
        order(id: $id) {
            id
            displayId
            channel
            recipientPhone
            recipientName
            orderDate
            status
            orderPrice
            deliveryPrice
            totalPrice
            driverTip
            cashToCollect
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
                    inventoryQuantity
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
`);
export const ASSIGN_DRIVER_TO_ORDER = graphql(`
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
`);
export const UPDATE_ORDER_STATUS = graphql(`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            status
        }
    }
`);
export const DRIVER_NOTIFY_CUSTOMER = graphql(`
    mutation DriverNotifyCustomer($orderId: ID!, $kind: DriverCustomerNotificationKind!) {
        driverNotifyCustomer(orderId: $orderId, kind: $kind)
    }
`);
export const ALL_ORDERS_UPDATED = graphql(`
    subscription AllOrdersUpdated {
        allOrdersUpdated {
            id
            displayId
            channel
            recipientPhone
            recipientName
            orderDate
            status
            preparationMinutes
            estimatedReadyAt
            preparingAt
            orderPrice
            deliveryPrice
            totalPrice
            driverTip
            cashToCollect
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
                    inventoryQuantity
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
`);
export const ORDER_STATUS_UPDATED = graphql(`
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
`);