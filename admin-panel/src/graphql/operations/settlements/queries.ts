import { graphql } from '@/gql';

export const GET_SETTLEMENTS = graphql(`
    query GetSettlements(
        $type: SettlementType
        $status: SettlementStatus
        $direction: SettlementDirection
        $driverId: ID
        $businessId: ID
        $startDate: Date
        $endDate: Date
        $limit: Int
        $offset: Int
    ) {
        settlements(
            type: $type
            status: $status
            direction: $direction
            driverId: $driverId
            businessId: $businessId
            startDate: $startDate
            endDate: $endDate
            limit: $limit
            offset: $offset
        ) {
            id
            type
            direction
            driver {
                id
                firstName
                lastName
                phoneNumber
            }
            business {
                id
                name
            }
            order {
                id
                orderPrice
                deliveryPrice
                totalPrice
            }
            amount
            currency
            status
            paidAt
            paymentReference
            paymentMethod
            ruleId
            createdAt
        }
    }
`);

export const GET_SETTLEMENT_SUMMARY = graphql(`
    query GetSettlementSummary(
        $type: SettlementType
        $driverId: ID
        $businessId: ID
        $startDate: Date
        $endDate: Date
    ) {
        settlementSummary(
            type: $type
            driverId: $driverId
            businessId: $businessId
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
`);

export const GET_DRIVER_BALANCE = graphql(`
    query GetDriverBalance($driverId: ID!) {
        driverBalance(driverId: $driverId) {
            totalAmount
            totalPending
            totalPaid
            count
            pendingCount
        }
    }
`);

export const GET_BUSINESS_BALANCE = graphql(`
    query GetBusinessBalance($businessId: ID!) {
        businessBalance(businessId: $businessId) {
            totalAmount
            totalPending
            totalPaid
            count
            pendingCount
        }
    }
`);

export const GET_DRIVERS_WITH_BALANCE = graphql(`
    query GetDriversWithBalance {
        drivers {
            id
            firstName
            lastName
            phoneNumber
            commissionPercentage
        }
    }
`);

export const GET_BUSINESSES_WITH_BALANCE = graphql(`
    query GetBusinessesWithBalance {
        businesses {
            id
            name
            businessType
            commissionPercentage
        }
    }
`);

export const MARK_SETTLEMENT_PAID = graphql(`
    mutation MarkSettlementAsPaid($settlementId: ID!) {
        markSettlementAsPaid(settlementId: $settlementId) {
            id
            status
            paidAt
        }
    }
`);

export const MARK_SETTLEMENTS_PAID = graphql(`
    mutation MarkSettlementsAsPaid($ids: [ID!]!) {
        markSettlementsAsPaid(ids: $ids) {
            id
            status
            paidAt
        }
    }
`);

export const MARK_SETTLEMENT_PARTIAL = graphql(`
    mutation MarkSettlementAsPartiallyPaid($settlementId: ID!, $amount: Float!) {
        markSettlementAsPartiallyPaid(settlementId: $settlementId, amount: $amount) {
            id
            amount
            status
            paidAt
            updatedAt
        }
    }
`);

export const BACKFILL_SETTLEMENTS = graphql(`
    mutation BackfillSettlementsForDeliveredOrders {
        backfillSettlementsForDeliveredOrders
    }
`);

export const UNSETTLE_SETTLEMENT = graphql(`
    mutation UnsettleSettlement($settlementId: ID!) {
        unsettleSettlement(settlementId: $settlementId) {
            id
            status
            paidAt
            amount
        }
    }
`);
