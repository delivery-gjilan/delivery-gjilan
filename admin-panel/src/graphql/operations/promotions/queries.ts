import { graphql } from '@/gql';

export const GET_PROMOTIONS = graphql(`
    query GetPromotions($isActive: Boolean) {
        getAllPromotions(isActive: $isActive) {
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
            totalUsageCount
            totalRevenue
            creatorType
            creatorId
        }
    }
`);

export const GET_PROMOTION = graphql(`
    query GetPromotion($id: ID!) {
        getPromotion(id: $id) {
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
            totalUsageCount
            totalRevenue
            creatorType
            creatorId
        }
    }
`);
