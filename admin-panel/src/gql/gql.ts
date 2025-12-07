/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n    query Business($id: ID!) {\n        business(id: $id) {\n            id\n            name\n            imageUrl\n            businessType\n            isActive\n            createdAt\n        }\n    }\n": typeof types.BusinessDocument,
    "\n    mutation UpdateBusiness($id: ID!, $input: UpdateBusinessInput!) {\n        updateBusiness(id: $id, input: $input) {\n            id\n            name\n            businessType\n            imageUrl\n            isActive\n        }\n    }\n": typeof types.UpdateBusinessDocument,
    "\n    mutation CreateBusiness($input: CreateBusinessInput!) {\n        createBusiness(input: $input) {\n            id\n            name\n            businessType\n            imageUrl\n            isActive\n        }\n    }\n": typeof types.CreateBusinessDocument,
    "\n    mutation DeleteBusiness($id: ID!) {\n        deleteBusiness(id: $id)\n    }\n": typeof types.DeleteBusinessDocument,
    "\n    query GetBusinesses {\n        businesses {\n            id\n            name\n            imageUrl\n            businessType\n            isActive\n            createdAt\n            updatedAt\n        }\n    }\n": typeof types.GetBusinessesDocument,
    "\n    mutation CreateProductCategory($input: CreateProductCategoryInput!) {\n        createProductCategory(input: $input) {\n            id\n            name\n            isActive\n        }\n    }\n": typeof types.CreateProductCategoryDocument,
    "\n    mutation UpdateProductCategory(\n        $id: ID!\n        $input: UpdateProductCategoryInput!\n    ) {\n        updateProductCategory(id: $id, input: $input) {\n            id\n            name\n            isActive\n        }\n    }\n": typeof types.UpdateProductCategoryDocument,
    "\n    mutation DeleteProductCategory($id: ID!) {\n        deleteProductCategory(id: $id)\n    }\n": typeof types.DeleteProductCategoryDocument,
    "\n    query ProductCategories($businessId: ID!) {\n        productCategories(businessId: $businessId) {\n            id\n            name\n            isActive\n        }\n    }\n": typeof types.ProductCategoriesDocument,
    "\n    mutation CreateProduct($input: CreateProductInput!) {\n        createProduct(input: $input) {\n            id\n        }\n    }\n": typeof types.CreateProductDocument,
    "\n    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n        updateProduct(id: $id, input: $input) {\n            id\n        }\n    }\n": typeof types.UpdateProductDocument,
    "\n    mutation DeleteProduct($id: ID!) {\n        deleteProduct(id: $id)\n    }\n": typeof types.DeleteProductDocument,
    "\n    query ProductsAndCategories($businessId: ID!) {\n        productCategories(businessId: $businessId) {\n            id\n            name\n        }\n        products(businessId: $businessId) {\n            id\n            categoryId\n            name\n            description\n            price\n            imageUrl\n            isOnSale\n            salePrice\n            isAvailable\n        }\n    }\n": typeof types.ProductsAndCategoriesDocument,
};
const documents: Documents = {
    "\n    query Business($id: ID!) {\n        business(id: $id) {\n            id\n            name\n            imageUrl\n            businessType\n            isActive\n            createdAt\n        }\n    }\n": types.BusinessDocument,
    "\n    mutation UpdateBusiness($id: ID!, $input: UpdateBusinessInput!) {\n        updateBusiness(id: $id, input: $input) {\n            id\n            name\n            businessType\n            imageUrl\n            isActive\n        }\n    }\n": types.UpdateBusinessDocument,
    "\n    mutation CreateBusiness($input: CreateBusinessInput!) {\n        createBusiness(input: $input) {\n            id\n            name\n            businessType\n            imageUrl\n            isActive\n        }\n    }\n": types.CreateBusinessDocument,
    "\n    mutation DeleteBusiness($id: ID!) {\n        deleteBusiness(id: $id)\n    }\n": types.DeleteBusinessDocument,
    "\n    query GetBusinesses {\n        businesses {\n            id\n            name\n            imageUrl\n            businessType\n            isActive\n            createdAt\n            updatedAt\n        }\n    }\n": types.GetBusinessesDocument,
    "\n    mutation CreateProductCategory($input: CreateProductCategoryInput!) {\n        createProductCategory(input: $input) {\n            id\n            name\n            isActive\n        }\n    }\n": types.CreateProductCategoryDocument,
    "\n    mutation UpdateProductCategory(\n        $id: ID!\n        $input: UpdateProductCategoryInput!\n    ) {\n        updateProductCategory(id: $id, input: $input) {\n            id\n            name\n            isActive\n        }\n    }\n": types.UpdateProductCategoryDocument,
    "\n    mutation DeleteProductCategory($id: ID!) {\n        deleteProductCategory(id: $id)\n    }\n": types.DeleteProductCategoryDocument,
    "\n    query ProductCategories($businessId: ID!) {\n        productCategories(businessId: $businessId) {\n            id\n            name\n            isActive\n        }\n    }\n": types.ProductCategoriesDocument,
    "\n    mutation CreateProduct($input: CreateProductInput!) {\n        createProduct(input: $input) {\n            id\n        }\n    }\n": types.CreateProductDocument,
    "\n    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n        updateProduct(id: $id, input: $input) {\n            id\n        }\n    }\n": types.UpdateProductDocument,
    "\n    mutation DeleteProduct($id: ID!) {\n        deleteProduct(id: $id)\n    }\n": types.DeleteProductDocument,
    "\n    query ProductsAndCategories($businessId: ID!) {\n        productCategories(businessId: $businessId) {\n            id\n            name\n        }\n        products(businessId: $businessId) {\n            id\n            categoryId\n            name\n            description\n            price\n            imageUrl\n            isOnSale\n            salePrice\n            isAvailable\n        }\n    }\n": types.ProductsAndCategoriesDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Business($id: ID!) {\n        business(id: $id) {\n            id\n            name\n            imageUrl\n            businessType\n            isActive\n            createdAt\n        }\n    }\n"): (typeof documents)["\n    query Business($id: ID!) {\n        business(id: $id) {\n            id\n            name\n            imageUrl\n            businessType\n            isActive\n            createdAt\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdateBusiness($id: ID!, $input: UpdateBusinessInput!) {\n        updateBusiness(id: $id, input: $input) {\n            id\n            name\n            businessType\n            imageUrl\n            isActive\n        }\n    }\n"): (typeof documents)["\n    mutation UpdateBusiness($id: ID!, $input: UpdateBusinessInput!) {\n        updateBusiness(id: $id, input: $input) {\n            id\n            name\n            businessType\n            imageUrl\n            isActive\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateBusiness($input: CreateBusinessInput!) {\n        createBusiness(input: $input) {\n            id\n            name\n            businessType\n            imageUrl\n            isActive\n        }\n    }\n"): (typeof documents)["\n    mutation CreateBusiness($input: CreateBusinessInput!) {\n        createBusiness(input: $input) {\n            id\n            name\n            businessType\n            imageUrl\n            isActive\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteBusiness($id: ID!) {\n        deleteBusiness(id: $id)\n    }\n"): (typeof documents)["\n    mutation DeleteBusiness($id: ID!) {\n        deleteBusiness(id: $id)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query GetBusinesses {\n        businesses {\n            id\n            name\n            imageUrl\n            businessType\n            isActive\n            createdAt\n            updatedAt\n        }\n    }\n"): (typeof documents)["\n    query GetBusinesses {\n        businesses {\n            id\n            name\n            imageUrl\n            businessType\n            isActive\n            createdAt\n            updatedAt\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateProductCategory($input: CreateProductCategoryInput!) {\n        createProductCategory(input: $input) {\n            id\n            name\n            isActive\n        }\n    }\n"): (typeof documents)["\n    mutation CreateProductCategory($input: CreateProductCategoryInput!) {\n        createProductCategory(input: $input) {\n            id\n            name\n            isActive\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdateProductCategory(\n        $id: ID!\n        $input: UpdateProductCategoryInput!\n    ) {\n        updateProductCategory(id: $id, input: $input) {\n            id\n            name\n            isActive\n        }\n    }\n"): (typeof documents)["\n    mutation UpdateProductCategory(\n        $id: ID!\n        $input: UpdateProductCategoryInput!\n    ) {\n        updateProductCategory(id: $id, input: $input) {\n            id\n            name\n            isActive\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteProductCategory($id: ID!) {\n        deleteProductCategory(id: $id)\n    }\n"): (typeof documents)["\n    mutation DeleteProductCategory($id: ID!) {\n        deleteProductCategory(id: $id)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query ProductCategories($businessId: ID!) {\n        productCategories(businessId: $businessId) {\n            id\n            name\n            isActive\n        }\n    }\n"): (typeof documents)["\n    query ProductCategories($businessId: ID!) {\n        productCategories(businessId: $businessId) {\n            id\n            name\n            isActive\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateProduct($input: CreateProductInput!) {\n        createProduct(input: $input) {\n            id\n        }\n    }\n"): (typeof documents)["\n    mutation CreateProduct($input: CreateProductInput!) {\n        createProduct(input: $input) {\n            id\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n        updateProduct(id: $id, input: $input) {\n            id\n        }\n    }\n"): (typeof documents)["\n    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n        updateProduct(id: $id, input: $input) {\n            id\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteProduct($id: ID!) {\n        deleteProduct(id: $id)\n    }\n"): (typeof documents)["\n    mutation DeleteProduct($id: ID!) {\n        deleteProduct(id: $id)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query ProductsAndCategories($businessId: ID!) {\n        productCategories(businessId: $businessId) {\n            id\n            name\n        }\n        products(businessId: $businessId) {\n            id\n            categoryId\n            name\n            description\n            price\n            imageUrl\n            isOnSale\n            salePrice\n            isAvailable\n        }\n    }\n"): (typeof documents)["\n    query ProductsAndCategories($businessId: ID!) {\n        productCategories(businessId: $businessId) {\n            id\n            name\n        }\n        products(businessId: $businessId) {\n            id\n            categoryId\n            name\n            description\n            price\n            imageUrl\n            isOnSale\n            salePrice\n            isAvailable\n        }\n    }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;