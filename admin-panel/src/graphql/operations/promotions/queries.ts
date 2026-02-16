import { graphql } from '@/gql';

export const GET_PROMOTIONS_V2 = graphql(`
    query GetPromotionsV2($isActive: Boolean) {
        getAllPromotionsV2(isActive: $isActive) {
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
        }
    }
`);

// Legacy alias for backward compatibility
export const GET_PROMOTIONS = GET_PROMOTIONS_V2;
