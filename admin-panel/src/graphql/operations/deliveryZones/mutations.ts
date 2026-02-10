import { gql } from '@apollo/client';

export const CREATE_DELIVERY_ZONE = gql`
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
`;

export const UPDATE_DELIVERY_ZONE = gql`
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
`;

export const DELETE_DELIVERY_ZONE = gql`
    mutation DeleteDeliveryZone($id: ID!) {
        deleteDeliveryZone(id: $id)
    }
`;
