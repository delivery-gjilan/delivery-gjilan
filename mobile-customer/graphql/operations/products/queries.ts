import { graphql } from '@/gql';

export const GET_PRODUCTS = graphql(`
    query GetProducts($businessId: ID!) {
        products(businessId: $businessId) {
            id
            businessId
            categoryId
            subcategoryId
            name
            description
            imageUrl
            price
            isOnSale
            salePrice
            isAvailable
            sortOrder
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
            subcategoryId
            name
            description
            imageUrl
            price
            isOnSale
            salePrice
            isAvailable
            sortOrder
            createdAt
            updatedAt
        }
    }
`);

export const GET_PRODUCT_CATEGORIES = graphql(`
    query ProductCategories($businessId: ID!) {
        productCategories(businessId: $businessId) {
            id
            name
        }
    }
`);

export const GET_PRODUCT_SUBCATEGORIES_BY_BUSINESS = graphql(`
    query ProductSubcategoriesByBusiness($businessId: ID!) {
        productSubcategoriesByBusiness(businessId: $businessId) {
            id
            categoryId
            name
        }
    }
`);
