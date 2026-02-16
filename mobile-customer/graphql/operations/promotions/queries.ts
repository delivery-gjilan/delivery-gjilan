import { graphql } from '@/gql';

export const VALIDATE_PROMOTION = graphql(`
    query ValidatePromotion($input: ValidatePromotionInput!) {
        validatePromotion(input: $input) {
            isValid
            reason
            discountAmount
            freeDeliveryApplied
            effectiveDeliveryPrice
            totalPrice
            promotion {
                id
                code
                name
                type
                value
            }
        }
    }
`);
