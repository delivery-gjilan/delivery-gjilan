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

export const GRANT_FREE_DELIVERY = graphql(`
    mutation GrantFreeDelivery($userId: ID!, $orderId: ID!) {
        grantFreeDelivery(userId: $userId, orderId: $orderId)
    }
`);

export const ISSUE_RECOVERY_PROMOTION = graphql(`
    mutation IssueRecoveryPromotion($input: IssueRecoveryPromotionInput!) {
        issueRecoveryPromotion(input: $input) {
            id
            userId
            promotionId
            assignedAt
            expiresAt
            usageCount
        }
    }
`);

