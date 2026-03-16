import { graphql } from '@/gql';

export const GET_BUSINESS_PRODUCTS_AND_CATEGORIES = graphql(`
    query ProductsAndCategories($businessId: ID!) {
        productCategories(businessId: $businessId) {
            id
            name
        }
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
                variantGroupId
                name
                description
                imageUrl
                price
                isOnSale
                salePrice
                isAvailable
                sortOrder
                variantGroup {
                    id
                    name
                }
                createdAt
                updatedAt
            }
        }
    }
`);
