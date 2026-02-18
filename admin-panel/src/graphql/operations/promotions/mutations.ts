import { graphql } from '@/gql';

export const CREATE_PROMOTION = graphql(`
    mutation CreatePromotion($input: CreatePromotionInput!) {
        createPromotion(input: $input) {
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

export const UPDATE_PROMOTION = graphql(`
    mutation UpdatePromotion($input: UpdatePromotionInput!) {
        updatePromotion(input: $input) {
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

export const DELETE_PROMOTION = graphql(`
    mutation DeletePromotion($id: ID!) {
        deletePromotion(id: $id)
    }
`);
