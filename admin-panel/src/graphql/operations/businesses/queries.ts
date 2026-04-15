import { graphql } from '@/gql';

export const GET_BUSINESS = graphql(`
    query Business($id: ID!) {
        business(id: $id) {
            id
            name
            phoneNumber
            imageUrl
            businessType
            isActive
            avgPrepTimeMinutes
            prepTimeOverrideMinutes
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
            createdAt
            minOrderAmount
            category
            directDispatchEnabled
        }
    }
`);

export const GET_BUSINESSES = graphql(`
    query Businesses {
        businesses {
            id
            name
            phoneNumber
            imageUrl
            businessType
            isActive
            avgPrepTimeMinutes
            prepTimeOverrideMinutes
            minOrderAmount
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
            createdAt
            updatedAt
        }
    }
`);

export const GET_FEATURED_BUSINESSES = graphql(`
    query FeaturedBusinesses {
        featuredBusinesses {
            id
            name
            imageUrl
            businessType
            isActive
            isFeatured
            featuredSortOrder
        }
    }
`);

export const GET_ALL_BUSINESSES_FOR_FEATURED = graphql(`
    query AllBusinessesForFeatured {
        businesses {
            id
            name
            imageUrl
            businessType
            isActive
            isFeatured
            featuredSortOrder
        }
    }
`);
