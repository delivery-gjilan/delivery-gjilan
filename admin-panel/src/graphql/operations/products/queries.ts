import { graphql } from "@/gql";

export const GET_BUSINESS_PRODUCTS_AND_CATEGORIES = graphql(`
    query ProductsAndCategories($businessId: ID!) {
        productCategories(businessId: $businessId) {
            id
            name
        }
        products(businessId: $businessId) {
            id
            categoryId
            name
            description
            price
            imageUrl
            isOnSale
            salePrice
            isAvailable
        }
    }
`);
