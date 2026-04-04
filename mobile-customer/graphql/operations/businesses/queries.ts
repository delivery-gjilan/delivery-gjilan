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
            activePromotion {
                id
                name
                description
                type
                discountValue
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
