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
            hasOptionGroups
            variants {
                id
                businessId
                categoryId
                subcategoryId
                variantGroupId
                name
                description
                imageUrl
                price
                markupPrice
                nightMarkedupPrice
                isOnSale
                saleDiscountPercentage
                isAvailable
                sortOrder
                sourceProductId
                createdAt
                updatedAt
            }
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
                markupPrice
                nightMarkedupPrice
                isOnSale
                saleDiscountPercentage
                isAvailable
                sortOrder
                sourceProductId
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

export const GET_PRODUCT_WITH_OPTIONS = graphql(`
    query ProductWithOptions($id: ID!) {
        product(id: $id) {
            id
            name
            isOffer
            optionGroups {
                id
                name
                minSelections
                maxSelections
                displayOrder
                options {
                    id
                    name
                    extraPrice
                    imageUrl
                    displayOrder
                }
            }
        }
    }
`);

export const GET_CATALOG_PRODUCTS = graphql(`
    query CatalogProducts {
        catalogProducts {
            id
            businessId
            name
            description
            imageUrl
            price
        }
    }
`);
