import { graphql } from '@/gql';

export const GET_MY_INVENTORY = graphql(`
    query MyInventory($businessId: ID!) {
        myInventory(businessId: $businessId) {
            id
            productId
            productName
            productImageUrl
            productBasePrice
            productMarkupPrice
            productNightPrice
            categoryName
            quantity
            lowStockThreshold
            costPrice
            isLowStock
            updatedAt
        }
    }
`);

export const GET_INVENTORY_SUMMARY = graphql(`
    query InventorySummary($businessId: ID!) {
        inventorySummary(businessId: $businessId) {
            totalTrackedProducts
            totalStockValue
            lowStockCount
            outOfStockCount
        }
    }
`);

export const GET_ORDER_COVERAGE = graphql(`
    query OrderCoverage($orderId: ID!) {
        orderCoverage(orderId: $orderId) {
            orderId
            items {
                productId
                productName
                productImageUrl
                orderedQty
                fromStock
                fromMarket
                status
                deducted
            }
            totalItems
            fullyOwnedCount
            partiallyOwnedCount
            marketOnlyCount
            allFromStock
            allFromMarket
            deducted
        }
    }
`);

export const GET_INVENTORY_EARNINGS = graphql(`
    query InventoryEarnings($businessId: ID!, $startDate: String, $endDate: String) {
        inventoryEarnings(businessId: $businessId, startDate: $startDate, endDate: $endDate) {
            totalRevenue
            totalCost
            totalProfit
            averageMargin
            totalUnitsSold
            orderCount
            products {
                productId
                productName
                productImageUrl
                unitsSold
                revenue
                cost
                profit
                margin
            }
        }
    }
`);
