import { graphql } from '@/gql';

export const GET_BUSINESSES = graphql(`
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
`);
export const GET_BUSINESS = graphql(`
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
                creatorType
                discountValue
                spendThreshold
                priority
                requiresCode
                applyMethod
            }
            minOrderAmount
            createdAt
            updatedAt
        }
    }
`);
export const GET_BUSINESS_MINIMUM = graphql(`
    query GetBusinessMinimum($id: ID!) {
        business(id: $id) {
            id
            minOrderAmount
        }
    }
`);