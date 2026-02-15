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
  DateTime: { input: Date | string; output: Date | string; }
};

export type AuthResponse = {
  __typename?: 'AuthResponse';
  message: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user: User;
};

export type Business = {
  __typename?: 'Business';
  avgPrepTimeMinutes: Scalars['Int']['output'];
  businessType: BusinessType;
  commissionPercentage: Scalars['Float']['output'];
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  isOpen: Scalars['Boolean']['output'];
  location: Location;
  name: Scalars['String']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
  prepTimeOverrideMinutes?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['Date']['output'];
  workingHours: WorkingHours;
};

export type BusinessType =
  | 'MARKET'
  | 'PHARMACY'
  | 'RESTAURANT';

export type CreateBusinessInput = {
  avgPrepTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  businessType: BusinessType;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  location: LocationInput;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  workingHours: WorkingHoursInput;
};

export type CreateDeliveryZoneInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  feeDelta: Scalars['Float']['input'];
  geometry: Scalars['String']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  priority?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateOrderInput = {
  deliveryPrice: Scalars['Float']['input'];
  dropOffLocation: LocationInput;
  items: Array<CreateOrderItemInput>;
  totalPrice: Scalars['Float']['input'];
};

export type CreateOrderItemInput = {
  price: Scalars['Float']['input'];
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
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
  stock?: InputMaybe<Scalars['Int']['input']>;
  subcategoryId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateProductSubcategoryInput = {
  categoryId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CreateUserInput = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  role: UserRole;
};

export type DeliveryZone = {
  __typename?: 'DeliveryZone';
  color: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  feeDelta: Scalars['Float']['output'];
  geometry: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  priority: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type DriverConnection = {
  __typename?: 'DriverConnection';
  /** System-calculated: current connection state */
  connectionStatus: DriverConnectionStatus;
  /** Timestamp when driver was marked as DISCONNECTED */
  disconnectedAt?: Maybe<Scalars['Date']['output']>;
  /** Last timestamp when driver sent a heartbeat (every 5s) */
  lastHeartbeatAt?: Maybe<Scalars['Date']['output']>;
  /** Last timestamp when location was written to DB (throttled to every 10s) */
  lastLocationUpdate?: Maybe<Scalars['Date']['output']>;
  /** User's preference: "I want to work" toggle */
  onlinePreference: Scalars['Boolean']['output'];
};

/**
 * Connection status for drivers:
 * - CONNECTED: Actively sending heartbeats
 * - STALE: No heartbeat for 15 seconds (warning state)
 * - LOST: No heartbeat for 30 seconds (offline state)
 * - DISCONNECTED: Subscription closed or never connected
 */
export type DriverConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'LOST'
  | 'STALE';

/** Result of driver heartbeat mutation */
export type DriverHeartbeatResult = {
  __typename?: 'DriverHeartbeatResult';
  /** Current connection status after processing */
  connectionStatus: DriverConnectionStatus;
  /** Server timestamp when heartbeat was processed */
  lastHeartbeatAt: Scalars['Date']['output'];
  /** Whether location was actually written to DB (throttled) */
  locationUpdated: Scalars['Boolean']['output'];
  /** Whether heartbeat was processed successfully */
  success: Scalars['Boolean']['output'];
};

export type InitiateSignupInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
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

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Admin mutation to manually set connection status (for testing/recovery) */
  adminSetDriverConnectionStatus: User;
  adminUpdateDriverLocation: User;
  assignDriverToOrder: Order;
  backfillSettlementsForDeliveredOrders: Scalars['Int']['output'];
  cancelOrder: Order;
  createBusiness: Business;
  createDeliveryZone: DeliveryZone;
  createOrder: Order;
  createProduct: Product;
  createProductCategory: ProductCategory;
  createProductSubcategory: ProductSubcategory;
  createUser: AuthResponse;
  deleteBusiness: Scalars['Boolean']['output'];
  deleteDeliveryZone: Scalars['Boolean']['output'];
  deleteProduct: Scalars['Boolean']['output'];
  deleteProductCategory: Scalars['Boolean']['output'];
  deleteProductSubcategory: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  /**
   * Driver heartbeat - call every 5 seconds while online.
   * Updates lastHeartbeatAt and connectionStatus to CONNECTED.
   * Location is throttled: only written if >10s since last write OR moved >5m.
   */
  driverHeartbeat: DriverHeartbeatResult;
  initiateSignup: AuthResponse;
  login: AuthResponse;
  markSettlementAsPaid: Settlement;
  markSettlementAsPartiallyPaid: Settlement;
  markSettlementsAsPaid: Array<Settlement>;
  resendEmailVerification: SignupStepResponse;
  submitPhoneNumber: SignupStepResponse;
  unsettleSettlement: Settlement;
  updateBusiness: Business;
  updateCommissionPercentage: Scalars['Boolean']['output'];
  updateDeliveryZone: DeliveryZone;
  updateDriverLocation: User;
  updateDriverOnlineStatus: User;
  updateOrderStatus: Order;
  updateProduct: Product;
  updateProductCategory: ProductCategory;
  updateProductSubcategory: ProductSubcategory;
  updateProductsOrder: Scalars['Boolean']['output'];
  updateUser: User;
  updateUserNote: User;
  verifyEmail: SignupStepResponse;
  verifyPhone: SignupStepResponse;
};


export type MutationadminSetDriverConnectionStatusArgs = {
  driverId: Scalars['ID']['input'];
  status: DriverConnectionStatus;
};


export type MutationadminUpdateDriverLocationArgs = {
  driverId: Scalars['ID']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};


export type MutationassignDriverToOrderArgs = {
  driverId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationcancelOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationcreateBusinessArgs = {
  input: CreateBusinessInput;
};


export type MutationcreateDeliveryZoneArgs = {
  input: CreateDeliveryZoneInput;
};


export type MutationcreateOrderArgs = {
  input: CreateOrderInput;
};


export type MutationcreateProductArgs = {
  input: CreateProductInput;
};


export type MutationcreateProductCategoryArgs = {
  input: CreateProductCategoryInput;
};


export type MutationcreateProductSubcategoryArgs = {
  input: CreateProductSubcategoryInput;
};


export type MutationcreateUserArgs = {
  input: CreateUserInput;
};


export type MutationdeleteBusinessArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteDeliveryZoneArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteProductArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteProductCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteProductSubcategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdriverHeartbeatArgs = {
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};


export type MutationinitiateSignupArgs = {
  input: InitiateSignupInput;
};


export type MutationloginArgs = {
  input: LoginInput;
};


export type MutationmarkSettlementAsPaidArgs = {
  settlementId: Scalars['ID']['input'];
};


export type MutationmarkSettlementAsPartiallyPaidArgs = {
  amount: Scalars['Float']['input'];
  settlementId: Scalars['ID']['input'];
};


export type MutationmarkSettlementsAsPaidArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationsubmitPhoneNumberArgs = {
  input: SubmitPhoneNumberInput;
};


export type MutationunsettleSettlementArgs = {
  settlementId: Scalars['ID']['input'];
};


export type MutationupdateBusinessArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
};


export type MutationupdateCommissionPercentageArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  percentage: Scalars['Float']['input'];
};


export type MutationupdateDeliveryZoneArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDeliveryZoneInput;
};


export type MutationupdateDriverLocationArgs = {
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};


export type MutationupdateDriverOnlineStatusArgs = {
  isOnline: Scalars['Boolean']['input'];
};


export type MutationupdateOrderStatusArgs = {
  id: Scalars['ID']['input'];
  status: OrderStatus;
};


export type MutationupdateProductArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
};


export type MutationupdateProductCategoryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductCategoryInput;
};


export type MutationupdateProductSubcategoryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductSubcategoryInput;
};


export type MutationupdateProductsOrderArgs = {
  businessId: Scalars['ID']['input'];
  products: Array<ProductOrderInput>;
};


export type MutationupdateUserArgs = {
  input: UpdateUserInput;
};


export type MutationupdateUserNoteArgs = {
  flagColor?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};


export type MutationverifyEmailArgs = {
  input: VerifyEmailInput;
};


export type MutationverifyPhoneArgs = {
  input: VerifyPhoneInput;
};

export type Order = {
  __typename?: 'Order';
  businesses: Array<OrderBusiness>;
  deliveryPrice: Scalars['Float']['output'];
  driver?: Maybe<User>;
  dropOffLocation: Location;
  id: Scalars['ID']['output'];
  orderDate: Scalars['Date']['output'];
  orderPrice: Scalars['Float']['output'];
  status: OrderStatus;
  totalPrice: Scalars['Float']['output'];
  user?: Maybe<User>;
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
  quantityInStock: Scalars['Int']['output'];
  quantityNeeded: Scalars['Int']['output'];
};

export type OrderStatus =
  | 'ACCEPTED'
  | 'CANCELLED'
  | 'DELIVERED'
  | 'OUT_FOR_DELIVERY'
  | 'PENDING'
  | 'READY';

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
  sortOrder: Scalars['Int']['output'];
  stock: Scalars['Int']['output'];
  subcategoryId?: Maybe<Scalars['ID']['output']>;
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

export type ProductOrderInput = {
  id: Scalars['ID']['input'];
  sortOrder: Scalars['Int']['input'];
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
  businessBalance: SettlementSummary;
  businesses: Array<Business>;
  calculateDeliveryFee: ZoneFeeResult;
  deliveryZone?: Maybe<DeliveryZone>;
  deliveryZones: Array<DeliveryZone>;
  driverBalance: SettlementSummary;
  drivers: Array<User>;
  me?: Maybe<User>;
  order?: Maybe<Order>;
  orders: Array<Order>;
  ordersByStatus: Array<Order>;
  product?: Maybe<Product>;
  productCategories: Array<ProductCategory>;
  productCategory?: Maybe<ProductCategory>;
  productSubcategories: Array<ProductSubcategory>;
  productSubcategoriesByBusiness: Array<ProductSubcategory>;
  products: Array<Product>;
  settlementSummary: SettlementSummary;
  settlements: Array<Settlement>;
  uncompletedOrders: Array<Order>;
  users: Array<User>;
};


