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
                        name
                    }
                }
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
