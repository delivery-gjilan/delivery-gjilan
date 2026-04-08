import { gql } from '@apollo/client';

export const GET_FEATURED_BUSINESSES = gql`
    query FeaturedBusinessesHome {
        featuredBusinesses {
            id
            name
            imageUrl
            description
            isOpen
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
`;
