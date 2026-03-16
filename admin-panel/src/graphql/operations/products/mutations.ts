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

export const CREATE_PRODUCT_VARIANT_GROUP = graphql(`
    mutation CreateProductVariantGroup($input: CreateProductVariantGroupInput!) {
        createProductVariantGroup(input: $input) {
            id
            businessId
            name
        }
    }
`);

export const DELETE_PRODUCT_VARIANT_GROUP = graphql(`
    mutation DeleteProductVariantGroup($id: ID!) {
        deleteProductVariantGroup(id: $id)
    }
`);
