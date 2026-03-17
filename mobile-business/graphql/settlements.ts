import { gql } from '@apollo/client';

export const GET_MY_BUSINESS_SETTLEMENTS = gql`
    query GetMyBusinessSettlements($businessId: ID!, $status: SettlementStatus, $startDate: Date, $endDate: Date, $limit: Int, $offset: Int) {
        settlements(
            type: BUSINESS
            businessId: $businessId
            status: $status
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
                orderPrice
                deliveryPrice
                totalPrice
                orderDate
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
