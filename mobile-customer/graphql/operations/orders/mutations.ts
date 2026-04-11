import { gql } from '@apollo/client';

export const CREATE_ORDER = gql`
    mutation CreateOrder($input: CreateOrderInput!) {
        createOrder(input: $input) {
            id
            displayId
            orderPrice
            deliveryPrice
            totalPrice
            orderDate
            status
            approvalReasons
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
                    id
                    productId
                    name
                    imageUrl
                    quantity
                    unitPrice
                    parentOrderItemId
                    selectedOptions {
                        id
                        optionGroupId
                        optionGroupName
                        optionId
                        optionName
                        priceAtOrder
                    }
                    childItems {
                        id
                        productId
                        name
                        imageUrl
                        quantity
                        unitPrice
                        selectedOptions {
                            id
                            optionGroupId
                            optionGroupName
                            optionId
                            optionName
                            priceAtOrder
                        }
                    }
                }
            }
        }
    }
`;

export const UPDATE_ORDER_STATUS = gql`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            displayId
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
                    id
                    productId
                    name
                    imageUrl
                    quantity
                    unitPrice
                    parentOrderItemId
                    selectedOptions {
                        id
                        optionGroupId
                        optionGroupName
                        optionId
                        optionName
                        priceAtOrder
                    }
                    childItems {
                        id
                        productId
                        name
                        imageUrl
                        quantity
                        unitPrice
                        selectedOptions {
                            id
                            optionGroupId
                            optionGroupName
                            optionId
                            optionName
                            priceAtOrder
                        }
                    }
                }
            }
        }
    }
`;

export const CANCEL_ORDER = gql`
    mutation CancelOrder($id: ID!) {
        cancelOrder(id: $id) {
            id
            displayId
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
                    id
                    productId
                    name
                    imageUrl
                    quantity
                    unitPrice
                    parentOrderItemId
                    selectedOptions {
                        id
                        optionGroupId
                        optionGroupName
                        optionId
                        optionName
                        priceAtOrder
                    }
                    childItems {
                        id
                        productId
                        name
                        imageUrl
                        quantity
                        unitPrice
                        selectedOptions {
                            id
                            optionGroupId
                            optionGroupName
                            optionId
                            optionName
                            priceAtOrder
                        }
                    }
                }
            }
        }
    }
`;

export const SUBMIT_ORDER_REVIEW = gql`
    mutation SubmitOrderReview($orderId: ID!, $rating: Int!, $comment: String, $quickFeedback: [String!]) {
        submitOrderReview(orderId: $orderId, rating: $rating, comment: $comment, quickFeedback: $quickFeedback) {
            id
            orderId
            businessId
            userId
            rating
            comment
            quickFeedback
            createdAt
            updatedAt
        }
    }
`;
