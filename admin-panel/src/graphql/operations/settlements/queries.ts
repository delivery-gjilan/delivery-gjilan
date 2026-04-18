import { graphql } from '@/gql';

export const GET_SETTLEMENTS_PAGE = graphql(`
    query SettlementsPage(
        $type: SettlementType
        $direction: SettlementDirection
        $isSettled: Boolean
        $driverId: ID
        $businessId: ID
        $orderId: ID
        $promotionId: ID
        $category: String
        $startDate: Date
        $endDate: Date
        $limit: Int
        $offset: Int
    ) {
        settlements(
            type: $type
            direction: $direction
            isSettled: $isSettled
            driverId: $driverId
            businessId: $businessId
            orderId: $orderId
            promotionId: $promotionId
            category: $category
            startDate: $startDate
            endDate: $endDate
            limit: $limit
            offset: $offset
        ) {
            id
            type
            direction
            isSettled
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
                displayId
                orderDate
                status
                deliveryPrice
                totalPrice
            }
            amount
            currency
            status
            ruleId
            createdAt
        }
    }
`);

export const GET_SETTLEMENT_SUMMARY = graphql(`
    query GetSettlementSummary(
        $type: SettlementType
        $direction: SettlementDirection
        $isSettled: Boolean
        $driverId: ID
        $businessId: ID
        $orderId: ID
        $promotionId: ID
        $startDate: Date
        $endDate: Date
    ) {
        settlementSummary(
            type: $type
            direction: $direction
            isSettled: $isSettled
            driverId: $driverId
            businessId: $businessId
            orderId: $orderId
            promotionId: $promotionId
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
            isSettled
            amount
        }
    }
`);

export const MARK_SETTLEMENTS_PAID_OP = graphql(`
    mutation MarkSettlementsAsPaid($ids: [ID!]!) {
        markSettlementsAsPaid(ids: $ids) {
            id
            isSettled
        }
    }
`);

export const MARK_SETTLEMENT_PARTIAL = graphql(`
    mutation MarkSettlementAsPartiallyPaid($settlementId: ID!, $amount: Float!) {
        markSettlementAsPartiallyPaid(settlementId: $settlementId, amount: $amount) {
            id
            amount
            isSettled
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

export const CREATE_SETTLEMENT_REQUEST = graphql(`
    mutation CreateSettlementRequest(
        $businessId: ID
        $driverId: ID
        $amount: Float!
        $note: String
    ) {
        createSettlementRequest(
            businessId: $businessId
            driverId: $driverId
            amount: $amount
            note: $note
        ) {
            id
            entityType
            status
            amount
            note
            createdAt
        }
    }
`);

export const GET_SETTLEMENT_REQUESTS = graphql(`
    query GetSettlementRequests($businessId: ID, $driverId: ID, $entityType: SettlementType, $status: SettlementRequestStatus, $limit: Int) {
        settlementRequests(businessId: $businessId, driverId: $driverId, entityType: $entityType, status: $status, limit: $limit) {
            id
            entityType
            amount
            note
            status
            reason
            createdAt
            respondedAt
            business {
                id
                name
            }
            driver {
                id
                firstName
                lastName
            }
            respondedBy {
                id
                firstName
                lastName
            }
            settlementPayment {
                id
                amount
                direction
                createdAt
            }
        }
    }
`);

export const SETTLE_WITH_DRIVER = graphql(`
    mutation SettleWithDriver(
        $driverId: ID!
        $amount: Float
        $paymentMethod: String
        $paymentReference: String
        $note: String
    ) {
        settleWithDriver(
            driverId: $driverId
            amount: $amount
            paymentMethod: $paymentMethod
            paymentReference: $paymentReference
            note: $note
        ) {
            payment {
                id
                amount
                direction
                totalBalanceAtTime
                createdAt
            }
            settledCount
            netAmount
            direction
            remainderAmount
            remainderSettlement {
                id
                amount
                direction
            }
        }
    }
`);

export const SETTLE_WITH_BUSINESS = graphql(`
    mutation SettleWithBusiness(
        $businessId: ID!
        $amount: Float!
        $paymentMethod: String
        $paymentReference: String
        $note: String
    ) {
        settleWithBusiness(
            businessId: $businessId
            amount: $amount
            paymentMethod: $paymentMethod
            paymentReference: $paymentReference
            note: $note
        ) {
            payment {
                id
                amount
                direction
                totalBalanceAtTime
                createdAt
            }
            settledCount
            netAmount
            direction
            remainderAmount
            remainderSettlement {
                id
                amount
                direction
            }
        }
    }
`);

export const GET_UNSETTLED_BALANCE = graphql(`
    query GetUnsettledBalance($entityType: SettlementType!, $entityId: ID!) {
        unsettledBalance(entityType: $entityType, entityId: $entityId)
    }
`);

export const GET_SETTLEMENT_PAYMENTS = graphql(`
    query GetSettlementPayments(
        $entityType: SettlementType
        $driverId: ID
        $businessId: ID
        $startDate: Date
        $endDate: Date
        $limit: Int
        $offset: Int
    ) {
        settlementPayments(
            entityType: $entityType
            driverId: $driverId
            businessId: $businessId
            startDate: $startDate
            endDate: $endDate
            limit: $limit
            offset: $offset
        ) {
            id
            entityType
            driver {
                id
                firstName
                lastName
            }
            business {
                id
                name
            }
            amount
            direction
            totalBalanceAtTime
            paymentMethod
            paymentReference
            note
            createdBy {
                id
                firstName
                lastName
            }
            createdAt
        }
    }
`);

export const GET_SETTLEMENT_BREAKDOWN = graphql(`
    query GetSettlementBreakdown(
        $type: SettlementType
        $businessId: ID
        $driverId: ID
        $isSettled: Boolean
        $startDate: Date
        $endDate: Date
    ) {
        settlementBreakdown(
            type: $type
            businessId: $businessId
            driverId: $driverId
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

export const GET_EARNINGS_TREND = graphql(`
    query GetEarningsTrend(
        $type: SettlementType
        $businessId: ID
        $driverId: ID
        $startDate: Date!
        $endDate: Date!
    ) {
        earningsTrend(
            type: $type
            businessId: $businessId
            driverId: $driverId
            startDate: $startDate
            endDate: $endDate
        ) {
            date
            receivable
            payable
            net
            count
        }
    }
`);

export const GET_BUSINESS_ORDER_FINANCIALS = graphql(`
    query GetBusinessOrderFinancials($orderId: ID!, $businessId: ID!) {
        businessOrderFinancials(orderId: $orderId, businessId: $businessId) {
            orderId
            paymentCollection
            businessPrice
            markupAmount
            customerPaid
            amountOwedToBusiness
            amountOwedByBusiness
            businessNetEarnings
        }
    }
`);
