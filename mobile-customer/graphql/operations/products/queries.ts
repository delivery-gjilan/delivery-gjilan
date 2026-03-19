import { graphql } from '@/gql';

export const GET_PRODUCTS = graphql(`
    query GetProducts($businessId: ID!) {
        products(businessId: $businessId) {
            id
            name
            imageUrl
            basePrice
            isOffer
            variants {
                id
                name
                imageUrl
                price
                markupPrice
                nightMarkedupPrice
                isOnSale
                salePrice
                isAvailable
            }
            product {
                id
                businessId
                categoryId
                subcategoryId
                name
                description
                imageUrl
                price
                markupPrice
                nightMarkedupPrice
                isOnSale
                salePrice
                isAvailable
                sortOrder
                isOffer
                createdAt
                updatedAt
            }
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
            markupPrice
            nightMarkedupPrice
            isOnSale
            salePrice
            isAvailable
            sortOrder
            isOffer
            variantGroupId
            variants {
                id
                name
                price
                markupPrice
                nightMarkedupPrice
                isOnSale
                salePrice
                isAvailable
                imageUrl
                description
            }
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
                    linkedProductId
                    displayOrder
                    linkedProduct {
                        id
                        name
                        imageUrl
                        price
                        markupPrice
                        nightMarkedupPrice
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
                                displayOrder
                            }
                        }
                    }
                }
            }
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
