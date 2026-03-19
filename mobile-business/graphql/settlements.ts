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
                totalPrice
                orderDate
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
