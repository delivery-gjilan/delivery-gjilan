import { graphql } from '@/gql';

export const SET_INVENTORY_QUANTITY = graphql(`
    mutation SetInventoryQuantity($input: SetInventoryQuantityInput!) {
        setInventoryQuantity(input: $input) {
            id
            productId
            productName
            productImageUrl
            productBasePrice
            categoryName
            quantity
            lowStockThreshold
            costPrice
            isLowStock
            updatedAt
        }
    }
`);

export const BULK_SET_INVENTORY = graphql(`
    mutation BulkSetInventory($input: BulkSetInventoryInput!) {
        bulkSetInventory(input: $input) {
            id
            productId
            productName
            quantity
            costPrice
            isLowStock
        }
    }
`);

export const DEDUCT_ORDER_STOCK = graphql(`
    mutation DeductOrderStock($orderId: ID!) {
        deductOrderStock(orderId: $orderId) {
            orderId
            items {
                productId
                productName
                orderedQty
                fromStock
                fromMarket
                status
                deducted
            }
            deducted
        }
    }
`);

export const REMOVE_INVENTORY_ITEM = graphql(`
    mutation RemoveInventoryItem($businessId: ID!, $productId: ID!) {
        removeInventoryItem(businessId: $businessId, productId: $productId)
    }
`);
