import { graphql } from '@/gql';

export const GET_MY_DRIVER_METRICS = graphql(`
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
`);
export const GET_MY_SETTLEMENTS = graphql(`
    query GetMySettlements($status: SettlementStatus, $direction: SettlementDirection, $category: String, $startDate: Date, $endDate: Date, $limit: Int, $offset: Int) {
        settlements(
            type: DRIVER
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
                promotion {
                    id
                }
            }
        }
    }
`);
export const GET_MY_SETTLEMENT_SUMMARY = graphql(`
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
`);
export const GET_DRIVER_CASH_SUMMARY = graphql(`
    query GetDriverCashSummary($startDate: Date, $endDate: Date) {
        driverCashSummary(startDate: $startDate, endDate: $endDate) {
            cashCollected
            totalDeliveries
            youOwePlatform
            platformOwesYou
            netSettlement
            takeHome
            lastPaidDate
        }
    }
`);
export const GET_SETTLEMENT_BREAKDOWN = graphql(`
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
`);
export const GET_MY_SETTLEMENT_REQUESTS = graphql(`
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
`);
export const GET_DRIVER_ORDER_FINANCIALS = graphql(`
    query GetDriverOrderFinancials($orderId: ID!) {
        driverOrderFinancials(orderId: $orderId) {
            orderId
            paymentCollection
            amountToCollectFromCustomer
            amountToRemitToPlatform
            driverNetEarnings
            driverTip
        }
        order(id: $orderId) {
            id
            displayId
            status
            paymentCollection
            orderDate
            deliveryPrice
            totalPrice
            prioritySurcharge
            driverTip
            orderPrice
            preparingAt
            readyAt
            outForDeliveryAt
            deliveredAt
            driverAssignedAt
            dropOffLocation {
                address
                latitude
                longitude
            }
            pickupLocations {
                address
            }
            driverNotes
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
                    inventoryQuantity
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
            orderPromotions {
                appliesTo
                discountAmount
                promoCode
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