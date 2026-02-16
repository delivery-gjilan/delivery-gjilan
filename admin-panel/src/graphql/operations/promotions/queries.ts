import { graphql } from '@/gql';

export const GET_PROMOTIONS = graphql(`
    query GetPromotions {
        promotions {
            id
            code
            name
            description
            type
            value
            maxRedemptions
            maxRedemptionsPerUser
            freeDeliveryCount
            firstOrderOnly
            isActive
            autoApply
            startsAt
            endsAt
            referrerUserId
            targetUserIds
            createdAt
            updatedAt
        }
    }
`);
