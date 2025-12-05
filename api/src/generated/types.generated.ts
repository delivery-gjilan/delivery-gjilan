import { GraphQLResolveInfo } from 'graphql';
import { GraphQLContext } from '../graphql/context';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type EnumResolverSignature<T, AllowedValues = any> = { [key in keyof T]?: AllowedValues };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string | number; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Business = {
  __typename?: 'Business';
  businessType: BusinessType;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type BusinessType =
  | 'MARKET'
  | 'PHARMACY'
  | 'RESTAURANT';

export type Category = {
  __typename?: 'Category';
  businessId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type CreateBusinessInput = {
  businessType: BusinessType;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateCategoryInput = {
  businessId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CreateProductInput = {
  businessId: Scalars['ID']['input'];
  categoryId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isOnSale?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  price: Scalars['Float']['input'];
  salePrice?: InputMaybe<Scalars['Float']['input']>;
};

export type CreateProductVariantInput = {
  isOnSale?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  price: Scalars['Float']['input'];
  productId: Scalars['ID']['input'];
  salePrice?: InputMaybe<Scalars['Float']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createBusiness: Business;
  createCategory: Category;
  createOrder: Order;
  createProduct: Product;
  createProductVariant: ProductVariant;
  createUser: User;
  deleteBusiness: Scalars['Boolean']['output'];
  deleteCategory: Scalars['Boolean']['output'];
  deleteProduct: Scalars['Boolean']['output'];
  deleteProductVariant: Scalars['Boolean']['output'];
  updateBusiness: Business;
  updateCategory: Category;
  updateProduct: Product;
  updateProductVariant: ProductVariant;
};


export type MutationcreateBusinessArgs = {
  input: CreateBusinessInput;
};


export type MutationcreateCategoryArgs = {
  input: CreateCategoryInput;
};


export type MutationcreateOrderArgs = {
  input: OrderInput;
};


export type MutationcreateProductArgs = {
  input: CreateProductInput;
};


export type MutationcreateProductVariantArgs = {
  input: CreateProductVariantInput;
};


export type MutationcreateUserArgs = {
  address: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type MutationdeleteBusinessArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteProductArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteProductVariantArgs = {
  id: Scalars['ID']['input'];
};


export type MutationupdateBusinessArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
};


export type MutationupdateCategoryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCategoryInput;
};


export type MutationupdateProductArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
};


export type MutationupdateProductVariantArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductVariantInput;
};

export type Order = {
  __typename?: 'Order';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type OrderInput = {
  name: Scalars['String']['input'];
};

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

export type ProductVariant = {
  __typename?: 'ProductVariant';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isAvailable: Scalars['Boolean']['output'];
  isOnSale: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  productId: Scalars['ID']['output'];
  salePrice?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  business?: Maybe<Business>;
  businesses: Array<Business>;
  categories: Array<Category>;
  category?: Maybe<Category>;
  hello: Scalars['String']['output'];
  order: Order;
  product?: Maybe<Product>;
  productVariant?: Maybe<ProductVariant>;
  productVariants: Array<ProductVariant>;
  products: Array<Product>;
  user: User;
  users: Array<User>;
};


export type QuerybusinessArgs = {
  id: Scalars['ID']['input'];
};


export type QuerycategoriesArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerycategoryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryorderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryproductArgs = {
  id: Scalars['ID']['input'];
};


export type QueryproductVariantArgs = {
  id: Scalars['ID']['input'];
};


export type QueryproductVariantsArgs = {
  productId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryproductsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  categoryId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryuserArgs = {
  id: Scalars['ID']['input'];
};

export type UpdateBusinessInput = {
  businessType?: InputMaybe<BusinessType>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCategoryInput = {
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
};

export type UpdateProductVariantInput = {
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  isOnSale?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  salePrice?: InputMaybe<Scalars['Float']['input']>;
};

export type User = {
  __typename?: 'User';
  address: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Business: ResolverTypeWrapper<Omit<Business, 'businessType'> & { businessType: ResolversTypes['BusinessType'] }>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BusinessType: ResolverTypeWrapper<'RESTAURANT' | 'MARKET' | 'PHARMACY'>;
  Category: ResolverTypeWrapper<Category>;
  CreateBusinessInput: CreateBusinessInput;
  CreateCategoryInput: CreateCategoryInput;
  CreateProductInput: CreateProductInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  CreateProductVariantInput: CreateProductVariantInput;
  Mutation: ResolverTypeWrapper<{}>;
  Order: ResolverTypeWrapper<Order>;
  OrderInput: OrderInput;
  Product: ResolverTypeWrapper<Product>;
  ProductVariant: ResolverTypeWrapper<ProductVariant>;
  Query: ResolverTypeWrapper<{}>;
  UpdateBusinessInput: UpdateBusinessInput;
  UpdateCategoryInput: UpdateCategoryInput;
  UpdateProductInput: UpdateProductInput;
  UpdateProductVariantInput: UpdateProductVariantInput;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Business: Business;
  String: Scalars['String']['output'];
  ID: Scalars['ID']['output'];
  Boolean: Scalars['Boolean']['output'];
  Category: Category;
  CreateBusinessInput: CreateBusinessInput;
  CreateCategoryInput: CreateCategoryInput;
  CreateProductInput: CreateProductInput;
  Float: Scalars['Float']['output'];
  CreateProductVariantInput: CreateProductVariantInput;
  Mutation: {};
  Order: Order;
  OrderInput: OrderInput;
  Product: Product;
  ProductVariant: ProductVariant;
  Query: {};
  UpdateBusinessInput: UpdateBusinessInput;
  UpdateCategoryInput: UpdateCategoryInput;
  UpdateProductInput: UpdateProductInput;
  UpdateProductVariantInput: UpdateProductVariantInput;
  User: User;
};

export type BusinessResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Business'] = ResolversParentTypes['Business']> = {
  businessType?: Resolver<ResolversTypes['BusinessType'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessTypeResolvers = EnumResolverSignature<{ MARKET?: any, PHARMACY?: any, RESTAURANT?: any }, ResolversTypes['BusinessType']>;

export type CategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = {
  businessId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationcreateBusinessArgs, 'input'>>;
  createCategory?: Resolver<ResolversTypes['Category'], ParentType, ContextType, RequireFields<MutationcreateCategoryArgs, 'input'>>;
  createOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationcreateOrderArgs, 'input'>>;
  createProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationcreateProductArgs, 'input'>>;
  createProductVariant?: Resolver<ResolversTypes['ProductVariant'], ParentType, ContextType, RequireFields<MutationcreateProductVariantArgs, 'input'>>;
  createUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationcreateUserArgs, 'address' | 'id' | 'name'>>;
  deleteBusiness?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteBusinessArgs, 'id'>>;
  deleteCategory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteCategoryArgs, 'id'>>;
  deleteProduct?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductArgs, 'id'>>;
  deleteProductVariant?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductVariantArgs, 'id'>>;
  updateBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationupdateBusinessArgs, 'id' | 'input'>>;
  updateCategory?: Resolver<ResolversTypes['Category'], ParentType, ContextType, RequireFields<MutationupdateCategoryArgs, 'id' | 'input'>>;
  updateProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationupdateProductArgs, 'id' | 'input'>>;
  updateProductVariant?: Resolver<ResolversTypes['ProductVariant'], ParentType, ContextType, RequireFields<MutationupdateProductVariantArgs, 'id' | 'input'>>;
};

export type OrderResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Order'] = ResolversParentTypes['Order']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProductResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = {
  businessId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  categoryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isAvailable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isOnSale?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  salePrice?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProductVariantResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProductVariant'] = ResolversParentTypes['ProductVariant']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isAvailable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isOnSale?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  salePrice?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType, RequireFields<QuerybusinessArgs, 'id'>>;
  businesses?: Resolver<Array<ResolversTypes['Business']>, ParentType, ContextType>;
  categories?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType, Partial<QuerycategoriesArgs>>;
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType, RequireFields<QuerycategoryArgs, 'id'>>;
  hello?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<QueryorderArgs, 'id'>>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryproductArgs, 'id'>>;
  productVariant?: Resolver<Maybe<ResolversTypes['ProductVariant']>, ParentType, ContextType, RequireFields<QueryproductVariantArgs, 'id'>>;
  productVariants?: Resolver<Array<ResolversTypes['ProductVariant']>, ParentType, ContextType, Partial<QueryproductVariantsArgs>>;
  products?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType, Partial<QueryproductsArgs>>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<QueryuserArgs, 'id'>>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
};

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  Business?: BusinessResolvers<ContextType>;
  BusinessType?: BusinessTypeResolvers;
  Category?: CategoryResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Order?: OrderResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductVariant?: ProductVariantResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

