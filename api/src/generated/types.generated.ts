import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
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
  Date: { input: Date | string; output: Date | string; }
};

export type Business = {
  __typename?: 'Business';
  businessType: BusinessType;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  isOpen: Scalars['Boolean']['output'];
  location: Location;
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  workingHours: WorkingHours;
};

export type BusinessType =
  | 'MARKET'
  | 'PHARMACY'
  | 'RESTAURANT';

export type CreateBusinessInput = {
  businessType: BusinessType;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
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
};

export type CreateProductVariantInput = {
  isOnSale?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  price: Scalars['Float']['input'];
  productId: Scalars['ID']['input'];
  salePrice?: InputMaybe<Scalars['Float']['input']>;
};

export type Location = {
  __typename?: 'Location';
  address: Scalars['String']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createBusiness: Business;
  createOrder: Order;
  createProduct: Product;
  createProductCategory: ProductCategory;
  createProductVariant: ProductVariant;
  createUser: User;
  deleteBusiness: Scalars['Boolean']['output'];
  deleteProduct: Scalars['Boolean']['output'];
  deleteProductCategory: Scalars['Boolean']['output'];
  deleteProductVariant: Scalars['Boolean']['output'];
  updateBusiness: Business;
  updateProduct: Product;
  updateProductCategory: ProductCategory;
  updateProductVariant: ProductVariant;
};


export type MutationcreateBusinessArgs = {
  input: CreateBusinessInput;
};


export type MutationcreateOrderArgs = {
  input: OrderInput;
};


export type MutationcreateProductArgs = {
  input: CreateProductInput;
};


export type MutationcreateProductCategoryArgs = {
  input: CreateProductCategoryInput;
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


export type MutationdeleteProductArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteProductCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteProductVariantArgs = {
  id: Scalars['ID']['input'];
};


export type MutationupdateBusinessArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
};


export type MutationupdateProductArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
};


export type MutationupdateProductCategoryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductCategoryInput;
};


export type MutationupdateProductVariantArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductVariantInput;
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

export type OrderInput = {
  name: Scalars['String']['input'];
};

export type OrderItem = {
  __typename?: 'OrderItem';
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  productId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
};

export type OrderStatus =
  | 'ACCEPTED'
  | 'CANCELLED'
  | 'DELIVERED'
  | 'OUT_FOR_DELIVERY'
  | 'PENDING';

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
  order: Order;
  product?: Maybe<Product>;
  productCategories: Array<ProductCategory>;
  productCategory?: Maybe<ProductCategory>;
  productVariant?: Maybe<ProductVariant>;
  productVariants: Array<ProductVariant>;
  products: Array<Product>;
  user: User;
  users: Array<User>;
};


export type QuerybusinessArgs = {
  id: Scalars['ID']['input'];
};


export type QueryorderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryproductArgs = {
  id: Scalars['ID']['input'];
};


export type QueryproductCategoriesArgs = {
  businessId: Scalars['ID']['input'];
};


