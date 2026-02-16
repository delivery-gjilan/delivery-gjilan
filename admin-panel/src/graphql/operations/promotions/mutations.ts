import { graphql } from '@/gql';

export const CREATE_PROMOTION = graphql(`
    mutation CreatePromotion($input: CreatePromotionInput!) {
        createPromotion(input: $input) {
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

export const UPDATE_PROMOTION = graphql(`
    mutation UpdatePromotion($id: ID!, $input: UpdatePromotionInput!) {
        updatePromotion(id: $id, input: $input) {
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

export const DELETE_PROMOTION = graphql(`
    mutation DeletePromotion($id: ID!) {
        deletePromotion(id: $id)
    }
`);
