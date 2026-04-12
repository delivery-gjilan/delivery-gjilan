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

export const CREATE_OPTION_GROUP = graphql(`
    mutation CreateOptionGroup($input: CreateOptionGroupInput!) {
        createOptionGroup(input: $input) {
            id
            name
        }
    }
`);

export const DELETE_OPTION_GROUP = graphql(`
    mutation DeleteOptionGroup($id: ID!) {
        deleteOptionGroup(id: $id)
    }
`);

export const UPDATE_OPTION_GROUP = graphql(`
    mutation UpdateOptionGroup($id: ID!, $input: UpdateOptionGroupInput!) {
        updateOptionGroup(id: $id, input: $input) {
            id
            name
            minSelections
            maxSelections
            displayOrder
        }
    }
`);

export const CREATE_OPTION = graphql(`
    mutation CreateOption($optionGroupId: ID!, $input: CreateOptionInput!) {
        createOption(optionGroupId: $optionGroupId, input: $input) {
            id
            name
            extraPrice
            imageUrl
            displayOrder
        }
    }
`);

export const UPDATE_OPTION = graphql(`
    mutation UpdateOption($id: ID!, $input: UpdateOptionInput!) {
        updateOption(id: $id, input: $input) {
            id
            name
            extraPrice
            imageUrl
            displayOrder
        }
    }
`);

export const DELETE_OPTION = graphql(`
    mutation DeleteOption($id: ID!) {
        deleteOption(id: $id)
    }
`);

export const ADOPT_CATALOG_PRODUCT = graphql(`
    mutation AdoptCatalogProduct($input: AdoptCatalogProductInput!) {
        adoptCatalogProduct(input: $input) {
            id
        }
    }
`);

export const UNADOPT_CATALOG_PRODUCT = graphql(`
    mutation UnadoptCatalogProduct($id: ID!) {
        unadoptCatalogProduct(id: $id)
    }
`);
