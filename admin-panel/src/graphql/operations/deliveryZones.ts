import { graphql } from '@/gql';

export const GET_DELIVERY_ZONES = graphql(`
    query GetDeliveryZones {
        deliveryZones {
            id
            name
            polygon {
                lat
                lng
            }
            deliveryFee
            sortOrder
            isActive
            isServiceZone
            createdAt
            updatedAt
        }
    }
`);

export const CREATE_DELIVERY_ZONE = graphql(`
    mutation CreateDeliveryZone($input: CreateDeliveryZoneInput!) {
        createDeliveryZone(input: $input) {
            id
            name
            polygon {
                lat
                lng
            }
            deliveryFee
            sortOrder
            isActive
            isServiceZone
            createdAt
            updatedAt
        }
    }
`);

export const UPDATE_DELIVERY_ZONE = graphql(`
    mutation UpdateDeliveryZone($id: ID!, $input: UpdateDeliveryZoneInput!) {
        updateDeliveryZone(id: $id, input: $input) {
            id
            name
            polygon {
                lat
                lng
            }
            deliveryFee
            sortOrder
            isActive
            isServiceZone
            createdAt
            updatedAt
        }
    }
`);

export const DELETE_DELIVERY_ZONE = graphql(`
    mutation DeleteDeliveryZone($id: ID!) {
        deleteDeliveryZone(id: $id)
    }
`);
