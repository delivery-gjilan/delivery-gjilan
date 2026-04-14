import { graphql } from '@/gql';

export const VALIDATE_PROMOTIONS = graphql(`
    query ValidatePromotions($cart: CartContextInput!, $manualCode: String) {
        validatePromotions(cart: $cart, manualCode: $manualCode) {
            totalDiscount
            freeDeliveryApplied
            finalSubtotal
            finalDeliveryPrice
            finalTotal
            promotions {
                id
                name
                code
                type
                target
                appliedAmount
                freeDelivery
                priority
            }
        }
    }
`);
export const GET_APPLICABLE_PROMOTIONS = graphql(`
    query GetApplicablePromotions($cart: CartContextInput!, $manualCode: String) {
        getApplicablePromotions(cart: $cart, manualCode: $manualCode) {
            id
            name
            code
            type
            target
            appliedAmount
            freeDelivery
            priority
        }
    }
`);
export const GET_PROMOTION_THRESHOLDS = graphql(`
    query GetPromotionThresholds($cart: CartContextInput!) {
        getPromotionThresholds(cart: $cart) {
            id
            name
            code
            spendThreshold
            eligibleBusinessIds
            priority
            isActive
        }
    }
`);
export const GET_ACTIVE_GLOBAL_PROMOTIONS = graphql(`
    query GetActiveGlobalPromotions {
        getActiveGlobalPromotions {
            id
            name
            description
            type
            target
            discountValue
            spendThreshold
            isActive
        }
    }
`);
export const GET_USER_PROMOTIONS = graphql(`
    query GetUserPromotions($userId: ID!) {
        getUserPromotions(userId: $userId) {
            id
            userId
            usageCount
            expiresAt
            promotion {
                id
                name
                code
                type
                target
                discountValue
                spendThreshold
                maxUsagePerUser
                maxGlobalUsage
                isActive
                endsAt
            }
        }
    }
`);