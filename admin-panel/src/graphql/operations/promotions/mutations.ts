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
            scheduleType
            scheduleTimezone
            dailyStartTime
            dailyEndTime
            activeWeekdays
            newUserWindowDays
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
            scheduleType
            scheduleTimezone
            dailyStartTime
            dailyEndTime
            activeWeekdays
            newUserWindowDays
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

export const CREATE_PROMOTION_AUDIENCE_GROUP = graphql(`
    mutation CreatePromotionAudienceGroup($input: CreatePromotionAudienceGroupInput!) {
        createPromotionAudienceGroup(input: $input) {
            id
            name
            description
            isActive
            memberCount
            members {
                id
                firstName
                lastName
                email
            }
            createdAt
            updatedAt
        }
    }
`);

export const UPDATE_PROMOTION_AUDIENCE_GROUP = graphql(`
    mutation UpdatePromotionAudienceGroup($input: UpdatePromotionAudienceGroupInput!) {
        updatePromotionAudienceGroup(input: $input) {
            id
            name
            description
            isActive
            memberCount
            members {
                id
                firstName
                lastName
                email
            }
            createdAt
            updatedAt
        }
    }
`);

export const DELETE_PROMOTION_AUDIENCE_GROUP = graphql(`
    mutation DeletePromotionAudienceGroup($id: ID!) {
        deletePromotionAudienceGroup(id: $id)
    }
`);

