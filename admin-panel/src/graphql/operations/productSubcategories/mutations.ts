import { graphql } from '@/gql';

export const CREATE_PRODUCT_SUBCATEGORY = graphql(`
    mutation CreateProductSubcategory($input: CreateProductSubcategoryInput!) {
        createProductSubcategory(input: $input) {
            id
            categoryId
            name
        }
    }
`);

export const UPDATE_PRODUCT_SUBCATEGORY = graphql(`
    mutation UpdateProductSubcategory($id: ID!, $input: UpdateProductSubcategoryInput!) {
        updateProductSubcategory(id: $id, input: $input) {
            id
            categoryId
            name
        }
    }
`);

export const DELETE_PRODUCT_SUBCATEGORY = graphql(`
    mutation DeleteProductSubcategory($id: ID!) {
        deleteProductSubcategory(id: $id)
    }
`);
