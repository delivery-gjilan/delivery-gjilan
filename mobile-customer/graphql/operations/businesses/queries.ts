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
            activePromotion {
                id
                name
                description
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
                type
                creatorType
                discountValue
                spendThreshold
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
