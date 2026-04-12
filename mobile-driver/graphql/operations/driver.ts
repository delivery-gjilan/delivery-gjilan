import { gql } from '@apollo/client';

export const GET_MY_DRIVER_METRICS = gql`
    query GetMyDriverMetrics {
        myDriverMetrics {
            activeOrdersCount
            maxActiveOrders
            deliveredTodayCount
            grossEarningsToday
            commissionPercentage
            netEarningsToday
            isOnline
            connectionStatus
        }
    }
`;

export const GET_MY_SETTLEMENTS = gql`
    query GetMySettlements($status: SettlementStatus, $startDate: Date, $endDate: Date, $limit: Int, $offset: Int) {
        settlements(
            type: DRIVER
            status: $status
            startDate: $startDate
            endDate: $endDate
            limit: $limit
            offset: $offset
        ) {
            id
            amount
            status
            direction
            reason
            paidAt
            createdAt
            order {
                id
                deliveryPrice
                orderDate
                dropOffLocation {
                    address
                }
                businesses {
                    business {
                        id
                        name
                    }
                }
            }
            rule {
                id
                name
                type
                direction
            }
        }
    }
`;

export const GET_MY_SETTLEMENT_SUMMARY = gql`
    query GetMySettlementSummary($startDate: Date, $endDate: Date) {
        settlementSummary(
            type: DRIVER
            startDate: $startDate
            endDate: $endDate
        ) {
            totalAmount
            totalPending
            totalPaid
            count
            pendingCount
        }
    }
`;

export const GET_DRIVER_CASH_SUMMARY = gql`
    query GetDriverCashSummary($startDate: Date, $endDate: Date) {
        driverCashSummary(startDate: $startDate, endDate: $endDate) {
            cashCollected
            totalDeliveries
            youOwePlatform
            platformOwesYou
            netSettlement
            takeHome
        }
    }
`;

export const GET_SETTLEMENT_BREAKDOWN = gql`
    query GetSettlementBreakdown($isSettled: Boolean, $startDate: Date, $endDate: Date) {
        settlementBreakdown(
            type: DRIVER
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
`;

export const GET_MY_SETTLEMENT_REQUESTS = gql`
    query GetMyDriverSettlementRequests($status: SettlementRequestStatus, $limit: Int) {
        settlementRequests(status: $status, limit: $limit) {
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
`;

export const RESPOND_TO_SETTLEMENT_REQUEST = gql`
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
`;
