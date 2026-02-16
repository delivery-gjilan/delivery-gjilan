import { graphql } from '@/gql';

export const CREATE_PROMOTION_V2 = graphql(`
    mutation CreatePromotionV2($input: CreatePromotionV2Input!) {
        createPromotionV2(input: $input) {
            id
            name
            description
            code
            type
            target
            discountValue
            maxDiscountCap
            minOrderAmount
            spendThreshold
            thresholdReward
            maxGlobalUsage
            currentGlobalUsage
            maxUsagePerUser
            isStackable
            priority
            isActive
            startsAt
            endsAt
            createdAt
        }
    }
`);

export const UPDATE_PROMOTION_V2 = graphql(`
    mutation UpdatePromotionV2($input: UpdatePromotionV2Input!) {
        updatePromotionV2(input: $input) {
            id
            name
            description
            code
            type
            target
            discountValue
            maxDiscountCap
            minOrderAmount
            spendThreshold
            thresholdReward
            maxGlobalUsage
            currentGlobalUsage
            maxUsagePerUser
            isStackable
            priority
            isActive
            startsAt
            endsAt
            createdAt
        }
    }
`);

export const DELETE_PROMOTION_V2 = graphql(`
    mutation DeletePromotionV2($id: ID!) {
        deletePromotionV2(id: $id)
    }
`);

// Legacy aliases for backward compatibility
export const CREATE_PROMOTION = CREATE_PROMOTION_V2;
export const UPDATE_PROMOTION = UPDATE_PROMOTION_V2;
export const DELETE_PROMOTION = DELETE_PROMOTION_V2;
