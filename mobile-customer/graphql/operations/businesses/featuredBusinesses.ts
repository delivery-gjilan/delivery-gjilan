import { graphql } from '@/gql';

export const GET_FEATURED_BUSINESSES = graphql(`
    query FeaturedBusinessesHome {
        featuredBusinesses {
            id
            name
            imageUrl
            description
            isOpen
            ratingAverage
            ratingCount
            avgPrepTimeMinutes
            prepTimeOverrideMinutes
            location {
                latitude
                longitude
            }
            activePromotion {
                id
                name
                description
                type
                discountValue
                spendThreshold
            }
        }
    }
`);