export type QuerybusinessArgs = {
  id: Scalars['ID']['input'];
};


export type QuerybusinessBalanceArgs = {
  businessId: Scalars['ID']['input'];
};


export type QuerycalculateDeliveryFeeArgs = {
  baseDeliveryFee: Scalars['Float']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};


export type QuerydeliveryZoneArgs = {
  id: Scalars['ID']['input'];
};


export type QuerydriverBalanceArgs = {
  driverId: Scalars['ID']['input'];
};


export type QueryorderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryordersByStatusArgs = {
  status: OrderStatus;
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


export type QueryproductSubcategoriesArgs = {
  categoryId: Scalars['ID']['input'];
};


export type QueryproductSubcategoriesByBusinessArgs = {
  businessId: Scalars['ID']['input'];
};


export type QueryproductsArgs = {
  businessId: Scalars['ID']['input'];
};


export type QuerysettlementSummaryArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  type?: InputMaybe<SettlementType>;
};


export type QuerysettlementsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  status?: InputMaybe<SettlementStatus>;
  type?: InputMaybe<SettlementType>;
};

export type Settlement = {
  __typename?: 'Settlement';
  amount: Scalars['Float']['output'];
  business?: Maybe<Business>;
  createdAt: Scalars['Date']['output'];
  driver?: Maybe<User>;
  id: Scalars['ID']['output'];
  order: Order;
  paidAt?: Maybe<Scalars['Date']['output']>;
  status: SettlementStatus;
  type: SettlementType;
  updatedAt: Scalars['Date']['output'];
};

export type SettlementStatus =
  | 'PAID'
  | 'PENDING';

export type SettlementSummary = {
  __typename?: 'SettlementSummary';
  count: Scalars['Int']['output'];
  pendingCount: Scalars['Int']['output'];
  totalAmount: Scalars['Float']['output'];
  totalPaid: Scalars['Float']['output'];
  totalPending: Scalars['Float']['output'];
};

export type SettlementType =
  | 'BUSINESS_PAYMENT'
  | 'DRIVER_PAYMENT';

export type SignupStep =
  | 'COMPLETED'
  | 'EMAIL_SENT'
  | 'EMAIL_VERIFIED'
  | 'INITIAL'
  | 'PHONE_SENT';

export type SignupStepResponse = {
  __typename?: 'SignupStepResponse';
  currentStep: SignupStep;
  message: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type SubmitPhoneNumberInput = {
  phoneNumber: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  allOrdersUpdated: Array<Order>;
  driverConnectionStatusChanged: DriverConnection;
  driversUpdated: Array<User>;
  orderStatusUpdated: Order;
  settlementCreated: Settlement;
  settlementStatusChanged: Settlement;
  userOrdersUpdated: Array<Order>;
};


export type SubscriptiondriverConnectionStatusChangedArgs = {
  driverId: Scalars['ID']['input'];
};


export type SubscriptionorderStatusUpdatedArgs = {
  orderId: Scalars['ID']['input'];
};


export type SubscriptionsettlementCreatedArgs = {
  type?: InputMaybe<SettlementType>;
};


export type SubscriptionsettlementStatusChangedArgs = {
  id: Scalars['ID']['input'];
};


export type SubscriptionuserOrdersUpdatedArgs = {
  input: SubscriptionInput;
};

export type SubscriptionInput = {
  token: Scalars['String']['input'];
};

export type UpdateBusinessInput = {
  avgPrepTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  businessType?: InputMaybe<BusinessType>;
  commissionPercentage?: InputMaybe<Scalars['Float']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<LocationInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  prepTimeOverrideMinutes?: InputMaybe<Scalars['Int']['input']>;
  workingHours?: InputMaybe<WorkingHoursInput>;
};

export type UpdateDeliveryZoneInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  feeDelta?: InputMaybe<Scalars['Float']['input']>;
  geometry?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
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
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  stock?: InputMaybe<Scalars['Int']['input']>;
  subcategoryId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateProductSubcategoryInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  firstName: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  lastName: Scalars['String']['input'];
  role: UserRole;
};

export type User = {
  __typename?: 'User';
  address?: Maybe<Scalars['String']['output']>;
  adminNote?: Maybe<Scalars['String']['output']>;
  business?: Maybe<Business>;
  businessId?: Maybe<Scalars['ID']['output']>;
  commissionPercentage?: Maybe<Scalars['Float']['output']>;
  driverConnection?: Maybe<DriverConnection>;
  driverLocation?: Maybe<Location>;
  driverLocationUpdatedAt?: Maybe<Scalars['Date']['output']>;
  email: Scalars['String']['output'];
  emailVerified: Scalars['Boolean']['output'];
  firstName: Scalars['String']['output'];
  flagColor?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isOnline: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
  phoneVerified: Scalars['Boolean']['output'];
  role: UserRole;
  signupStep: SignupStep;
};

