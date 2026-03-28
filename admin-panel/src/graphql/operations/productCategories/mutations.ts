import { graphql } from "@/gql";

export const CREATE_CATEGORY = graphql(`
    mutation CreateProductCategory($input: CreateProductCategoryInput!) {
        createProductCategory(input: $input) {
            id
            name
            sortOrder
            isActive
        }
    }
`);

export const UPDATE_CATEGORY = graphql(`
    mutation UpdateProductCategory(
        $id: ID!
        $input: UpdateProductCategoryInput!
    ) {
        updateProductCategory(id: $id, input: $input) {
            id
            name
            sortOrder
            isActive
        }
    }
`);

export const UPDATE_CATEGORIES_ORDER = graphql(`
    mutation UpdateProductCategoriesOrder(
        $businessId: ID!
        $categories: [ProductCategoryOrderInput!]!
    ) {
        updateProductCategoriesOrder(businessId: $businessId, categories: $categories)
    }
`);

export const DELETE_CATEGORY = graphql(`
    mutation DeleteProductCategory($id: ID!) {
        deleteProductCategory(id: $id)
    }
`);
