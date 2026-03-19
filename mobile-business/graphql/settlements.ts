import { gql } from '@apollo/client';

export const GET_MY_BUSINESS_SETTLEMENTS = gql`
    query GetMyBusinessSettlements(
        $businessId: ID!
        $status: SettlementStatus
        $direction: SettlementDirection
        $startDate: Date
        $endDate: Date
        $limit: Int
        $offset: Int
    ) {
        settlements(
            type: BUSINESS
            businessId: $businessId
            status: $status
            direction: $direction
            startDate: $startDate
            endDate: $endDate
            limit: $limit
            offset: $offset
        ) {
            id
            amount
            currency
            status
            direction
            paidAt
            paymentReference
            paymentMethod
            createdAt
            order {
                id
                displayId
                orderPrice
                deliveryPrice
                originalPrice
                originalDeliveryPrice
                totalPrice
                orderDate
                status
                orderPromotions {
                    id
                    appliesTo
                    discountAmount
                }
                businesses {
                    business {
                        id
                        name
                    }
                    items {
                        id
                        name
                        quantity
                        unitPrice
                        basePrice
                        notes
                        selectedOptions {
                            optionGroupName
                            optionName
                            priceAtOrder
                        }
                        childItems {
                            id
                            name
                            quantity
                            unitPrice
                        }
                    }
                }
            }
        }
    }
`;

export const GET_MY_BUSINESS_SETTLEMENT_SUMMARY = gql`
    query GetMyBusinessSettlementSummary($businessId: ID!, $startDate: Date, $endDate: Date) {
        settlementSummary(
            type: BUSINESS
            businessId: $businessId
            startDate: $startDate
            endDate: $endDate
        ) {
            totalAmount
            totalPending
            totalPaid
            totalReceivable
            totalPayable
            count
            pendingCount
        }
    }
`;

export const GET_LAST_BUSINESS_PAID_SETTLEMENT = gql`
    query GetLastBusinessPaidSettlement($businessId: ID!) {
        settlements(
            type: BUSINESS
            businessId: $businessId
            status: PAID
            limit: 1
        ) {
            id
            paidAt
            createdAt
        }
    }
`;

export const GET_MY_SETTLEMENT_REQUESTS = gql`
    query GetMySettlementRequests($businessId: ID, $status: SettlementRequestStatus, $limit: Int) {
        settlementRequests(businessId: $businessId, status: $status, limit: $limit) {
            id
            amount
            currency
            periodStart
            periodEnd
            note
            status
            expiresAt
            createdAt
            requestedBy {
                id
                firstName
                lastName
            }
            respondedAt
            disputeReason
        }
    }
`;

export const RESPOND_TO_SETTLEMENT_REQUEST = gql`
    mutation RespondToSettlementRequest(
        $requestId: ID!
        $action: SettlementRequestAction!
        $disputeReason: String
    ) {
        respondToSettlementRequest(
            requestId: $requestId
            action: $action
            disputeReason: $disputeReason
        ) {
            id
            status
            respondedAt
            disputeReason
        }
    }
`;