export type UserRole =
  | 'BUSINESS_ADMIN'
  | 'CUSTOMER'
  | 'DRIVER'
  | 'SUPER_ADMIN';

export type VerifyEmailInput = {
  code: Scalars['String']['input'];
};

export type VerifyPhoneInput = {
  code: Scalars['String']['input'];
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

export type ZoneFeeResult = {
  __typename?: 'ZoneFeeResult';
  baseDeliveryFee: Scalars['Float']['output'];
  totalFee: Scalars['Float']['output'];
  zone?: Maybe<DeliveryZone>;
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
  AuthResponse: ResolverTypeWrapper<Omit<AuthResponse, 'user'> & { user: ResolversTypes['User'] }>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Business: ResolverTypeWrapper<Omit<Business, 'businessType'> & { businessType: ResolversTypes['BusinessType'] }>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BusinessType: ResolverTypeWrapper<'MARKET' | 'PHARMACY' | 'RESTAURANT'>;
  CreateBusinessInput: CreateBusinessInput;
  CreateDeliveryZoneInput: CreateDeliveryZoneInput;
  CreateOrderInput: CreateOrderInput;
  CreateOrderItemInput: CreateOrderItemInput;
  CreateProductCategoryInput: CreateProductCategoryInput;
  CreateProductInput: CreateProductInput;
  CreateProductSubcategoryInput: CreateProductSubcategoryInput;
  CreateUserInput: CreateUserInput;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeliveryZone: ResolverTypeWrapper<DeliveryZone>;
  DriverConnection: ResolverTypeWrapper<Omit<DriverConnection, 'connectionStatus'> & { connectionStatus: ResolversTypes['DriverConnectionStatus'] }>;
  DriverConnectionStatus: ResolverTypeWrapper<'CONNECTED' | 'STALE' | 'LOST' | 'DISCONNECTED'>;
  DriverHeartbeatResult: ResolverTypeWrapper<Omit<DriverHeartbeatResult, 'connectionStatus'> & { connectionStatus: ResolversTypes['DriverConnectionStatus'] }>;
  InitiateSignupInput: InitiateSignupInput;
  Location: ResolverTypeWrapper<Location>;
  LocationInput: LocationInput;
  LoginInput: LoginInput;
  Mutation: ResolverTypeWrapper<{}>;
  Order: ResolverTypeWrapper<Omit<Order, 'businesses' | 'driver' | 'status' | 'user'> & { businesses: Array<ResolversTypes['OrderBusiness']>, driver?: Maybe<ResolversTypes['User']>, status: ResolversTypes['OrderStatus'], user?: Maybe<ResolversTypes['User']> }>;
  OrderBusiness: ResolverTypeWrapper<Omit<OrderBusiness, 'business'> & { business: ResolversTypes['Business'] }>;
  OrderItem: ResolverTypeWrapper<OrderItem>;
  OrderStatus: ResolverTypeWrapper<'PENDING' | 'ACCEPTED' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'>;
  Product: ResolverTypeWrapper<Product>;
  ProductCategory: ResolverTypeWrapper<ProductCategory>;
  ProductOrderInput: ProductOrderInput;
  ProductSubcategory: ResolverTypeWrapper<ProductSubcategory>;
  Query: ResolverTypeWrapper<{}>;
  Settlement: ResolverTypeWrapper<Omit<Settlement, 'business' | 'driver' | 'order' | 'status' | 'type'> & { business?: Maybe<ResolversTypes['Business']>, driver?: Maybe<ResolversTypes['User']>, order: ResolversTypes['Order'], status: ResolversTypes['SettlementStatus'], type: ResolversTypes['SettlementType'] }>;
  SettlementStatus: ResolverTypeWrapper<'PENDING' | 'PAID'>;
  SettlementSummary: ResolverTypeWrapper<SettlementSummary>;
  SettlementType: ResolverTypeWrapper<'DRIVER_PAYMENT' | 'BUSINESS_PAYMENT'>;
  SignupStep: ResolverTypeWrapper<'INITIAL' | 'EMAIL_SENT' | 'EMAIL_VERIFIED' | 'PHONE_SENT' | 'COMPLETED'>;
  SignupStepResponse: ResolverTypeWrapper<Omit<SignupStepResponse, 'currentStep'> & { currentStep: ResolversTypes['SignupStep'] }>;
  SubmitPhoneNumberInput: SubmitPhoneNumberInput;
  Subscription: ResolverTypeWrapper<{}>;
  SubscriptionInput: SubscriptionInput;
  UpdateBusinessInput: UpdateBusinessInput;
  UpdateDeliveryZoneInput: UpdateDeliveryZoneInput;
  UpdateProductCategoryInput: UpdateProductCategoryInput;
  UpdateProductInput: UpdateProductInput;
  UpdateProductSubcategoryInput: UpdateProductSubcategoryInput;
  UpdateUserInput: UpdateUserInput;
  User: ResolverTypeWrapper<Omit<User, 'business' | 'driverConnection' | 'role' | 'signupStep'> & { business?: Maybe<ResolversTypes['Business']>, driverConnection?: Maybe<ResolversTypes['DriverConnection']>, role: ResolversTypes['UserRole'], signupStep: ResolversTypes['SignupStep'] }>;
  UserRole: ResolverTypeWrapper<'CUSTOMER' | 'DRIVER' | 'SUPER_ADMIN' | 'BUSINESS_ADMIN'>;
  VerifyEmailInput: VerifyEmailInput;
  VerifyPhoneInput: VerifyPhoneInput;
  WorkingHours: ResolverTypeWrapper<WorkingHours>;
  WorkingHoursInput: WorkingHoursInput;
  ZoneFeeResult: ResolverTypeWrapper<ZoneFeeResult>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AuthResponse: Omit<AuthResponse, 'user'> & { user: ResolversParentTypes['User'] };
  String: Scalars['String']['output'];
  Business: Business;
  Int: Scalars['Int']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Boolean: Scalars['Boolean']['output'];
  CreateBusinessInput: CreateBusinessInput;
  CreateDeliveryZoneInput: CreateDeliveryZoneInput;
  CreateOrderInput: CreateOrderInput;
  CreateOrderItemInput: CreateOrderItemInput;
  CreateProductCategoryInput: CreateProductCategoryInput;
  CreateProductInput: CreateProductInput;
  CreateProductSubcategoryInput: CreateProductSubcategoryInput;
  CreateUserInput: CreateUserInput;
  Date: Scalars['Date']['output'];
  DateTime: Scalars['DateTime']['output'];
  DeliveryZone: DeliveryZone;
  DriverConnection: DriverConnection;
  DriverHeartbeatResult: DriverHeartbeatResult;
  InitiateSignupInput: InitiateSignupInput;
  Location: Location;
  LocationInput: LocationInput;
  LoginInput: LoginInput;
  Mutation: {};
  Order: Omit<Order, 'businesses' | 'driver' | 'user'> & { businesses: Array<ResolversParentTypes['OrderBusiness']>, driver?: Maybe<ResolversParentTypes['User']>, user?: Maybe<ResolversParentTypes['User']> };
  OrderBusiness: Omit<OrderBusiness, 'business'> & { business: ResolversParentTypes['Business'] };
  OrderItem: OrderItem;
  Product: Product;
  ProductCategory: ProductCategory;
  ProductOrderInput: ProductOrderInput;
  ProductSubcategory: ProductSubcategory;
  Query: {};
  Settlement: Omit<Settlement, 'business' | 'driver' | 'order'> & { business?: Maybe<ResolversParentTypes['Business']>, driver?: Maybe<ResolversParentTypes['User']>, order: ResolversParentTypes['Order'] };
  SettlementSummary: SettlementSummary;
  SignupStepResponse: SignupStepResponse;
  SubmitPhoneNumberInput: SubmitPhoneNumberInput;
  Subscription: {};
  SubscriptionInput: SubscriptionInput;
  UpdateBusinessInput: UpdateBusinessInput;
  UpdateDeliveryZoneInput: UpdateDeliveryZoneInput;
  UpdateProductCategoryInput: UpdateProductCategoryInput;
  UpdateProductInput: UpdateProductInput;
  UpdateProductSubcategoryInput: UpdateProductSubcategoryInput;
  UpdateUserInput: UpdateUserInput;
  User: Omit<User, 'business' | 'driverConnection'> & { business?: Maybe<ResolversParentTypes['Business']>, driverConnection?: Maybe<ResolversParentTypes['DriverConnection']> };
  VerifyEmailInput: VerifyEmailInput;
  VerifyPhoneInput: VerifyPhoneInput;
  WorkingHours: WorkingHours;
  WorkingHoursInput: WorkingHoursInput;
  ZoneFeeResult: ZoneFeeResult;
};

export type skipAuthDirectiveArgs = { };

export type skipAuthDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = skipAuthDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type AuthResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuthResponse'] = ResolversParentTypes['AuthResponse']> = {
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Business'] = ResolversParentTypes['Business']> = {
  avgPrepTimeMinutes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  businessType?: Resolver<ResolversTypes['BusinessType'], ParentType, ContextType>;
  commissionPercentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isOpen?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  location?: Resolver<ResolversTypes['Location'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  prepTimeOverrideMinutes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  workingHours?: Resolver<ResolversTypes['WorkingHours'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessTypeResolvers = EnumResolverSignature<{ MARKET?: any, PHARMACY?: any, RESTAURANT?: any }, ResolversTypes['BusinessType']>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeliveryZoneResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeliveryZone'] = ResolversParentTypes['DeliveryZone']> = {
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  feeDelta?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  geometry?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverConnection'] = ResolversParentTypes['DriverConnection']> = {
  connectionStatus?: Resolver<ResolversTypes['DriverConnectionStatus'], ParentType, ContextType>;
  disconnectedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  lastHeartbeatAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  lastLocationUpdate?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  onlinePreference?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverConnectionStatusResolvers = EnumResolverSignature<{ CONNECTED?: any, DISCONNECTED?: any, LOST?: any, STALE?: any }, ResolversTypes['DriverConnectionStatus']>;

export type DriverHeartbeatResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverHeartbeatResult'] = ResolversParentTypes['DriverHeartbeatResult']> = {
  connectionStatus?: Resolver<ResolversTypes['DriverConnectionStatus'], ParentType, ContextType>;
  lastHeartbeatAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  locationUpdated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LocationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  latitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  longitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  adminSetDriverConnectionStatus?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationadminSetDriverConnectionStatusArgs, 'driverId' | 'status'>>;
  adminUpdateDriverLocation?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationadminUpdateDriverLocationArgs, 'driverId' | 'latitude' | 'longitude'>>;
  assignDriverToOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationassignDriverToOrderArgs, 'id'>>;
  backfillSettlementsForDeliveredOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  cancelOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationcancelOrderArgs, 'id'>>;
  createBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationcreateBusinessArgs, 'input'>>;
  createDeliveryZone?: Resolver<ResolversTypes['DeliveryZone'], ParentType, ContextType, RequireFields<MutationcreateDeliveryZoneArgs, 'input'>>;
  createOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationcreateOrderArgs, 'input'>>;
  createProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationcreateProductArgs, 'input'>>;
  createProductCategory?: Resolver<ResolversTypes['ProductCategory'], ParentType, ContextType, RequireFields<MutationcreateProductCategoryArgs, 'input'>>;
  createProductSubcategory?: Resolver<ResolversTypes['ProductSubcategory'], ParentType, ContextType, RequireFields<MutationcreateProductSubcategoryArgs, 'input'>>;
  createUser?: Resolver<ResolversTypes['AuthResponse'], ParentType, ContextType, RequireFields<MutationcreateUserArgs, 'input'>>;
  deleteBusiness?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteBusinessArgs, 'id'>>;
  deleteDeliveryZone?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteDeliveryZoneArgs, 'id'>>;
  deleteProduct?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductArgs, 'id'>>;
  deleteProductCategory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductCategoryArgs, 'id'>>;
  deleteProductSubcategory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductSubcategoryArgs, 'id'>>;
  deleteUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteUserArgs, 'id'>>;
  driverHeartbeat?: Resolver<ResolversTypes['DriverHeartbeatResult'], ParentType, ContextType, RequireFields<MutationdriverHeartbeatArgs, 'latitude' | 'longitude'>>;
  initiateSignup?: Resolver<ResolversTypes['AuthResponse'], ParentType, ContextType, RequireFields<MutationinitiateSignupArgs, 'input'>>;
  login?: Resolver<ResolversTypes['AuthResponse'], ParentType, ContextType, RequireFields<MutationloginArgs, 'input'>>;
  markSettlementAsPaid?: Resolver<ResolversTypes['Settlement'], ParentType, ContextType, RequireFields<MutationmarkSettlementAsPaidArgs, 'settlementId'>>;
  markSettlementAsPartiallyPaid?: Resolver<ResolversTypes['Settlement'], ParentType, ContextType, RequireFields<MutationmarkSettlementAsPartiallyPaidArgs, 'amount' | 'settlementId'>>;
  markSettlementsAsPaid?: Resolver<Array<ResolversTypes['Settlement']>, ParentType, ContextType, RequireFields<MutationmarkSettlementsAsPaidArgs, 'ids'>>;
  resendEmailVerification?: Resolver<ResolversTypes['SignupStepResponse'], ParentType, ContextType>;
  submitPhoneNumber?: Resolver<ResolversTypes['SignupStepResponse'], ParentType, ContextType, RequireFields<MutationsubmitPhoneNumberArgs, 'input'>>;
  unsettleSettlement?: Resolver<ResolversTypes['Settlement'], ParentType, ContextType, RequireFields<MutationunsettleSettlementArgs, 'settlementId'>>;
  updateBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationupdateBusinessArgs, 'id' | 'input'>>;
  updateCommissionPercentage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationupdateCommissionPercentageArgs, 'percentage'>>;
  updateDeliveryZone?: Resolver<ResolversTypes['DeliveryZone'], ParentType, ContextType, RequireFields<MutationupdateDeliveryZoneArgs, 'id' | 'input'>>;
  updateDriverLocation?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateDriverLocationArgs, 'latitude' | 'longitude'>>;
  updateDriverOnlineStatus?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateDriverOnlineStatusArgs, 'isOnline'>>;
  updateOrderStatus?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationupdateOrderStatusArgs, 'id' | 'status'>>;
  updateProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationupdateProductArgs, 'id' | 'input'>>;
  updateProductCategory?: Resolver<ResolversTypes['ProductCategory'], ParentType, ContextType, RequireFields<MutationupdateProductCategoryArgs, 'id' | 'input'>>;
  updateProductSubcategory?: Resolver<ResolversTypes['ProductSubcategory'], ParentType, ContextType, RequireFields<MutationupdateProductSubcategoryArgs, 'id' | 'input'>>;
  updateProductsOrder?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationupdateProductsOrderArgs, 'businessId' | 'products'>>;
  updateUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateUserArgs, 'input'>>;
  updateUserNote?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateUserNoteArgs, 'userId'>>;
  verifyEmail?: Resolver<ResolversTypes['SignupStepResponse'], ParentType, ContextType, RequireFields<MutationverifyEmailArgs, 'input'>>;
  verifyPhone?: Resolver<ResolversTypes['SignupStepResponse'], ParentType, ContextType, RequireFields<MutationverifyPhoneArgs, 'input'>>;
};

export type OrderResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Order'] = ResolversParentTypes['Order']> = {
  businesses?: Resolver<Array<ResolversTypes['OrderBusiness']>, ParentType, ContextType>;
  deliveryPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  driver?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  dropOffLocation?: Resolver<ResolversTypes['Location'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orderDate?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  orderPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OrderStatus'], ParentType, ContextType>;
  totalPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
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
  quantityInStock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  quantityNeeded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderStatusResolvers = EnumResolverSignature<{ ACCEPTED?: any, CANCELLED?: any, DELIVERED?: any, OUT_FOR_DELIVERY?: any, PENDING?: any, READY?: any }, ResolversTypes['OrderStatus']>;

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
  sortOrder?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  stock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subcategoryId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
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

export type ProductSubcategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProductSubcategory'] = ResolversParentTypes['ProductSubcategory']> = {
  categoryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType, RequireFields<QuerybusinessArgs, 'id'>>;
  businessBalance?: Resolver<ResolversTypes['SettlementSummary'], ParentType, ContextType, RequireFields<QuerybusinessBalanceArgs, 'businessId'>>;
  businesses?: Resolver<Array<ResolversTypes['Business']>, ParentType, ContextType>;
  calculateDeliveryFee?: Resolver<ResolversTypes['ZoneFeeResult'], ParentType, ContextType, RequireFields<QuerycalculateDeliveryFeeArgs, 'baseDeliveryFee' | 'latitude' | 'longitude'>>;
  deliveryZone?: Resolver<Maybe<ResolversTypes['DeliveryZone']>, ParentType, ContextType, RequireFields<QuerydeliveryZoneArgs, 'id'>>;
  deliveryZones?: Resolver<Array<ResolversTypes['DeliveryZone']>, ParentType, ContextType>;
  driverBalance?: Resolver<ResolversTypes['SettlementSummary'], ParentType, ContextType, RequireFields<QuerydriverBalanceArgs, 'driverId'>>;
  drivers?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType, RequireFields<QueryorderArgs, 'id'>>;
  orders?: Resolver<Array<ResolversTypes['Order']>, ParentType, ContextType>;
  ordersByStatus?: Resolver<Array<ResolversTypes['Order']>, ParentType, ContextType, RequireFields<QueryordersByStatusArgs, 'status'>>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryproductArgs, 'id'>>;
  productCategories?: Resolver<Array<ResolversTypes['ProductCategory']>, ParentType, ContextType, RequireFields<QueryproductCategoriesArgs, 'businessId'>>;
  productCategory?: Resolver<Maybe<ResolversTypes['ProductCategory']>, ParentType, ContextType, RequireFields<QueryproductCategoryArgs, 'id'>>;
  productSubcategories?: Resolver<Array<ResolversTypes['ProductSubcategory']>, ParentType, ContextType, RequireFields<QueryproductSubcategoriesArgs, 'categoryId'>>;
  productSubcategoriesByBusiness?: Resolver<Array<ResolversTypes['ProductSubcategory']>, ParentType, ContextType, RequireFields<QueryproductSubcategoriesByBusinessArgs, 'businessId'>>;
  products?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryproductsArgs, 'businessId'>>;
  settlementSummary?: Resolver<ResolversTypes['SettlementSummary'], ParentType, ContextType, Partial<QuerysettlementSummaryArgs>>;
  settlements?: Resolver<Array<ResolversTypes['Settlement']>, ParentType, ContextType, Partial<QuerysettlementsArgs>>;
  uncompletedOrders?: Resolver<Array<ResolversTypes['Order']>, ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
};

export type SettlementResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Settlement'] = ResolversParentTypes['Settlement']> = {
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  driver?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  paidAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['SettlementStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SettlementType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementStatusResolvers = EnumResolverSignature<{ PAID?: any, PENDING?: any }, ResolversTypes['SettlementStatus']>;

export type SettlementSummaryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SettlementSummary'] = ResolversParentTypes['SettlementSummary']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pendingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalPaid?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalPending?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementTypeResolvers = EnumResolverSignature<{ BUSINESS_PAYMENT?: any, DRIVER_PAYMENT?: any }, ResolversTypes['SettlementType']>;

export type SignupStepResolvers = EnumResolverSignature<{ COMPLETED?: any, EMAIL_SENT?: any, EMAIL_VERIFIED?: any, INITIAL?: any, PHONE_SENT?: any }, ResolversTypes['SignupStep']>;

export type SignupStepResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SignupStepResponse'] = ResolversParentTypes['SignupStepResponse']> = {
  currentStep?: Resolver<ResolversTypes['SignupStep'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  allOrdersUpdated?: SubscriptionResolver<Array<ResolversTypes['Order']>, "allOrdersUpdated", ParentType, ContextType>;
  driverConnectionStatusChanged?: SubscriptionResolver<ResolversTypes['DriverConnection'], "driverConnectionStatusChanged", ParentType, ContextType, RequireFields<SubscriptiondriverConnectionStatusChangedArgs, 'driverId'>>;
  driversUpdated?: SubscriptionResolver<Array<ResolversTypes['User']>, "driversUpdated", ParentType, ContextType>;
  orderStatusUpdated?: SubscriptionResolver<ResolversTypes['Order'], "orderStatusUpdated", ParentType, ContextType, RequireFields<SubscriptionorderStatusUpdatedArgs, 'orderId'>>;
  settlementCreated?: SubscriptionResolver<ResolversTypes['Settlement'], "settlementCreated", ParentType, ContextType, Partial<SubscriptionsettlementCreatedArgs>>;
  settlementStatusChanged?: SubscriptionResolver<ResolversTypes['Settlement'], "settlementStatusChanged", ParentType, ContextType, RequireFields<SubscriptionsettlementStatusChangedArgs, 'id'>>;
  userOrdersUpdated?: SubscriptionResolver<Array<ResolversTypes['Order']>, "userOrdersUpdated", ParentType, ContextType, RequireFields<SubscriptionuserOrdersUpdatedArgs, 'input'>>;
};

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  address?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  adminNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType>;
  businessId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  commissionPercentage?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  driverConnection?: Resolver<Maybe<ResolversTypes['DriverConnection']>, ParentType, ContextType>;
  driverLocation?: Resolver<Maybe<ResolversTypes['Location']>, ParentType, ContextType>;
  driverLocationUpdatedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  emailVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  flagColor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isOnline?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  signupStep?: Resolver<ResolversTypes['SignupStep'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserRoleResolvers = EnumResolverSignature<{ BUSINESS_ADMIN?: any, CUSTOMER?: any, DRIVER?: any, SUPER_ADMIN?: any }, ResolversTypes['UserRole']>;

export type WorkingHoursResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WorkingHours'] = ResolversParentTypes['WorkingHours']> = {
  closesAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  opensAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ZoneFeeResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ZoneFeeResult'] = ResolversParentTypes['ZoneFeeResult']> = {
  baseDeliveryFee?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalFee?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  zone?: Resolver<Maybe<ResolversTypes['DeliveryZone']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  AuthResponse?: AuthResponseResolvers<ContextType>;
  Business?: BusinessResolvers<ContextType>;
  BusinessType?: BusinessTypeResolvers;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  DeliveryZone?: DeliveryZoneResolvers<ContextType>;
  DriverConnection?: DriverConnectionResolvers<ContextType>;
  DriverConnectionStatus?: DriverConnectionStatusResolvers;
  DriverHeartbeatResult?: DriverHeartbeatResultResolvers<ContextType>;
  Location?: LocationResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Order?: OrderResolvers<ContextType>;
  OrderBusiness?: OrderBusinessResolvers<ContextType>;
  OrderItem?: OrderItemResolvers<ContextType>;
  OrderStatus?: OrderStatusResolvers;
  Product?: ProductResolvers<ContextType>;
  ProductCategory?: ProductCategoryResolvers<ContextType>;
  ProductSubcategory?: ProductSubcategoryResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Settlement?: SettlementResolvers<ContextType>;
  SettlementStatus?: SettlementStatusResolvers;
  SettlementSummary?: SettlementSummaryResolvers<ContextType>;
  SettlementType?: SettlementTypeResolvers;
  SignupStep?: SignupStepResolvers;
  SignupStepResponse?: SignupStepResponseResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserRole?: UserRoleResolvers;
  WorkingHours?: WorkingHoursResolvers<ContextType>;
  ZoneFeeResult?: ZoneFeeResultResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = GraphQLContext> = {
  skipAuth?: skipAuthDirectiveResolver<any, any, ContextType>;
};
