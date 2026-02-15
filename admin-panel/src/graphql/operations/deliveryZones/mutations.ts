import { graphql } from '@/gql';

export const CREATE_DELIVERY_ZONE = graphql(`
    mutation CreateDeliveryZone($input: CreateDeliveryZoneInput!) {
        createDeliveryZone(input: $input) {
            id
            name
            description
            feeDelta
            color
            priority
            isActive
            geometry
        }
    }
`);

export const UPDATE_DELIVERY_ZONE = graphql(`
    mutation UpdateDeliveryZone($id: ID!, $input: UpdateDeliveryZoneInput!) {
        updateDeliveryZone(id: $id, input: $input) {
            id
            name
            description
            feeDelta
            color
            priority
            isActive
            geometry
        }
    }
`);

export const DELETE_DELIVERY_ZONE = graphql(`
    mutation DeleteDeliveryZone($id: ID!) {
        deleteDeliveryZone(id: $id)
    }
`);
