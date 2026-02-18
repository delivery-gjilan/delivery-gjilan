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
