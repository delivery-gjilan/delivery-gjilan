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
            scheduleType
            scheduleTimezone
            dailyStartTime
            dailyEndTime
            activeWeekdays
            newUserWindowDays
            createdAt
            totalUsageCount
            totalRevenue
            creatorType
            creatorId
            eligibleBusinesses {
                id
                name
            }
        }
    }
`);

export const GET_RECOVERY_PROMOTIONS = graphql(`
    query GetRecoveryPromotions {
        getRecoveryPromotions {
            id
            name
            description
            type
            discountValue
            isActive
            orderId
            assignedUsers {
                userId
                usageCount
                expiresAt
                user {
                    id
                    firstName
                    lastName
                    phoneNumber
                    adminNote
                    flagColor
                    address
                    email
                }
            }
        }
    }
`);

export const GET_PROMOTION_AUDIENCE_GROUPS = graphql(`
    query GetPromotionAudienceGroups($isActive: Boolean, $search: String) {
        getPromotionAudienceGroups(isActive: $isActive, search: $search) {
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

export const GET_PROMOTIONS_ANALYTICS = graphql(`
    query GetPromotionsAnalytics($from: String, $to: String, $includeRecovery: Boolean, $isActive: Boolean) {
        getPromotionsAnalytics(from: $from, to: $to, includeRecovery: $includeRecovery, isActive: $isActive) {
            summary {
                totalUsageCount
                totalDeducted
                totalDiscountDeducted
                totalDeliveryDeducted
                platformPaid
                businessPaid
                uniqueUsers
                averageOrderValue
            }
            dailyPoints {
                date
                usageCount
                uniqueUsers
                totalDeducted
                totalDiscountDeducted
                totalDeliveryDeducted
                platformPaid
                businessPaid
            }
            items {
                creatorName
                totalUsageCount
                uniqueUsers
                totalDeducted
                totalDiscountDeducted
                totalDeliveryDeducted
                platformPaid
                businessPaid
                freeDeliveryUsageCount
                averageOrderValue
                promotion {
                    id
                    name
                    code
                    type
                    target
                    isActive
                    creatorType
                    createdAt
                }
            }
        }
    }
`);
