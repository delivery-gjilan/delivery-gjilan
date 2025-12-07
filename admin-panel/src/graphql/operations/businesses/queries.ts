import { graphql } from '@/gql';

export const GET_BUSINESS = graphql(`
    query Business($id: ID!) {
        business(id: $id) {
            id
            name
            imageUrl
            businessType
            isActive
            createdAt
        }
    }
`);

export const GET_BUSINESSES = graphql(`
    query Businesses {
        businesses {
            id
            name
            imageUrl
            businessType
            isActive
            createdAt
            updatedAt
        }
    }
`);
