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
