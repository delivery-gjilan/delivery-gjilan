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

export const DELETE_CATEGORY = graphql(`
    mutation DeleteProductCategory($id: ID!) {
        deleteProductCategory(id: $id)
    }
`);
