import { graphql } from '@/gql';

export const GET_PRODUCTS = graphql(`
    query GetProducts($businessId: ID!) {
        products(businessId: $businessId) {
            id
            businessId
            categoryId
            name
            description
            imageUrl
            price
            isOnSale
            salePrice
            isAvailable
            createdAt
            updatedAt
        }
    }
`);

export const GET_PRODUCT = graphql(`
    query GetProduct($id: ID!) {
        product(id: $id) {
            id
            businessId
            categoryId
            name
            description
            imageUrl
            price
            isOnSale
            salePrice
            isAvailable
            createdAt
            updatedAt
        }
    }
`);
