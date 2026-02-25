import { graphql } from '@/gql';

export const GET_DELIVERY_PRICING_TIERS = graphql(`
    query GetDeliveryPricingTiers {
        deliveryPricingTiers {
            id
            minDistanceKm
            maxDistanceKm
            price
            sortOrder
            isActive
            createdAt
            updatedAt
        }
    }
`);

export const SET_DELIVERY_PRICING_TIERS = graphql(`
    mutation SetDeliveryPricingTiers($input: SetDeliveryPricingTiersInput!) {
        setDeliveryPricingTiers(input: $input) {
            id
            minDistanceKm
            maxDistanceKm
            price
            sortOrder
            isActive
        }
    }
`);

export const CREATE_DELIVERY_PRICING_TIER = graphql(`
    mutation CreateDeliveryPricingTier($input: CreateDeliveryPricingTierInput!) {
        createDeliveryPricingTier(input: $input) {
            id
            minDistanceKm
            maxDistanceKm
            price
            sortOrder
            isActive
        }
    }
`);

export const UPDATE_DELIVERY_PRICING_TIER = graphql(`
    mutation UpdateDeliveryPricingTier($id: ID!, $input: UpdateDeliveryPricingTierInput!) {
        updateDeliveryPricingTier(id: $id, input: $input) {
            id
            minDistanceKm
            maxDistanceKm
            price
            sortOrder
            isActive
        }
    }
`);

export const DELETE_DELIVERY_PRICING_TIER = graphql(`
    mutation DeleteDeliveryPricingTier($id: ID!) {
        deleteDeliveryPricingTier(id: $id)
    }
`);
