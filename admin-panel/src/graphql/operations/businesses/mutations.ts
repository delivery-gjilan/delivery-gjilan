import { graphql } from '@/gql';

export const CREATE_BUSINESS = graphql(`
    mutation CreateBusiness($input: CreateBusinessInput!) {
        createBusiness(input: $input) {
            id
            name
            businessType
            imageUrl
            isActive
        }
    }
`);

export const UPDATE_BUSINESS = graphql(`
    mutation UpdateBusiness($id: ID!, $input: UpdateBusinessInput!) {
        updateBusiness(id: $id, input: $input) {
            id
            name
            businessType
            imageUrl
            isActive
        }
    }
`);

export const DELETE_BUSINESS = graphql(`
    mutation DeleteBusiness($id: ID!) {
        deleteBusiness(id: $id)
    }
`);
