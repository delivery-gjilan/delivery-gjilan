/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: any; output: any; }
};

export type Business = {
  __typename?: 'Business';
  businessType: BusinessType;
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  isOpen: Scalars['Boolean']['output'];
  location: Location;
  name: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
  workingHours: WorkingHours;
};

export enum BusinessType {
  Market = 'MARKET',
  Pharmacy = 'PHARMACY',
  Restaurant = 'RESTAURANT'
}

export type CreateBusinessInput = {
  businessType: BusinessType;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  location: LocationInput;
  name: Scalars['String']['input'];
  workingHours: WorkingHoursInput;
};

export type CreateProductCategoryInput = {
  businessId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CreateProductInput = {
  businessId: Scalars['ID']['input'];
  categoryId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  isOnSale?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  price: Scalars['Float']['input'];
  salePrice?: InputMaybe<Scalars['Float']['input']>;
  subcategoryId?: InputMaybe<Scalars['ID']['input']>;
};

export type Location = {
  __typename?: 'Location';
  address: Scalars['String']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
};

export type LocationInput = {
  address: Scalars['String']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createBusiness: Business;
  createProduct: Product;
  createProductCategory: ProductCategory;
  deleteBusiness: Scalars['Boolean']['output'];
  deleteProduct: Scalars['Boolean']['output'];
  deleteProductCategory: Scalars['Boolean']['output'];
  updateBusiness: Business;
  updateProduct: Product;
  updateProductCategory: ProductCategory;
};


export type MutationCreateBusinessArgs = {
  input: CreateBusinessInput;
};


export type MutationCreateProductArgs = {
  input: CreateProductInput;
};


export type MutationCreateProductCategoryArgs = {
  input: CreateProductCategoryInput;
};


export type MutationDeleteBusinessArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProductArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProductCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateBusinessArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
};


export type MutationUpdateProductArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
};


export type MutationUpdateProductCategoryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductCategoryInput;
};

export type Order = {
  __typename?: 'Order';
  businesses: Array<OrderBusiness>;
  deliveryPrice: Scalars['Float']['output'];
  dropOffLocation: Location;
  id: Scalars['ID']['output'];
  orderDate: Scalars['Date']['output'];
  orderPrice: Scalars['Float']['output'];
  status: OrderStatus;
  totalPrice: Scalars['Float']['output'];
};

export type OrderBusiness = {
  __typename?: 'OrderBusiness';
  business: Business;
  items: Array<OrderItem>;
};

export type OrderItem = {
  __typename?: 'OrderItem';
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  productId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
};

export enum OrderStatus {
  Accepted = 'ACCEPTED',
  Cancelled = 'CANCELLED',
  Delivered = 'DELIVERED',
  OutForDelivery = 'OUT_FOR_DELIVERY',
  Pending = 'PENDING'
}

export type Product = {
  __typename?: 'Product';
  businessId: Scalars['ID']['output'];
  categoryId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isAvailable: Scalars['Boolean']['output'];
  isOnSale: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  salePrice?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type ProductCategory = {
  __typename?: 'ProductCategory';
  businessId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type ProductSubcategory = {
  __typename?: 'ProductSubcategory';
  categoryId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  business?: Maybe<Business>;
  businesses: Array<Business>;
  product?: Maybe<Product>;
  productCategories: Array<ProductCategory>;
  productCategory?: Maybe<ProductCategory>;
  products: Array<Product>;
};


export type QueryBusinessArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProductArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProductCategoriesArgs = {
  businessId: Scalars['ID']['input'];
};


export type QueryProductCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProductsArgs = {
  businessId: Scalars['ID']['input'];
};

export type UpdateBusinessInput = {
  businessType?: InputMaybe<BusinessType>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<LocationInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  workingHours?: InputMaybe<WorkingHoursInput>;
};

export type UpdateProductCategoryInput = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProductInput = {
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  isOnSale?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  salePrice?: InputMaybe<Scalars['Float']['input']>;
  subcategoryId?: InputMaybe<Scalars['ID']['input']>;
};

export type User = {
  __typename?: 'User';
  address: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type WorkingHours = {
  __typename?: 'WorkingHours';
  closesAt: Scalars['String']['output'];
  opensAt: Scalars['String']['output'];
};

export type WorkingHoursInput = {
  closesAt: Scalars['String']['input'];
  opensAt: Scalars['String']['input'];
};

export type BusinessQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BusinessQuery = { __typename?: 'Query', business?: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, createdAt: any } | null };

export type UpdateBusinessMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
}>;


export type UpdateBusinessMutation = { __typename?: 'Mutation', updateBusiness: { __typename?: 'Business', id: string, name: string, businessType: BusinessType, imageUrl?: string | null, isActive: boolean } };

export type CreateBusinessMutationVariables = Exact<{
  input: CreateBusinessInput;
}>;


export type CreateBusinessMutation = { __typename?: 'Mutation', createBusiness: { __typename?: 'Business', id: string, name: string, businessType: BusinessType, imageUrl?: string | null, isActive: boolean } };

export type DeleteBusinessMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBusinessMutation = { __typename?: 'Mutation', deleteBusiness: boolean };

export type GetBusinessesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBusinessesQuery = { __typename?: 'Query', businesses: Array<{ __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, createdAt: any, updatedAt: any }> };

export type CreateProductCategoryMutationVariables = Exact<{
  input: CreateProductCategoryInput;
}>;


export type CreateProductCategoryMutation = { __typename?: 'Mutation', createProductCategory: { __typename?: 'ProductCategory', id: string, name: string, isActive: boolean } };

export type UpdateProductCategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateProductCategoryInput;
}>;


