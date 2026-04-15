import { graphql } from '@/gql';

export const GET_MY_BUSINESS_SETTLEMENTS = graphql(`
    query GetMyBusinessSettlements(
        $businessId: ID!
        $status: SettlementStatus
        $direction: SettlementDirection
        $category: String
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
            category: $category
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
            rule {
                id
                name
                type
                direction
                promotion {
                    id
                }
            }
            order {
                id
                displayId
                orderPrice
                deliveryPrice
                originalPrice
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
`);

export const GET_MY_BUSINESS_SETTLEMENT_SUMMARY = graphql(`
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
`);

export const GET_LAST_BUSINESS_PAID_SETTLEMENT = graphql(`
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
`);

export const GET_MY_SETTLEMENT_REQUESTS = graphql(`
    query GetMySettlementRequests($businessId: ID, $status: SettlementRequestStatus, $limit: Int) {
        settlementRequests(businessId: $businessId, status: $status, limit: $limit) {
            id
            amount
            note
            status
            reason
            createdAt
            respondedAt
            settlementPayment {
                id
                amount
                direction
                createdAt
            }
        }
    }
`);

export const RESPOND_TO_SETTLEMENT_REQUEST = graphql(`
    mutation RespondToSettlementRequest(
        $requestId: ID!
        $action: SettlementRequestAction!
        $reason: String
    ) {
        respondToSettlementRequest(
            requestId: $requestId
            action: $action
            reason: $reason
        ) {
            id
            status
            respondedAt
            reason
        }
    }
`);

export const GET_BUSINESS_SETTLEMENT_BREAKDOWN = graphql(`
    query GetBusinessSettlementBreakdown(
        $businessId: ID
        $isSettled: Boolean
        $startDate: Date
        $endDate: Date
    ) {
        settlementBreakdown(
            type: BUSINESS
            businessId: $businessId
            isSettled: $isSettled
            startDate: $startDate
            endDate: $endDate
        ) {
            category
            label
            totalAmount
            count
            direction
        }
    }
`);
