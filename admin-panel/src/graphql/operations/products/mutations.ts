import { graphql } from "@/gql";

export const CREATE_PRODUCT = graphql(`
    mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
            id
        }
    }
`);

export const UPDATE_PRODUCT = graphql(`
    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
        updateProduct(id: $id, input: $input) {
            id
            stock
        }
    }
`);

export const DELETE_PRODUCT = graphql(`
    mutation DeleteProduct($id: ID!) {
        deleteProduct(id: $id)
    }
`);

export const UPDATE_PRODUCTS_ORDER = graphql(`
    mutation UpdateProductsOrder($businessId: ID!, $products: [ProductOrderInput!]!) {
        updateProductsOrder(businessId: $businessId, products: $products)
    }
`);
