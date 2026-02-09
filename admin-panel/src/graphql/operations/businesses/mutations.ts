import { gql } from '@apollo/client';

export const CREATE_BUSINESS = gql`
    mutation CreateBusiness($input: CreateBusinessInput!) {
        createBusiness(input: $input) {
            id
            name
            businessType
            imageUrl
            isActive
            avgPrepTimeMinutes
            prepTimeOverrideMinutes
            
        }
    }
`;

export const UPDATE_BUSINESS = gql`
    mutation UpdateBusiness($id: ID!, $input: UpdateBusinessInput!) {
        updateBusiness(id: $id, input: $input) {
            id
            name
            businessType
            imageUrl
            isActive
            avgPrepTimeMinutes
            prepTimeOverrideMinutes
        }
    }
`;

export const DELETE_BUSINESS = gql`
    mutation DeleteBusiness($id: ID!) {
        deleteBusiness(id: $id)
    }
`;
