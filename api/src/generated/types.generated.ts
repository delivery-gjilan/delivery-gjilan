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

export type CreateBusinessInput = {
  businessType: BusinessType;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createBusiness: Business;
  createOrder: Order;
  createUser: User;
  deleteBusiness: Scalars['Boolean']['output'];
  updateBusiness: Business;
};


export type MutationcreateBusinessArgs = {
  input: CreateBusinessInput;
};


export type MutationcreateOrderArgs = {
  input: OrderInput;
};


export type MutationcreateUserArgs = {
  address: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type MutationdeleteBusinessArgs = {
  id: Scalars['ID']['input'];
};


export type MutationupdateBusinessArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
};

export type Order = {
  __typename?: 'Order';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type OrderInput = {
  name: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  business?: Maybe<Business>;
  businesses: Array<Business>;
  hello: Scalars['String']['output'];
  order: Order;
  user: User;
  users: Array<User>;
};


export type QuerybusinessArgs = {
  id: Scalars['ID']['input'];
};


export type QueryorderArgs = {
  id: Scalars['ID']['input'];
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
  CreateBusinessInput: CreateBusinessInput;
  Mutation: ResolverTypeWrapper<{}>;
  Order: ResolverTypeWrapper<Order>;
  OrderInput: OrderInput;
  Query: ResolverTypeWrapper<{}>;
  UpdateBusinessInput: UpdateBusinessInput;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Business: Business;
  String: Scalars['String']['output'];
  ID: Scalars['ID']['output'];
  Boolean: Scalars['Boolean']['output'];
  CreateBusinessInput: CreateBusinessInput;
  Mutation: {};
  Order: Order;
  OrderInput: OrderInput;
  Query: {};
  UpdateBusinessInput: UpdateBusinessInput;
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

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationcreateBusinessArgs, 'input'>>;
  createOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationcreateOrderArgs, 'input'>>;
  createUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationcreateUserArgs, 'address' | 'id' | 'name'>>;
  deleteBusiness?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteBusinessArgs, 'id'>>;
  updateBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationupdateBusinessArgs, 'id' | 'input'>>;
};

export type OrderResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Order'] = ResolversParentTypes['Order']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType, RequireFields<QuerybusinessArgs, 'id'>>;
  businesses?: Resolver<Array<ResolversTypes['Business']>, ParentType, ContextType>;
  hello?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<QueryorderArgs, 'id'>>;
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
  Mutation?: MutationResolvers<ContextType>;
  Order?: OrderResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

