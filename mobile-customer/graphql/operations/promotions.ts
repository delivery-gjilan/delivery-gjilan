import { gql } from '@apollo/client';

export const VALIDATE_PROMOTIONS = gql`
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
`;

export const GET_APPLICABLE_PROMOTIONS = gql`
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
`;

export const GET_PROMOTION_THRESHOLDS = gql`
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
`;

export const GET_ACTIVE_GLOBAL_PROMOTIONS = gql`
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
`;