export type UpdateProductCategoryMutation = { __typename?: 'Mutation', updateProductCategory: { __typename?: 'ProductCategory', id: string, name: string, isActive: boolean } };

export type DeleteProductCategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteProductCategoryMutation = { __typename?: 'Mutation', deleteProductCategory: boolean };

export type ProductCategoriesQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type ProductCategoriesQuery = { __typename?: 'Query', productCategories: Array<{ __typename?: 'ProductCategory', id: string, name: string, isActive: boolean }> };

export type CreateProductMutationVariables = Exact<{
  input: CreateProductInput;
}>;


export type CreateProductMutation = { __typename?: 'Mutation', createProduct: { __typename?: 'Product', id: string } };

export type UpdateProductMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
}>;


export type UpdateProductMutation = { __typename?: 'Mutation', updateProduct: { __typename?: 'Product', id: string } };

export type DeleteProductMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteProductMutation = { __typename?: 'Mutation', deleteProduct: boolean };

export type ProductsAndCategoriesQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type ProductsAndCategoriesQuery = { __typename?: 'Query', productCategories: Array<{ __typename?: 'ProductCategory', id: string, name: string }>, products: Array<{ __typename?: 'Product', id: string, categoryId: string, name: string, description?: string | null, price: number, imageUrl?: string | null, isOnSale: boolean, salePrice?: number | null, isAvailable: boolean }> };


export const BusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Business"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<BusinessQuery, BusinessQueryVariables>;
export const UpdateBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateBusinessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<UpdateBusinessMutation, UpdateBusinessMutationVariables>;
export const CreateBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateBusinessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<CreateBusinessMutation, CreateBusinessMutationVariables>;
export const DeleteBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteBusinessMutation, DeleteBusinessMutationVariables>;
export const GetBusinessesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetBusinessesQuery, GetBusinessesQueryVariables>;
export const CreateProductCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProductCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProductCategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProductCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<CreateProductCategoryMutation, CreateProductCategoryMutationVariables>;
export const UpdateProductCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProductCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProductCategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProductCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<UpdateProductCategoryMutation, UpdateProductCategoryMutationVariables>;
export const DeleteProductCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProductCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProductCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteProductCategoryMutation, DeleteProductCategoryMutationVariables>;
export const ProductCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<ProductCategoriesQuery, ProductCategoriesQueryVariables>;
export const CreateProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateProductMutation, CreateProductMutationVariables>;
export const UpdateProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateProductMutation, UpdateProductMutationVariables>;
export const DeleteProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteProductMutation, DeleteProductMutationVariables>;
export const ProductsAndCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductsAndCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isOnSale"}},{"kind":"Field","name":{"kind":"Name","value":"salePrice"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}}]}}]}}]} as unknown as DocumentNode<ProductsAndCategoriesQuery, ProductsAndCategoriesQueryVariables>;