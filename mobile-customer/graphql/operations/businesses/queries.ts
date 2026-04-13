import { gql } from '@apollo/client';

export const GET_BUSINESSES = gql`
    query GetBusinesses {
        businesses {
            id
            name
            description
            imageUrl
            businessType
            isActive
            avgPrepTimeMinutes
            prepTimeOverrideMinutes
            isTemporarilyClosed
            temporaryClosureReason
            location {
                latitude
                longitude
                address
            }
            workingHours {
                opensAt
                closesAt
            }
            schedule {
                id
                dayOfWeek
                opensAt
                closesAt
            }
            isOpen
            ratingAverage
            ratingCount
            category
            activePromotion {
                id
                name
                description
                code
                type
                discountValue
                spendThreshold
            }
            minOrderAmount
            createdAt
            updatedAt
        }
    }
`;

export const GET_BUSINESS = gql`
    query GetBusiness($id: ID!) {
        business(id: $id) {
            id
            name
            description
            imageUrl
            businessType
            isActive
            avgPrepTimeMinutes
            prepTimeOverrideMinutes
            isTemporarilyClosed
            temporaryClosureReason
            location {
                latitude
                longitude
                address
            }
            workingHours {
                opensAt
                closesAt
            }
            schedule {
                id
                dayOfWeek
                opensAt
                closesAt
            }
            isOpen
            ratingAverage
            ratingCount
            activePromotion {
                id
                name
                description
                code
                type
                creatorType
                discountValue
                spendThreshold
            }
            activePromotionsDisplay {
                id
                name
                description
                code
                type
                target
                creatorType
                discountValue
                spendThreshold
                priority
                requiresCode
                applyMethod
                maxUsagePerUser
                maxGlobalUsage
                endsAt
                eligibleBusinessIds
            }
            minOrderAmount
            createdAt
            updatedAt
        }
    }
`;

export const GET_BUSINESS_MINIMUM = gql`
    query GetBusinessMinimum($id: ID!) {
        business(id: $id) {
            id
            minOrderAmount
        }
    }
`;
