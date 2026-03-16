import { graphql } from '@/gql';

// Products queries
export const GET_BUSINESS_PRODUCTS = graphql(`
    query GetBusinessProducts($businessId: ID!) {
        products(businessId: $businessId) {
            id
            name
            imageUrl
            basePrice
            isOffer
            product {
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
        productCategories(businessId: $businessId) {
            id
            businessId
            name
            isActive
        }
    }
`);

// Product mutations
export const CREATE_PRODUCT = graphql(`
    mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
            id
            name
            description
            imageUrl
            price
            isAvailable
        }
    }
`);

export const UPDATE_PRODUCT = graphql(`
    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
        updateProduct(id: $id, input: $input) {
            id
            name
            description
            imageUrl
            price
            isOnSale
            salePrice
            isAvailable
        }
    }
`);

export const DELETE_PRODUCT = graphql(`
    mutation DeleteProduct($id: ID!) {
        deleteProduct(id: $id)
    }
`);

// Category mutations
export const CREATE_CATEGORY = graphql(`
    mutation CreateCategory($input: CreateProductCategoryInput!) {
        createProductCategory(input: $input) {
            id
            businessId
            name
            isActive
        }
    }
`);