export type QueryproductCategoryArgs = {
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

export type WorkingHours = {
  __typename?: 'WorkingHours';
  closesAt: Scalars['String']['output'];
  opensAt: Scalars['String']['output'];
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
  CreateBusinessInput: CreateBusinessInput;
  CreateProductCategoryInput: CreateProductCategoryInput;
  CreateProductInput: CreateProductInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  CreateProductVariantInput: CreateProductVariantInput;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  Location: ResolverTypeWrapper<Location>;
  Mutation: ResolverTypeWrapper<{}>;
  Order: ResolverTypeWrapper<Omit<Order, 'businesses' | 'status'> & { businesses: Array<ResolversTypes['OrderBusiness']>, status: ResolversTypes['OrderStatus'] }>;
  OrderBusiness: ResolverTypeWrapper<Omit<OrderBusiness, 'business'> & { business: ResolversTypes['Business'] }>;
  OrderInput: OrderInput;
  OrderItem: ResolverTypeWrapper<OrderItem>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  OrderStatus: ResolverTypeWrapper<'PENDING' | 'ACCEPTED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'>;
  Product: ResolverTypeWrapper<Product>;
  ProductCategory: ResolverTypeWrapper<ProductCategory>;
  ProductVariant: ResolverTypeWrapper<ProductVariant>;
  Query: ResolverTypeWrapper<{}>;
  UpdateBusinessInput: UpdateBusinessInput;
  UpdateProductCategoryInput: UpdateProductCategoryInput;
  UpdateProductInput: UpdateProductInput;
  UpdateProductVariantInput: UpdateProductVariantInput;
  User: ResolverTypeWrapper<User>;
  WorkingHours: ResolverTypeWrapper<WorkingHours>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Business: Business;
  String: Scalars['String']['output'];
  ID: Scalars['ID']['output'];
  Boolean: Scalars['Boolean']['output'];
  CreateBusinessInput: CreateBusinessInput;
  CreateProductCategoryInput: CreateProductCategoryInput;
  CreateProductInput: CreateProductInput;
  Float: Scalars['Float']['output'];
  CreateProductVariantInput: CreateProductVariantInput;
  Date: Scalars['Date']['output'];
  Location: Location;
  Mutation: {};
  Order: Omit<Order, 'businesses'> & { businesses: Array<ResolversParentTypes['OrderBusiness']> };
  OrderBusiness: Omit<OrderBusiness, 'business'> & { business: ResolversParentTypes['Business'] };
  OrderInput: OrderInput;
  OrderItem: OrderItem;
  Int: Scalars['Int']['output'];
  Product: Product;
  ProductCategory: ProductCategory;
  ProductVariant: ProductVariant;
  Query: {};
  UpdateBusinessInput: UpdateBusinessInput;
  UpdateProductCategoryInput: UpdateProductCategoryInput;
  UpdateProductInput: UpdateProductInput;
  UpdateProductVariantInput: UpdateProductVariantInput;
  User: User;
  WorkingHours: WorkingHours;
};

export type BusinessResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Business'] = ResolversParentTypes['Business']> = {
  businessType?: Resolver<ResolversTypes['BusinessType'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isOpen?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  location?: Resolver<ResolversTypes['Location'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  workingHours?: Resolver<ResolversTypes['WorkingHours'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessTypeResolvers = EnumResolverSignature<{ MARKET?: any, PHARMACY?: any, RESTAURANT?: any }, ResolversTypes['BusinessType']>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export type LocationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  latitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  longitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationcreateBusinessArgs, 'input'>>;
  createOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationcreateOrderArgs, 'input'>>;
  createProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationcreateProductArgs, 'input'>>;
  createProductCategory?: Resolver<ResolversTypes['ProductCategory'], ParentType, ContextType, RequireFields<MutationcreateProductCategoryArgs, 'input'>>;
  createProductVariant?: Resolver<ResolversTypes['ProductVariant'], ParentType, ContextType, RequireFields<MutationcreateProductVariantArgs, 'input'>>;
  createUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationcreateUserArgs, 'address' | 'id' | 'name'>>;
  deleteBusiness?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteBusinessArgs, 'id'>>;
  deleteProduct?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductArgs, 'id'>>;
  deleteProductCategory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductCategoryArgs, 'id'>>;
  deleteProductVariant?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductVariantArgs, 'id'>>;
  updateBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationupdateBusinessArgs, 'id' | 'input'>>;
  updateProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationupdateProductArgs, 'id' | 'input'>>;
  updateProductCategory?: Resolver<ResolversTypes['ProductCategory'], ParentType, ContextType, RequireFields<MutationupdateProductCategoryArgs, 'id' | 'input'>>;
  updateProductVariant?: Resolver<ResolversTypes['ProductVariant'], ParentType, ContextType, RequireFields<MutationupdateProductVariantArgs, 'id' | 'input'>>;
};

export type OrderResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Order'] = ResolversParentTypes['Order']> = {
  businesses?: Resolver<Array<ResolversTypes['OrderBusiness']>, ParentType, ContextType>;
  deliveryPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  dropOffLocation?: Resolver<ResolversTypes['Location'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orderDate?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  orderPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OrderStatus'], ParentType, ContextType>;
  totalPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderBusinessResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderBusiness'] = ResolversParentTypes['OrderBusiness']> = {
  business?: Resolver<ResolversTypes['Business'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['OrderItem']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderItem'] = ResolversParentTypes['OrderItem']> = {
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderStatusResolvers = EnumResolverSignature<{ ACCEPTED?: any, CANCELLED?: any, DELIVERED?: any, OUT_FOR_DELIVERY?: any, PENDING?: any }, ResolversTypes['OrderStatus']>;

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

export type ProductCategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProductCategory'] = ResolversParentTypes['ProductCategory']> = {
  businessId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<QueryorderArgs, 'id'>>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryproductArgs, 'id'>>;
  productCategories?: Resolver<Array<ResolversTypes['ProductCategory']>, ParentType, ContextType, RequireFields<QueryproductCategoriesArgs, 'businessId'>>;
  productCategory?: Resolver<Maybe<ResolversTypes['ProductCategory']>, ParentType, ContextType, RequireFields<QueryproductCategoryArgs, 'id'>>;
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

export type WorkingHoursResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WorkingHours'] = ResolversParentTypes['WorkingHours']> = {
  closesAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  opensAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  Business?: BusinessResolvers<ContextType>;
  BusinessType?: BusinessTypeResolvers;
  Date?: GraphQLScalarType;
  Location?: LocationResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Order?: OrderResolvers<ContextType>;
  OrderBusiness?: OrderBusinessResolvers<ContextType>;
  OrderItem?: OrderItemResolvers<ContextType>;
  OrderStatus?: OrderStatusResolvers;
  Product?: ProductResolvers<ContextType>;
  ProductCategory?: ProductCategoryResolvers<ContextType>;
  ProductVariant?: ProductVariantResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  WorkingHours?: WorkingHoursResolvers<ContextType>;
};

