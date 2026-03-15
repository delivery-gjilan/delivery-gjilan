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
    "\n    mutation BusinessLogin($input: LoginInput!) {\n        login(input: $input) {\n            token\n            refreshToken\n            user {\n                id\n                email\n                firstName\n                lastName\n                role\n                businessId\n                business {\n                    id\n                    name\n                    imageUrl\n                    businessType\n                    isActive\n                }\n            }\n            message\n        }\n    }\n": typeof types.BusinessLoginDocument,
    "\n  mutation BusinessDeviceHeartbeat($input: BusinessDeviceHeartbeatInput!) {\n    businessDeviceHeartbeat(input: $input)\n  }\n": typeof types.BusinessDeviceHeartbeatDocument,
    "\n  mutation BusinessDeviceOrderSignal($deviceId: String!, $orderId: ID) {\n    businessDeviceOrderSignal(deviceId: $deviceId, orderId: $orderId)\n  }\n": typeof types.BusinessDeviceOrderSignalDocument,
    "\n    mutation RegisterDeviceToken($input: RegisterDeviceTokenInput!) {\n        registerDeviceToken(input: $input)\n    }\n": typeof types.RegisterDeviceTokenDocument,
    "\n    mutation UnregisterDeviceToken($token: String!) {\n        unregisterDeviceToken(token: $token)\n    }\n": typeof types.UnregisterDeviceTokenDocument,
    "\n    mutation TrackPushTelemetry($input: TrackPushTelemetryInput!) {\n        trackPushTelemetry(input: $input)\n    }\n": typeof types.TrackPushTelemetryDocument,
    "\n    query GetBusinessOrders {\n        orders {\n            id\n            displayId\n            userId\n            orderPrice\n            deliveryPrice\n            totalPrice\n            orderDate\n            updatedAt\n            status\n            preparationMinutes\n            estimatedReadyAt\n            preparingAt\n            readyAt\n            user {\n                id\n                firstName\n                lastName\n                phoneNumber\n            }\n            driver {\n                id\n                firstName\n                lastName\n            }\n            dropOffLocation {\n                address\n                latitude\n                longitude\n            }\n            businesses {\n                business {\n                    id\n                    name\n                }\n                items {\n                    productId\n                    name\n                    imageUrl\n                    quantity\n                    price\n                    notes\n                }\n            }\n        }\n    }\n": typeof types.GetBusinessOrdersDocument,
    "\n    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {\n        updateOrderStatus(id: $id, status: $status) {\n            id\n            status\n            updatedAt\n        }\n    }\n": typeof types.UpdateOrderStatusDocument,
    "\n    mutation StartPreparing($id: ID!, $preparationMinutes: Int!) {\n        startPreparing(id: $id, preparationMinutes: $preparationMinutes) {\n            id\n            status\n            preparationMinutes\n            estimatedReadyAt\n            preparingAt\n        }\n    }\n": typeof types.StartPreparingDocument,
    "\n    mutation UpdatePreparationTime($id: ID!, $preparationMinutes: Int!) {\n        updatePreparationTime(id: $id, preparationMinutes: $preparationMinutes) {\n            id\n            preparationMinutes\n            estimatedReadyAt\n        }\n    }\n": typeof types.UpdatePreparationTimeDocument,
    "\n    subscription AllOrdersUpdated {\n        allOrdersUpdated {\n            id\n            displayId\n            userId\n            orderPrice\n            deliveryPrice\n            totalPrice\n            orderDate\n            updatedAt\n            status\n            preparationMinutes\n            estimatedReadyAt\n            user {\n                id\n                firstName\n                lastName\n                phoneNumber\n            }\n            businesses {\n                business {\n                    id\n                    name\n                }\n                items {\n                    productId\n                    name\n                    quantity\n                    price\n                    notes\n                }\n            }\n        }\n    }\n": typeof types.AllOrdersUpdatedDocument,
    "\n    query GetBusinessProducts($businessId: ID!) {\n        products(businessId: $businessId) {\n            id\n            businessId\n            categoryId\n            subcategoryId\n            name\n            description\n            imageUrl\n            price\n            isOnSale\n            salePrice\n            isAvailable\n            sortOrder\n            createdAt\n            updatedAt\n        }\n        productCategories(businessId: $businessId) {\n            id\n            businessId\n            name\n            isActive\n        }\n    }\n": typeof types.GetBusinessProductsDocument,
    "\n    mutation CreateProduct($input: CreateProductInput!) {\n        createProduct(input: $input) {\n            id\n            name\n            description\n            imageUrl\n            price\n            isAvailable\n        }\n    }\n": typeof types.CreateProductDocument,
    "\n    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n        updateProduct(id: $id, input: $input) {\n            id\n            name\n            description\n            imageUrl\n            price\n            isOnSale\n            salePrice\n            isAvailable\n        }\n    }\n": typeof types.UpdateProductDocument,
    "\n    mutation DeleteProduct($id: ID!) {\n        deleteProduct(id: $id)\n    }\n": typeof types.DeleteProductDocument,
    "\n    mutation CreateCategory($input: CreateProductCategoryInput!) {\n        createProductCategory(input: $input) {\n            id\n            businessId\n            name\n            isActive\n        }\n    }\n": typeof types.CreateCategoryDocument,
    "\n    query GetStoreStatus {\n        getStoreStatus {\n            isStoreClosed\n            closedMessage\n            bannerEnabled\n            bannerMessage\n            bannerType\n        }\n    }\n": typeof types.GetStoreStatusDocument,
};
const documents: Documents = {
    "\n    mutation BusinessLogin($input: LoginInput!) {\n        login(input: $input) {\n            token\n            refreshToken\n            user {\n                id\n                email\n                firstName\n                lastName\n                role\n                businessId\n                business {\n                    id\n                    name\n                    imageUrl\n                    businessType\n                    isActive\n                }\n            }\n            message\n        }\n    }\n": types.BusinessLoginDocument,
    "\n  mutation BusinessDeviceHeartbeat($input: BusinessDeviceHeartbeatInput!) {\n    businessDeviceHeartbeat(input: $input)\n  }\n": types.BusinessDeviceHeartbeatDocument,
    "\n  mutation BusinessDeviceOrderSignal($deviceId: String!, $orderId: ID) {\n    businessDeviceOrderSignal(deviceId: $deviceId, orderId: $orderId)\n  }\n": types.BusinessDeviceOrderSignalDocument,
    "\n    mutation RegisterDeviceToken($input: RegisterDeviceTokenInput!) {\n        registerDeviceToken(input: $input)\n    }\n": types.RegisterDeviceTokenDocument,
    "\n    mutation UnregisterDeviceToken($token: String!) {\n        unregisterDeviceToken(token: $token)\n    }\n": types.UnregisterDeviceTokenDocument,
    "\n    mutation TrackPushTelemetry($input: TrackPushTelemetryInput!) {\n        trackPushTelemetry(input: $input)\n    }\n": types.TrackPushTelemetryDocument,
    "\n    query GetBusinessOrders {\n        orders {\n            id\n            displayId\n            userId\n            orderPrice\n            deliveryPrice\n            totalPrice\n            orderDate\n            updatedAt\n            status\n            preparationMinutes\n            estimatedReadyAt\n            preparingAt\n            readyAt\n            user {\n                id\n                firstName\n                lastName\n                phoneNumber\n            }\n            driver {\n                id\n                firstName\n                lastName\n            }\n            dropOffLocation {\n                address\n                latitude\n                longitude\n            }\n            businesses {\n                business {\n                    id\n                    name\n                }\n                items {\n                    productId\n                    name\n                    imageUrl\n                    quantity\n                    price\n                    notes\n                }\n            }\n        }\n    }\n": types.GetBusinessOrdersDocument,
    "\n    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {\n        updateOrderStatus(id: $id, status: $status) {\n            id\n            status\n            updatedAt\n        }\n    }\n": types.UpdateOrderStatusDocument,
    "\n    mutation StartPreparing($id: ID!, $preparationMinutes: Int!) {\n        startPreparing(id: $id, preparationMinutes: $preparationMinutes) {\n            id\n            status\n            preparationMinutes\n            estimatedReadyAt\n            preparingAt\n        }\n    }\n": types.StartPreparingDocument,
    "\n    mutation UpdatePreparationTime($id: ID!, $preparationMinutes: Int!) {\n        updatePreparationTime(id: $id, preparationMinutes: $preparationMinutes) {\n            id\n            preparationMinutes\n            estimatedReadyAt\n        }\n    }\n": types.UpdatePreparationTimeDocument,
    "\n    subscription AllOrdersUpdated {\n        allOrdersUpdated {\n            id\n            displayId\n            userId\n            orderPrice\n            deliveryPrice\n            totalPrice\n            orderDate\n            updatedAt\n            status\n            preparationMinutes\n            estimatedReadyAt\n            user {\n                id\n                firstName\n                lastName\n                phoneNumber\n            }\n            businesses {\n                business {\n                    id\n                    name\n                }\n                items {\n                    productId\n                    name\n                    quantity\n                    price\n                    notes\n                }\n            }\n        }\n    }\n": types.AllOrdersUpdatedDocument,
    "\n    query GetBusinessProducts($businessId: ID!) {\n        products(businessId: $businessId) {\n            id\n            businessId\n            categoryId\n            subcategoryId\n            name\n            description\n            imageUrl\n            price\n            isOnSale\n            salePrice\n            isAvailable\n            sortOrder\n            createdAt\n            updatedAt\n        }\n        productCategories(businessId: $businessId) {\n            id\n            businessId\n            name\n            isActive\n        }\n    }\n": types.GetBusinessProductsDocument,
    "\n    mutation CreateProduct($input: CreateProductInput!) {\n        createProduct(input: $input) {\n            id\n            name\n            description\n            imageUrl\n            price\n            isAvailable\n        }\n    }\n": types.CreateProductDocument,
    "\n    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n        updateProduct(id: $id, input: $input) {\n            id\n            name\n            description\n            imageUrl\n            price\n            isOnSale\n            salePrice\n            isAvailable\n        }\n    }\n": types.UpdateProductDocument,
    "\n    mutation DeleteProduct($id: ID!) {\n        deleteProduct(id: $id)\n    }\n": types.DeleteProductDocument,
    "\n    mutation CreateCategory($input: CreateProductCategoryInput!) {\n        createProductCategory(input: $input) {\n            id\n            businessId\n            name\n            isActive\n        }\n    }\n": types.CreateCategoryDocument,
    "\n    query GetStoreStatus {\n        getStoreStatus {\n            isStoreClosed\n            closedMessage\n            bannerEnabled\n            bannerMessage\n            bannerType\n        }\n    }\n": types.GetStoreStatusDocument,
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
export function graphql(source: "\n    mutation BusinessLogin($input: LoginInput!) {\n        login(input: $input) {\n            token\n            refreshToken\n            user {\n                id\n                email\n                firstName\n                lastName\n                role\n                businessId\n                business {\n                    id\n                    name\n                    imageUrl\n                    businessType\n                    isActive\n                }\n            }\n            message\n        }\n    }\n"): (typeof documents)["\n    mutation BusinessLogin($input: LoginInput!) {\n        login(input: $input) {\n            token\n            refreshToken\n            user {\n                id\n                email\n                firstName\n                lastName\n                role\n                businessId\n                business {\n                    id\n                    name\n                    imageUrl\n                    businessType\n                    isActive\n                }\n            }\n            message\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation BusinessDeviceHeartbeat($input: BusinessDeviceHeartbeatInput!) {\n    businessDeviceHeartbeat(input: $input)\n  }\n"): (typeof documents)["\n  mutation BusinessDeviceHeartbeat($input: BusinessDeviceHeartbeatInput!) {\n    businessDeviceHeartbeat(input: $input)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation BusinessDeviceOrderSignal($deviceId: String!, $orderId: ID) {\n    businessDeviceOrderSignal(deviceId: $deviceId, orderId: $orderId)\n  }\n"): (typeof documents)["\n  mutation BusinessDeviceOrderSignal($deviceId: String!, $orderId: ID) {\n    businessDeviceOrderSignal(deviceId: $deviceId, orderId: $orderId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation RegisterDeviceToken($input: RegisterDeviceTokenInput!) {\n        registerDeviceToken(input: $input)\n    }\n"): (typeof documents)["\n    mutation RegisterDeviceToken($input: RegisterDeviceTokenInput!) {\n        registerDeviceToken(input: $input)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UnregisterDeviceToken($token: String!) {\n        unregisterDeviceToken(token: $token)\n    }\n"): (typeof documents)["\n    mutation UnregisterDeviceToken($token: String!) {\n        unregisterDeviceToken(token: $token)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation TrackPushTelemetry($input: TrackPushTelemetryInput!) {\n        trackPushTelemetry(input: $input)\n    }\n"): (typeof documents)["\n    mutation TrackPushTelemetry($input: TrackPushTelemetryInput!) {\n        trackPushTelemetry(input: $input)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query GetBusinessOrders {\n        orders {\n            id\n            displayId\n            userId\n            orderPrice\n            deliveryPrice\n            totalPrice\n            orderDate\n            updatedAt\n            status\n            preparationMinutes\n            estimatedReadyAt\n            preparingAt\n            readyAt\n            user {\n                id\n                firstName\n                lastName\n                phoneNumber\n            }\n            driver {\n                id\n                firstName\n                lastName\n            }\n            dropOffLocation {\n                address\n                latitude\n                longitude\n            }\n            businesses {\n                business {\n                    id\n                    name\n                }\n                items {\n                    productId\n                    name\n                    imageUrl\n                    quantity\n                    price\n                    notes\n                }\n            }\n        }\n    }\n"): (typeof documents)["\n    query GetBusinessOrders {\n        orders {\n            id\n            displayId\n            userId\n            orderPrice\n            deliveryPrice\n            totalPrice\n            orderDate\n            updatedAt\n            status\n            preparationMinutes\n            estimatedReadyAt\n            preparingAt\n            readyAt\n            user {\n                id\n                firstName\n                lastName\n                phoneNumber\n            }\n            driver {\n                id\n                firstName\n                lastName\n            }\n            dropOffLocation {\n                address\n                latitude\n                longitude\n            }\n            businesses {\n                business {\n                    id\n                    name\n                }\n                items {\n                    productId\n                    name\n                    imageUrl\n                    quantity\n                    price\n                    notes\n                }\n            }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {\n        updateOrderStatus(id: $id, status: $status) {\n            id\n            status\n            updatedAt\n        }\n    }\n"): (typeof documents)["\n    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {\n        updateOrderStatus(id: $id, status: $status) {\n            id\n            status\n            updatedAt\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation StartPreparing($id: ID!, $preparationMinutes: Int!) {\n        startPreparing(id: $id, preparationMinutes: $preparationMinutes) {\n            id\n            status\n            preparationMinutes\n            estimatedReadyAt\n            preparingAt\n        }\n    }\n"): (typeof documents)["\n    mutation StartPreparing($id: ID!, $preparationMinutes: Int!) {\n        startPreparing(id: $id, preparationMinutes: $preparationMinutes) {\n            id\n            status\n            preparationMinutes\n            estimatedReadyAt\n            preparingAt\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdatePreparationTime($id: ID!, $preparationMinutes: Int!) {\n        updatePreparationTime(id: $id, preparationMinutes: $preparationMinutes) {\n            id\n            preparationMinutes\n            estimatedReadyAt\n        }\n    }\n"): (typeof documents)["\n    mutation UpdatePreparationTime($id: ID!, $preparationMinutes: Int!) {\n        updatePreparationTime(id: $id, preparationMinutes: $preparationMinutes) {\n            id\n            preparationMinutes\n            estimatedReadyAt\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    subscription AllOrdersUpdated {\n        allOrdersUpdated {\n            id\n            displayId\n            userId\n            orderPrice\n            deliveryPrice\n            totalPrice\n            orderDate\n            updatedAt\n            status\n            preparationMinutes\n            estimatedReadyAt\n            user {\n                id\n                firstName\n                lastName\n                phoneNumber\n            }\n            businesses {\n                business {\n                    id\n                    name\n                }\n                items {\n                    productId\n                    name\n                    quantity\n                    price\n                    notes\n                }\n            }\n        }\n    }\n"): (typeof documents)["\n    subscription AllOrdersUpdated {\n        allOrdersUpdated {\n            id\n            displayId\n            userId\n            orderPrice\n            deliveryPrice\n            totalPrice\n            orderDate\n            updatedAt\n            status\n            preparationMinutes\n            estimatedReadyAt\n            user {\n                id\n                firstName\n                lastName\n                phoneNumber\n            }\n            businesses {\n                business {\n                    id\n                    name\n                }\n                items {\n                    productId\n                    name\n                    quantity\n                    price\n                    notes\n                }\n            }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query GetBusinessProducts($businessId: ID!) {\n        products(businessId: $businessId) {\n            id\n            businessId\n            categoryId\n            subcategoryId\n            name\n            description\n            imageUrl\n            price\n            isOnSale\n            salePrice\n            isAvailable\n            sortOrder\n            createdAt\n            updatedAt\n        }\n        productCategories(businessId: $businessId) {\n            id\n            businessId\n            name\n            isActive\n        }\n    }\n"): (typeof documents)["\n    query GetBusinessProducts($businessId: ID!) {\n        products(businessId: $businessId) {\n            id\n            businessId\n            categoryId\n            subcategoryId\n            name\n            description\n            imageUrl\n            price\n            isOnSale\n            salePrice\n            isAvailable\n            sortOrder\n            createdAt\n            updatedAt\n        }\n        productCategories(businessId: $businessId) {\n            id\n            businessId\n            name\n            isActive\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateProduct($input: CreateProductInput!) {\n        createProduct(input: $input) {\n            id\n            name\n            description\n            imageUrl\n            price\n            isAvailable\n        }\n    }\n"): (typeof documents)["\n    mutation CreateProduct($input: CreateProductInput!) {\n        createProduct(input: $input) {\n            id\n            name\n            description\n            imageUrl\n            price\n            isAvailable\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n        updateProduct(id: $id, input: $input) {\n            id\n            name\n            description\n            imageUrl\n            price\n            isOnSale\n            salePrice\n            isAvailable\n        }\n    }\n"): (typeof documents)["\n    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n        updateProduct(id: $id, input: $input) {\n            id\n            name\n            description\n            imageUrl\n            price\n            isOnSale\n            salePrice\n            isAvailable\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteProduct($id: ID!) {\n        deleteProduct(id: $id)\n    }\n"): (typeof documents)["\n    mutation DeleteProduct($id: ID!) {\n        deleteProduct(id: $id)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateCategory($input: CreateProductCategoryInput!) {\n        createProductCategory(input: $input) {\n            id\n            businessId\n            name\n            isActive\n        }\n    }\n"): (typeof documents)["\n    mutation CreateCategory($input: CreateProductCategoryInput!) {\n        createProductCategory(input: $input) {\n            id\n            businessId\n            name\n            isActive\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query GetStoreStatus {\n        getStoreStatus {\n            isStoreClosed\n            closedMessage\n            bannerEnabled\n            bannerMessage\n            bannerType\n        }\n    }\n"): (typeof documents)["\n    query GetStoreStatus {\n        getStoreStatus {\n            isStoreClosed\n            closedMessage\n            bannerEnabled\n            bannerMessage\n            bannerType\n        }\n    }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;