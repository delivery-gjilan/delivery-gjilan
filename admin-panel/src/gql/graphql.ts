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
  DateTime: { input: any; output: any; }
  JSON: { input: any; output: any; }
};

export enum ActionType {
  BusinessApproved = 'BUSINESS_APPROVED',
  BusinessCreated = 'BUSINESS_CREATED',
  BusinessDeleted = 'BUSINESS_DELETED',
  BusinessRejected = 'BUSINESS_REJECTED',
  BusinessUpdated = 'BUSINESS_UPDATED',
  CategoryCreated = 'CATEGORY_CREATED',
  CategoryDeleted = 'CATEGORY_DELETED',
  CategoryUpdated = 'CATEGORY_UPDATED',
  DriverApproved = 'DRIVER_APPROVED',
  DriverCreated = 'DRIVER_CREATED',
  DriverRejected = 'DRIVER_REJECTED',
  DriverStatusChanged = 'DRIVER_STATUS_CHANGED',
  DriverUpdated = 'DRIVER_UPDATED',
  OrderAssigned = 'ORDER_ASSIGNED',
  OrderCancelled = 'ORDER_CANCELLED',
  OrderCreated = 'ORDER_CREATED',
  OrderDelivered = 'ORDER_DELIVERED',
  OrderStatusChanged = 'ORDER_STATUS_CHANGED',
  OrderUpdated = 'ORDER_UPDATED',
  PasswordChanged = 'PASSWORD_CHANGED',
  PasswordReset = 'PASSWORD_RESET',
  ProductAvailabilityChanged = 'PRODUCT_AVAILABILITY_CHANGED',
  ProductCreated = 'PRODUCT_CREATED',
  ProductDeleted = 'PRODUCT_DELETED',
  ProductPriceChanged = 'PRODUCT_PRICE_CHANGED',
  ProductPublished = 'PRODUCT_PUBLISHED',
  ProductUnpublished = 'PRODUCT_UNPUBLISHED',
  ProductUpdated = 'PRODUCT_UPDATED',
  SettlementCreated = 'SETTLEMENT_CREATED',
  SettlementPaid = 'SETTLEMENT_PAID',
  SettlementPartialPaid = 'SETTLEMENT_PARTIAL_PAID',
  SettlementUnsettled = 'SETTLEMENT_UNSETTLED',
  SubcategoryCreated = 'SUBCATEGORY_CREATED',
  SubcategoryDeleted = 'SUBCATEGORY_DELETED',
  SubcategoryUpdated = 'SUBCATEGORY_UPDATED',
  UserCreated = 'USER_CREATED',
  UserDeleted = 'USER_DELETED',
  UserLogin = 'USER_LOGIN',
  UserLogout = 'USER_LOGOUT',
  UserRoleChanged = 'USER_ROLE_CHANGED',
  UserUpdated = 'USER_UPDATED'
}

export enum ActorType {
  Admin = 'ADMIN',
  Business = 'BUSINESS',
  Customer = 'CUSTOMER',
  Driver = 'DRIVER',
  System = 'SYSTEM'
}

export type AuditLog = {
  __typename?: 'AuditLog';
  action: ActionType;
  actor?: Maybe<User>;
  actorId?: Maybe<Scalars['ID']['output']>;
  actorType: ActorType;
  createdAt: Scalars['DateTime']['output'];
  entityId?: Maybe<Scalars['ID']['output']>;
  entityType: EntityType;
  id: Scalars['ID']['output'];
  ipAddress?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  userAgent?: Maybe<Scalars['String']['output']>;
};

export type AuditLogConnection = {
  __typename?: 'AuditLogConnection';
  hasMore: Scalars['Boolean']['output'];
  logs: Array<AuditLog>;
  total: Scalars['Int']['output'];
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

export enum BusinessType {
  Market = 'MARKET',
  Pharmacy = 'PHARMACY',
  Restaurant = 'RESTAURANT'
}

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
  promoCode?: InputMaybe<Scalars['String']['input']>;
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

export type CreatePromotionInput = {
  autoApply?: InputMaybe<Scalars['Boolean']['input']>;
  code: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  firstOrderOnly?: InputMaybe<Scalars['Boolean']['input']>;
  freeDeliveryCount?: InputMaybe<Scalars['Int']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  maxRedemptions?: InputMaybe<Scalars['Int']['input']>;
  maxRedemptionsPerUser?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  referrerUserId?: InputMaybe<Scalars['ID']['input']>;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  targetUserIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  type: PromotionType;
  value?: InputMaybe<Scalars['Float']['input']>;
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
export enum DriverConnectionStatus {
  Connected = 'CONNECTED',
  Disconnected = 'DISCONNECTED',
  Lost = 'LOST',
  Stale = 'STALE'
}

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

export enum EntityType {
  Business = 'BUSINESS',
  Category = 'CATEGORY',
  DeliveryZone = 'DELIVERY_ZONE',
  Driver = 'DRIVER',
  Order = 'ORDER',
  Product = 'PRODUCT',
  Settlement = 'SETTLEMENT',
  Subcategory = 'SUBCATEGORY',
  User = 'USER'
}

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
  createPromotion: Promotion;
  createUser: AuthResponse;
  deleteBusiness: Scalars['Boolean']['output'];
  deleteDeliveryZone: Scalars['Boolean']['output'];
  deleteProduct: Scalars['Boolean']['output'];
  deleteProductCategory: Scalars['Boolean']['output'];
  deleteProductSubcategory: Scalars['Boolean']['output'];
  deletePromotion: Scalars['Boolean']['output'];
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
  updatePromotion: Promotion;
  updateUser: User;
  updateUserNote: User;
  verifyEmail: SignupStepResponse;
  verifyPhone: SignupStepResponse;
};


export type MutationAdminSetDriverConnectionStatusArgs = {
  driverId: Scalars['ID']['input'];
  status: DriverConnectionStatus;
};


export type MutationAdminUpdateDriverLocationArgs = {
  driverId: Scalars['ID']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};


export type MutationAssignDriverToOrderArgs = {
  driverId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationCancelOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateBusinessArgs = {
  input: CreateBusinessInput;
};


export type MutationCreateDeliveryZoneArgs = {
  input: CreateDeliveryZoneInput;
};


export type MutationCreateOrderArgs = {
  input: CreateOrderInput;
};


export type MutationCreateProductArgs = {
  input: CreateProductInput;
};


export type MutationCreateProductCategoryArgs = {
  input: CreateProductCategoryInput;
};


export type MutationCreateProductSubcategoryArgs = {
  input: CreateProductSubcategoryInput;
};


export type MutationCreatePromotionArgs = {
  input: CreatePromotionInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationDeleteBusinessArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteDeliveryZoneArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProductArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProductCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProductSubcategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePromotionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDriverHeartbeatArgs = {
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};


export type MutationInitiateSignupArgs = {
  input: InitiateSignupInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationMarkSettlementAsPaidArgs = {
  settlementId: Scalars['ID']['input'];
};


export type MutationMarkSettlementAsPartiallyPaidArgs = {
  amount: Scalars['Float']['input'];
  settlementId: Scalars['ID']['input'];
};


export type MutationMarkSettlementsAsPaidArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationSubmitPhoneNumberArgs = {
  input: SubmitPhoneNumberInput;
};


export type MutationUnsettleSettlementArgs = {
  settlementId: Scalars['ID']['input'];
};


export type MutationUpdateBusinessArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
};


export type MutationUpdateCommissionPercentageArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  percentage: Scalars['Float']['input'];
};


export type MutationUpdateDeliveryZoneArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDeliveryZoneInput;
};


export type MutationUpdateDriverLocationArgs = {
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};


export type MutationUpdateDriverOnlineStatusArgs = {
  isOnline: Scalars['Boolean']['input'];
};


export type MutationUpdateOrderStatusArgs = {
  id: Scalars['ID']['input'];
  status: OrderStatus;
};


export type MutationUpdateProductArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
};


export type MutationUpdateProductCategoryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductCategoryInput;
};


export type MutationUpdateProductSubcategoryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductSubcategoryInput;
};


export type MutationUpdateProductsOrderArgs = {
  businessId: Scalars['ID']['input'];
  products: Array<ProductOrderInput>;
};


export type MutationUpdatePromotionArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePromotionInput;
};


export type MutationUpdateUserArgs = {
  input: UpdateUserInput;
};


export type MutationUpdateUserNoteArgs = {
  flagColor?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};


export type MutationVerifyEmailArgs = {
  input: VerifyEmailInput;
};


export type MutationVerifyPhoneArgs = {
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
  updatedAt: Scalars['Date']['output'];
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

export enum OrderStatus {
  Accepted = 'ACCEPTED',
  Cancelled = 'CANCELLED',
  Delivered = 'DELIVERED',
  OutForDelivery = 'OUT_FOR_DELIVERY',
  Pending = 'PENDING',
  Ready = 'READY'
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

export type Promotion = {
  __typename?: 'Promotion';
  autoApply: Scalars['Boolean']['output'];
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  endsAt?: Maybe<Scalars['DateTime']['output']>;
  firstOrderOnly: Scalars['Boolean']['output'];
  freeDeliveryCount?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  maxRedemptions?: Maybe<Scalars['Int']['output']>;
  maxRedemptionsPerUser?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  referrerUserId?: Maybe<Scalars['ID']['output']>;
  startsAt?: Maybe<Scalars['DateTime']['output']>;
  targetUserIds: Array<Scalars['ID']['output']>;
  type: PromotionType;
  updatedAt: Scalars['DateTime']['output'];
  value: Scalars['Float']['output'];
};

export type PromotionRedemption = {
  __typename?: 'PromotionRedemption';
  createdAt: Scalars['DateTime']['output'];
  discountAmount: Scalars['Float']['output'];
  freeDeliveryApplied: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  orderId: Scalars['ID']['output'];
  promotionId: Scalars['ID']['output'];
  referrerUserId?: Maybe<Scalars['ID']['output']>;
  userId: Scalars['ID']['output'];
};

export enum PromotionType {
  FixedDiscount = 'FIXED_DISCOUNT',
  FreeDelivery = 'FREE_DELIVERY',
  PercentDiscount = 'PERCENT_DISCOUNT',
  Referral = 'REFERRAL'
}

export type PromotionValidationResult = {
  __typename?: 'PromotionValidationResult';
  discountAmount: Scalars['Float']['output'];
  effectiveDeliveryPrice: Scalars['Float']['output'];
  freeDeliveryApplied: Scalars['Boolean']['output'];
  isValid: Scalars['Boolean']['output'];
  promotion?: Maybe<Promotion>;
  reason?: Maybe<Scalars['String']['output']>;
  totalPrice: Scalars['Float']['output'];
};

export type Query = {
  __typename?: 'Query';
  auditLog?: Maybe<AuditLog>;
  auditLogs: AuditLogConnection;
  business?: Maybe<Business>;
  businessBalance: SettlementSummary;
  businesses: Array<Business>;
  calculateDeliveryFee: ZoneFeeResult;
  deliveryZone?: Maybe<DeliveryZone>;
  deliveryZones: Array<DeliveryZone>;
  driverBalance: SettlementSummary;
  drivers: Array<User>;
  me?: Maybe<User>;
  myBehavior?: Maybe<UserBehavior>;
  order?: Maybe<Order>;
  orders: Array<Order>;
  ordersByStatus: Array<Order>;
  product?: Maybe<Product>;
  productCategories: Array<ProductCategory>;
  productCategory?: Maybe<ProductCategory>;
  productSubcategories: Array<ProductSubcategory>;
  productSubcategoriesByBusiness: Array<ProductSubcategory>;
  products: Array<Product>;
  promotion?: Maybe<Promotion>;
  promotions: Array<Promotion>;
  settlementSummary: SettlementSummary;
  settlements: Array<Settlement>;
  uncompletedOrders: Array<Order>;
  userBehavior?: Maybe<UserBehavior>;
  users: Array<User>;
  validatePromotion: PromotionValidationResult;
};


export type QueryAuditLogArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAuditLogsArgs = {
  action?: InputMaybe<ActionType>;
  actorId?: InputMaybe<Scalars['ID']['input']>;
  actorType?: InputMaybe<ActorType>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  entityId?: InputMaybe<Scalars['ID']['input']>;
  entityType?: InputMaybe<EntityType>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryBusinessArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBusinessBalanceArgs = {
  businessId: Scalars['ID']['input'];
};


export type QueryCalculateDeliveryFeeArgs = {
  baseDeliveryFee: Scalars['Float']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};


export type QueryDeliveryZoneArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDriverBalanceArgs = {
  driverId: Scalars['ID']['input'];
};


export type QueryOrderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOrdersByStatusArgs = {
  status: OrderStatus;
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


export type QueryProductSubcategoriesArgs = {
  categoryId: Scalars['ID']['input'];
};


export type QueryProductSubcategoriesByBusinessArgs = {
  businessId: Scalars['ID']['input'];
};


export type QueryProductsArgs = {
  businessId: Scalars['ID']['input'];
};


export type QueryPromotionArgs = {
  code: Scalars['String']['input'];
};


export type QuerySettlementSummaryArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  type?: InputMaybe<SettlementType>;
};


export type QuerySettlementsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  status?: InputMaybe<SettlementStatus>;
  type?: InputMaybe<SettlementType>;
};


export type QueryUserBehaviorArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryValidatePromotionArgs = {
  input: ValidatePromotionInput;
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

export enum SettlementStatus {
  Paid = 'PAID',
  Pending = 'PENDING'
}

export type SettlementSummary = {
  __typename?: 'SettlementSummary';
  count: Scalars['Int']['output'];
  pendingCount: Scalars['Int']['output'];
  totalAmount: Scalars['Float']['output'];
  totalPaid: Scalars['Float']['output'];
  totalPending: Scalars['Float']['output'];
};

export enum SettlementType {
  BusinessPayment = 'BUSINESS_PAYMENT',
  DriverPayment = 'DRIVER_PAYMENT'
}

export enum SignupStep {
  Completed = 'COMPLETED',
  EmailSent = 'EMAIL_SENT',
  EmailVerified = 'EMAIL_VERIFIED',
  Initial = 'INITIAL',
  PhoneSent = 'PHONE_SENT'
}

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
  auditLogCreated: AuditLog;
  driverConnectionStatusChanged: DriverConnection;
  driversUpdated: Array<User>;
  orderStatusUpdated: Order;
  settlementCreated: Settlement;
  settlementStatusChanged: Settlement;
  userOrdersUpdated: Array<Order>;
};


export type SubscriptionAuditLogCreatedArgs = {
  action?: InputMaybe<ActionType>;
  actorType?: InputMaybe<ActorType>;
  entityType?: InputMaybe<EntityType>;
};


export type SubscriptionDriverConnectionStatusChangedArgs = {
  driverId: Scalars['ID']['input'];
};


export type SubscriptionOrderStatusUpdatedArgs = {
  orderId: Scalars['ID']['input'];
};


export type SubscriptionSettlementCreatedArgs = {
  type?: InputMaybe<SettlementType>;
};


export type SubscriptionSettlementStatusChangedArgs = {
  id: Scalars['ID']['input'];
};


export type SubscriptionUserOrdersUpdatedArgs = {
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

export type UpdatePromotionInput = {
  autoApply?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  freeDeliveryCount?: InputMaybe<Scalars['Int']['input']>;
  maxRedemptions?: InputMaybe<Scalars['Int']['input']>;
  maxRedemptionsPerUser?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  referrerUserId?: InputMaybe<Scalars['ID']['input']>;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  targetUserIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  type?: InputMaybe<PromotionType>;
  value?: InputMaybe<Scalars['Float']['input']>;
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

export type UserBehavior = {
  __typename?: 'UserBehavior';
  avgOrderValue: Scalars['Float']['output'];
  cancelledOrders: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  deliveredOrders: Scalars['Int']['output'];
  firstOrderAt?: Maybe<Scalars['DateTime']['output']>;
  lastDeliveredAt?: Maybe<Scalars['DateTime']['output']>;
  lastOrderAt?: Maybe<Scalars['DateTime']['output']>;
  totalOrders: Scalars['Int']['output'];
  totalSpend: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

export enum UserRole {
  BusinessAdmin = 'BUSINESS_ADMIN',
  Customer = 'CUSTOMER',
  Driver = 'DRIVER',
  SuperAdmin = 'SUPER_ADMIN'
}

export type ValidatePromotionInput = {
  code: Scalars['String']['input'];
  deliveryPrice: Scalars['Float']['input'];
  itemsTotal: Scalars['Float']['input'];
};

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

export type GetAuditLogsQueryVariables = Exact<{
  actorId?: InputMaybe<Scalars['ID']['input']>;
  actorType?: InputMaybe<ActorType>;
  action?: InputMaybe<ActionType>;
  entityType?: InputMaybe<EntityType>;
  entityId?: InputMaybe<Scalars['ID']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetAuditLogsQuery = { __typename?: 'Query', auditLogs: { __typename?: 'AuditLogConnection', total: number, hasMore: boolean, logs: Array<{ __typename?: 'AuditLog', id: string, actorId?: string | null, actorType: ActorType, action: ActionType, entityType: EntityType, entityId?: string | null, metadata?: any | null, ipAddress?: string | null, userAgent?: string | null, createdAt: any, actor?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, role: UserRole } | null }> } };

export type GetAuditLogQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetAuditLogQuery = { __typename?: 'Query', auditLog?: { __typename?: 'AuditLog', id: string, actorId?: string | null, actorType: ActorType, action: ActionType, entityType: EntityType, entityId?: string | null, metadata?: any | null, ipAddress?: string | null, userAgent?: string | null, createdAt: any, actor?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, role: UserRole } | null } | null };

export type LoginMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthResponse', token: string, message: string, user: { __typename?: 'User', id: string, firstName: string, lastName: string, role: UserRole, businessId?: string | null } } };

export type CreateBusinessMutationVariables = Exact<{
  input: CreateBusinessInput;
}>;


export type CreateBusinessMutation = { __typename?: 'Mutation', createBusiness: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, imageUrl?: string | null, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } } };

export type UpdateBusinessMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
}>;


export type UpdateBusinessMutation = { __typename?: 'Mutation', updateBusiness: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, imageUrl?: string | null, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } } };

export type DeleteBusinessMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBusinessMutation = { __typename?: 'Mutation', deleteBusiness: boolean };

export type BusinessQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BusinessQuery = { __typename?: 'Query', business?: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, createdAt: any, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } } | null };

export type BusinessesQueryVariables = Exact<{ [key: string]: never; }>;


export type BusinessesQuery = { __typename?: 'Query', businesses: Array<{ __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, createdAt: any, updatedAt: any, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }> };

export type CreateDeliveryZoneMutationVariables = Exact<{
  input: CreateDeliveryZoneInput;
}>;


export type CreateDeliveryZoneMutation = { __typename?: 'Mutation', createDeliveryZone: { __typename?: 'DeliveryZone', id: string, name: string, description?: string | null, feeDelta: number, color: string, priority: number, isActive: boolean, geometry: string } };

export type UpdateDeliveryZoneMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateDeliveryZoneInput;
}>;


export type UpdateDeliveryZoneMutation = { __typename?: 'Mutation', updateDeliveryZone: { __typename?: 'DeliveryZone', id: string, name: string, description?: string | null, feeDelta: number, color: string, priority: number, isActive: boolean, geometry: string } };

export type DeleteDeliveryZoneMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDeliveryZoneMutation = { __typename?: 'Mutation', deleteDeliveryZone: boolean };

export type GetDeliveryZonesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDeliveryZonesQuery = { __typename?: 'Query', deliveryZones: Array<{ __typename?: 'DeliveryZone', id: string, name: string, description?: string | null, feeDelta: number, color: string, priority: number, isActive: boolean, geometry: string, createdAt: any, updatedAt: any }> };

export type GetDeliveryZoneQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDeliveryZoneQuery = { __typename?: 'Query', deliveryZone?: { __typename?: 'DeliveryZone', id: string, name: string, description?: string | null, feeDelta: number, color: string, priority: number, isActive: boolean, geometry: string, createdAt: any, updatedAt: any } | null };

export type CalculateDeliveryFeeQueryVariables = Exact<{
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  baseDeliveryFee: Scalars['Float']['input'];
}>;


export type CalculateDeliveryFeeQuery = { __typename?: 'Query', calculateDeliveryFee: { __typename?: 'ZoneFeeResult', totalFee: number, baseDeliveryFee: number, zone?: { __typename?: 'DeliveryZone', id: string, name: string, feeDelta: number, color: string } | null } };

export type UpdateOrderStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: OrderStatus;
}>;


export type UpdateOrderStatusMutation = { __typename?: 'Mutation', updateOrderStatus: { __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, businessType: BusinessType }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> } };

export type CancelOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelOrderMutation = { __typename?: 'Mutation', cancelOrder: { __typename?: 'Order', id: string, status: OrderStatus } };

export type AssignDriverToOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  driverId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type AssignDriverToOrderMutation = { __typename?: 'Mutation', assignDriverToOrder: { __typename?: 'Order', id: string, status: OrderStatus, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null } };

export type GetOrdersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOrdersQuery = { __typename?: 'Query', orders: Array<{ __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number, quantityInStock: number, quantityNeeded: number }> }> }> };

export type GetOrderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetOrderQuery = { __typename?: 'Query', order?: { __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number, quantityInStock: number, quantityNeeded: number }> }> } | null };

export type GetOrdersByStatusQueryVariables = Exact<{
  status: OrderStatus;
}>;


export type GetOrdersByStatusQuery = { __typename?: 'Query', ordersByStatus: Array<{ __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> }> };

export type OrdersUpdatedSubscriptionVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type OrdersUpdatedSubscription = { __typename?: 'Subscription', userOrdersUpdated: Array<{ __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number, quantityInStock: number, quantityNeeded: number }> }> }> };

export type AllOrdersUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type AllOrdersUpdatedSubscription = { __typename?: 'Subscription', allOrdersUpdated: Array<{ __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, businessType: BusinessType, phoneNumber?: string | null, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number, quantityInStock: number, quantityNeeded: number }> }> }> };

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

export type CreateProductSubcategoryMutationVariables = Exact<{
  input: CreateProductSubcategoryInput;
}>;


export type CreateProductSubcategoryMutation = { __typename?: 'Mutation', createProductSubcategory: { __typename?: 'ProductSubcategory', id: string, categoryId: string, name: string } };

export type UpdateProductSubcategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateProductSubcategoryInput;
}>;


export type UpdateProductSubcategoryMutation = { __typename?: 'Mutation', updateProductSubcategory: { __typename?: 'ProductSubcategory', id: string, categoryId: string, name: string } };

export type DeleteProductSubcategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteProductSubcategoryMutation = { __typename?: 'Mutation', deleteProductSubcategory: boolean };

export type ProductSubcategoriesByBusinessQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type ProductSubcategoriesByBusinessQuery = { __typename?: 'Query', productSubcategoriesByBusiness: Array<{ __typename?: 'ProductSubcategory', id: string, categoryId: string, name: string }> };

export type CreateProductMutationVariables = Exact<{
  input: CreateProductInput;
}>;


export type CreateProductMutation = { __typename?: 'Mutation', createProduct: { __typename?: 'Product', id: string } };

export type UpdateProductMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
}>;


export type UpdateProductMutation = { __typename?: 'Mutation', updateProduct: { __typename?: 'Product', id: string, stock: number } };

export type DeleteProductMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteProductMutation = { __typename?: 'Mutation', deleteProduct: boolean };

export type UpdateProductsOrderMutationVariables = Exact<{
  businessId: Scalars['ID']['input'];
  products: Array<ProductOrderInput> | ProductOrderInput;
}>;


export type UpdateProductsOrderMutation = { __typename?: 'Mutation', updateProductsOrder: boolean };

export type ProductsAndCategoriesQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type ProductsAndCategoriesQuery = { __typename?: 'Query', productCategories: Array<{ __typename?: 'ProductCategory', id: string, name: string }>, products: Array<{ __typename?: 'Product', id: string, categoryId: string, subcategoryId?: string | null, name: string, description?: string | null, price: number, imageUrl?: string | null, isOnSale: boolean, salePrice?: number | null, isAvailable: boolean, sortOrder: number, stock: number }> };

export type CreatePromotionMutationVariables = Exact<{
  input: CreatePromotionInput;
}>;


export type CreatePromotionMutation = { __typename?: 'Mutation', createPromotion: { __typename?: 'Promotion', id: string, code: string, name: string, description?: string | null, type: PromotionType, value: number, maxRedemptions?: number | null, maxRedemptionsPerUser?: number | null, freeDeliveryCount?: number | null, firstOrderOnly: boolean, isActive: boolean, autoApply: boolean, startsAt?: any | null, endsAt?: any | null, referrerUserId?: string | null, targetUserIds: Array<string>, createdAt: any, updatedAt: any } };

export type UpdatePromotionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdatePromotionInput;
}>;


export type UpdatePromotionMutation = { __typename?: 'Mutation', updatePromotion: { __typename?: 'Promotion', id: string, code: string, name: string, description?: string | null, type: PromotionType, value: number, maxRedemptions?: number | null, maxRedemptionsPerUser?: number | null, freeDeliveryCount?: number | null, firstOrderOnly: boolean, isActive: boolean, autoApply: boolean, startsAt?: any | null, endsAt?: any | null, referrerUserId?: string | null, targetUserIds: Array<string>, createdAt: any, updatedAt: any } };

export type DeletePromotionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePromotionMutation = { __typename?: 'Mutation', deletePromotion: boolean };

export type GetPromotionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPromotionsQuery = { __typename?: 'Query', promotions: Array<{ __typename?: 'Promotion', id: string, code: string, name: string, description?: string | null, type: PromotionType, value: number, maxRedemptions?: number | null, maxRedemptionsPerUser?: number | null, freeDeliveryCount?: number | null, firstOrderOnly: boolean, isActive: boolean, autoApply: boolean, startsAt?: any | null, endsAt?: any | null, referrerUserId?: string | null, targetUserIds: Array<string>, createdAt: any, updatedAt: any }> };

export type GetSettlementsQueryVariables = Exact<{
  type?: InputMaybe<SettlementType>;
  status?: InputMaybe<SettlementStatus>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  businessId?: InputMaybe<Scalars['ID']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetSettlementsQuery = { __typename?: 'Query', settlements: Array<{ __typename?: 'Settlement', id: string, type: SettlementType, amount: number, status: SettlementStatus, paidAt?: any | null, createdAt: any, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, phoneNumber?: string | null } | null, business?: { __typename?: 'Business', id: string, name: string } | null, order: { __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number } }> };

export type GetSettlementSummaryQueryVariables = Exact<{
  type?: InputMaybe<SettlementType>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  businessId?: InputMaybe<Scalars['ID']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
}>;


export type GetSettlementSummaryQuery = { __typename?: 'Query', settlementSummary: { __typename?: 'SettlementSummary', totalAmount: number, totalPending: number, totalPaid: number, count: number, pendingCount: number } };

export type GetDriverBalanceQueryVariables = Exact<{
  driverId: Scalars['ID']['input'];
}>;


export type GetDriverBalanceQuery = { __typename?: 'Query', driverBalance: { __typename?: 'SettlementSummary', totalAmount: number, totalPending: number, totalPaid: number, count: number, pendingCount: number } };

export type GetBusinessBalanceQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type GetBusinessBalanceQuery = { __typename?: 'Query', businessBalance: { __typename?: 'SettlementSummary', totalAmount: number, totalPending: number, totalPaid: number, count: number, pendingCount: number } };

export type GetDriversWithBalanceQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDriversWithBalanceQuery = { __typename?: 'Query', drivers: Array<{ __typename?: 'User', id: string, firstName: string, lastName: string, phoneNumber?: string | null, commissionPercentage?: number | null }> };

export type GetBusinessesWithBalanceQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBusinessesWithBalanceQuery = { __typename?: 'Query', businesses: Array<{ __typename?: 'Business', id: string, name: string, businessType: BusinessType, commissionPercentage: number }> };

export type UpdateCommissionPercentageMutationVariables = Exact<{
  driverId?: InputMaybe<Scalars['ID']['input']>;
  businessId?: InputMaybe<Scalars['ID']['input']>;
  percentage: Scalars['Float']['input'];
}>;


export type UpdateCommissionPercentageMutation = { __typename?: 'Mutation', updateCommissionPercentage: boolean };

export type MarkSettlementAsPaidMutationVariables = Exact<{
  settlementId: Scalars['ID']['input'];
}>;


export type MarkSettlementAsPaidMutation = { __typename?: 'Mutation', markSettlementAsPaid: { __typename?: 'Settlement', id: string, status: SettlementStatus, paidAt?: any | null } };

export type MarkSettlementsAsPaidMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type MarkSettlementsAsPaidMutation = { __typename?: 'Mutation', markSettlementsAsPaid: Array<{ __typename?: 'Settlement', id: string, status: SettlementStatus, paidAt?: any | null }> };

export type MarkSettlementAsPartiallyPaidMutationVariables = Exact<{
  settlementId: Scalars['ID']['input'];
  amount: Scalars['Float']['input'];
}>;


export type MarkSettlementAsPartiallyPaidMutation = { __typename?: 'Mutation', markSettlementAsPartiallyPaid: { __typename?: 'Settlement', id: string, amount: number, status: SettlementStatus, paidAt?: any | null, updatedAt: any } };

export type BackfillSettlementsForDeliveredOrdersMutationVariables = Exact<{ [key: string]: never; }>;


export type BackfillSettlementsForDeliveredOrdersMutation = { __typename?: 'Mutation', backfillSettlementsForDeliveredOrders: number };

export type UnsettleSettlementMutationVariables = Exact<{
  settlementId: Scalars['ID']['input'];
}>;


export type UnsettleSettlementMutation = { __typename?: 'Mutation', unsettleSettlement: { __typename?: 'Settlement', id: string, status: SettlementStatus, paidAt?: any | null, amount: number } };

export type CreateUserMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  role: UserRole;
  businessId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateUserMutation = { __typename?: 'Mutation', createUser: { __typename?: 'AuthResponse', token: string, message: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, businessId?: string | null } } };

export type UpdateUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  role: UserRole;
  businessId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type UpdateUserMutation = { __typename?: 'Mutation', updateUser: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, business?: { __typename?: 'Business', id: string, name: string } | null } };

export type DeleteUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteUserMutation = { __typename?: 'Mutation', deleteUser: boolean };

export type UpdateUserNoteMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  flagColor?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateUserNoteMutation = { __typename?: 'Mutation', updateUserNote: { __typename?: 'User', id: string, adminNote?: string | null, flagColor?: string | null } };

export type AdminUpdateDriverLocationMutationVariables = Exact<{
  driverId: Scalars['ID']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
}>;


export type AdminUpdateDriverLocationMutation = { __typename?: 'Mutation', adminUpdateDriverLocation: { __typename?: 'User', id: string, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null } };

export type UpdateDriverOnlineStatusMutationVariables = Exact<{
  isOnline: Scalars['Boolean']['input'];
}>;


export type UpdateDriverOnlineStatusMutation = { __typename?: 'Mutation', updateDriverOnlineStatus: { __typename?: 'User', id: string, isOnline: boolean, firstName: string, lastName: string } };

export type UsersQueryVariables = Exact<{ [key: string]: never; }>;


export type UsersQuery = { __typename?: 'Query', users: Array<{ __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, phoneNumber?: string | null, address?: string | null, adminNote?: string | null, flagColor?: string | null, business?: { __typename?: 'Business', id: string, name: string } | null }> };

export type DriversQueryVariables = Exact<{ [key: string]: never; }>;


export type DriversQuery = { __typename?: 'Query', drivers: Array<{ __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, imageUrl?: string | null, phoneNumber?: string | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null, driverConnection?: { __typename?: 'DriverConnection', onlinePreference: boolean, connectionStatus: DriverConnectionStatus, lastHeartbeatAt?: any | null, lastLocationUpdate?: any | null, disconnectedAt?: any | null } | null }> };

export type UserBehaviorQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type UserBehaviorQuery = { __typename?: 'Query', userBehavior?: { __typename?: 'UserBehavior', userId: string, totalOrders: number, deliveredOrders: number, cancelledOrders: number, totalSpend: number, avgOrderValue: number, firstOrderAt?: any | null, lastOrderAt?: any | null, lastDeliveredAt?: any | null } | null };

export type DriversUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type DriversUpdatedSubscription = { __typename?: 'Subscription', driversUpdated: Array<{ __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, imageUrl?: string | null, phoneNumber?: string | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null, driverConnection?: { __typename?: 'DriverConnection', onlinePreference: boolean, connectionStatus: DriverConnectionStatus, lastHeartbeatAt?: any | null, lastLocationUpdate?: any | null, disconnectedAt?: any | null } | null }> };


export const GetAuditLogsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAuditLogs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actorId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actorType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ActorType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"action"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ActionType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"EntityType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"DateTime"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"DateTime"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"auditLogs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"actorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"actorType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actorType"}}},{"kind":"Argument","name":{"kind":"Name","value":"action"},"value":{"kind":"Variable","name":{"kind":"Name","value":"action"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"actorId"}},{"kind":"Field","name":{"kind":"Name","value":"actor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actorType"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"ipAddress"}},{"kind":"Field","name":{"kind":"Name","value":"userAgent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"hasMore"}}]}}]}}]} as unknown as DocumentNode<GetAuditLogsQuery, GetAuditLogsQueryVariables>;
export const GetAuditLogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAuditLog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"auditLog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"actorId"}},{"kind":"Field","name":{"kind":"Name","value":"actor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actorType"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"ipAddress"}},{"kind":"Field","name":{"kind":"Name","value":"userAgent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetAuditLogQuery, GetAuditLogQueryVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const CreateBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateBusinessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}}]}}]} as unknown as DocumentNode<CreateBusinessMutation, CreateBusinessMutationVariables>;
export const UpdateBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateBusinessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateBusinessMutation, UpdateBusinessMutationVariables>;
export const DeleteBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteBusinessMutation, DeleteBusinessMutationVariables>;
export const BusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Business"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<BusinessQuery, BusinessQueryVariables>;
export const BusinessesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<BusinessesQuery, BusinessesQueryVariables>;
export const CreateDeliveryZoneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateDeliveryZone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateDeliveryZoneInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createDeliveryZone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"feeDelta"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}}]}}]}}]} as unknown as DocumentNode<CreateDeliveryZoneMutation, CreateDeliveryZoneMutationVariables>;
export const UpdateDeliveryZoneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDeliveryZone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateDeliveryZoneInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDeliveryZone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"feeDelta"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}}]}}]}}]} as unknown as DocumentNode<UpdateDeliveryZoneMutation, UpdateDeliveryZoneMutationVariables>;
export const DeleteDeliveryZoneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteDeliveryZone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteDeliveryZone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteDeliveryZoneMutation, DeleteDeliveryZoneMutationVariables>;
export const GetDeliveryZonesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDeliveryZones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deliveryZones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"feeDelta"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetDeliveryZonesQuery, GetDeliveryZonesQueryVariables>;
export const GetDeliveryZoneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDeliveryZone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deliveryZone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"feeDelta"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetDeliveryZoneQuery, GetDeliveryZoneQueryVariables>;
export const CalculateDeliveryFeeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CalculateDeliveryFee"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"latitude"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"longitude"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseDeliveryFee"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"calculateDeliveryFee"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"latitude"},"value":{"kind":"Variable","name":{"kind":"Name","value":"latitude"}}},{"kind":"Argument","name":{"kind":"Name","value":"longitude"},"value":{"kind":"Variable","name":{"kind":"Name","value":"longitude"}}},{"kind":"Argument","name":{"kind":"Name","value":"baseDeliveryFee"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseDeliveryFee"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zone"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"feeDelta"}},{"kind":"Field","name":{"kind":"Name","value":"color"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalFee"}},{"kind":"Field","name":{"kind":"Name","value":"baseDeliveryFee"}}]}}]}}]} as unknown as DocumentNode<CalculateDeliveryFeeQuery, CalculateDeliveryFeeQueryVariables>;
export const UpdateOrderStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateOrderStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOrderStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UpdateOrderStatusMutation, UpdateOrderStatusMutationVariables>;
export const CancelOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<CancelOrderMutation, CancelOrderMutationVariables>;
export const AssignDriverToOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AssignDriverToOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignDriverToOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AssignDriverToOrderMutation, AssignDriverToOrderMutationVariables>;
export const GetOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"quantityInStock"}},{"kind":"Field","name":{"kind":"Name","value":"quantityNeeded"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrdersQuery, GetOrdersQueryVariables>;
export const GetOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"quantityInStock"}},{"kind":"Field","name":{"kind":"Name","value":"quantityNeeded"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrderQuery, GetOrderQueryVariables>;
export const GetOrdersByStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrdersByStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ordersByStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrdersByStatusQuery, GetOrdersByStatusQueryVariables>;
export const OrdersUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OrdersUpdated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userOrdersUpdated"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"quantityInStock"}},{"kind":"Field","name":{"kind":"Name","value":"quantityNeeded"}}]}}]}}]}}]}}]} as unknown as DocumentNode<OrdersUpdatedSubscription, OrdersUpdatedSubscriptionVariables>;
export const AllOrdersUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"AllOrdersUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allOrdersUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"quantityInStock"}},{"kind":"Field","name":{"kind":"Name","value":"quantityNeeded"}}]}}]}}]}}]}}]} as unknown as DocumentNode<AllOrdersUpdatedSubscription, AllOrdersUpdatedSubscriptionVariables>;
export const CreateProductCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProductCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProductCategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProductCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<CreateProductCategoryMutation, CreateProductCategoryMutationVariables>;
export const UpdateProductCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProductCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProductCategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProductCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<UpdateProductCategoryMutation, UpdateProductCategoryMutationVariables>;
export const DeleteProductCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProductCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProductCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteProductCategoryMutation, DeleteProductCategoryMutationVariables>;
export const ProductCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<ProductCategoriesQuery, ProductCategoriesQueryVariables>;
export const CreateProductSubcategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProductSubcategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProductSubcategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProductSubcategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<CreateProductSubcategoryMutation, CreateProductSubcategoryMutationVariables>;
export const UpdateProductSubcategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProductSubcategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProductSubcategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProductSubcategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<UpdateProductSubcategoryMutation, UpdateProductSubcategoryMutationVariables>;
export const DeleteProductSubcategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProductSubcategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProductSubcategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteProductSubcategoryMutation, DeleteProductSubcategoryMutationVariables>;
export const ProductSubcategoriesByBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductSubcategoriesByBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productSubcategoriesByBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ProductSubcategoriesByBusinessQuery, ProductSubcategoriesByBusinessQueryVariables>;
export const CreateProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateProductMutation, CreateProductMutationVariables>;
export const UpdateProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stock"}}]}}]}}]} as unknown as DocumentNode<UpdateProductMutation, UpdateProductMutationVariables>;
export const DeleteProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteProductMutation, DeleteProductMutationVariables>;
export const UpdateProductsOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProductsOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"products"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ProductOrderInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProductsOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"products"},"value":{"kind":"Variable","name":{"kind":"Name","value":"products"}}}]}]}}]} as unknown as DocumentNode<UpdateProductsOrderMutation, UpdateProductsOrderMutationVariables>;
export const ProductsAndCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductsAndCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"subcategoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isOnSale"}},{"kind":"Field","name":{"kind":"Name","value":"salePrice"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"stock"}}]}}]}}]} as unknown as DocumentNode<ProductsAndCategoriesQuery, ProductsAndCategoriesQueryVariables>;
export const CreatePromotionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePromotion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreatePromotionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPromotion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"maxRedemptions"}},{"kind":"Field","name":{"kind":"Name","value":"maxRedemptionsPerUser"}},{"kind":"Field","name":{"kind":"Name","value":"freeDeliveryCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstOrderOnly"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"autoApply"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"referrerUserId"}},{"kind":"Field","name":{"kind":"Name","value":"targetUserIds"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreatePromotionMutation, CreatePromotionMutationVariables>;
export const UpdatePromotionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePromotion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdatePromotionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePromotion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"maxRedemptions"}},{"kind":"Field","name":{"kind":"Name","value":"maxRedemptionsPerUser"}},{"kind":"Field","name":{"kind":"Name","value":"freeDeliveryCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstOrderOnly"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"autoApply"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"referrerUserId"}},{"kind":"Field","name":{"kind":"Name","value":"targetUserIds"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdatePromotionMutation, UpdatePromotionMutationVariables>;
export const DeletePromotionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePromotion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePromotion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeletePromotionMutation, DeletePromotionMutationVariables>;
export const GetPromotionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPromotions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"promotions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"maxRedemptions"}},{"kind":"Field","name":{"kind":"Name","value":"maxRedemptionsPerUser"}},{"kind":"Field","name":{"kind":"Name","value":"freeDeliveryCount"}},{"kind":"Field","name":{"kind":"Name","value":"firstOrderOnly"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"autoApply"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"referrerUserId"}},{"kind":"Field","name":{"kind":"Name","value":"targetUserIds"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetPromotionsQuery, GetPromotionsQueryVariables>;
export const GetSettlementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSettlements"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SettlementType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SettlementStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settlements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}},{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"order"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}}]}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"paidAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetSettlementsQuery, GetSettlementsQueryVariables>;
export const GetSettlementSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSettlementSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SettlementType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settlementSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}},{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"totalPending"}},{"kind":"Field","name":{"kind":"Name","value":"totalPaid"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCount"}}]}}]}}]} as unknown as DocumentNode<GetSettlementSummaryQuery, GetSettlementSummaryQueryVariables>;
export const GetDriverBalanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDriverBalance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"driverBalance"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"totalPending"}},{"kind":"Field","name":{"kind":"Name","value":"totalPaid"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCount"}}]}}]}}]} as unknown as DocumentNode<GetDriverBalanceQuery, GetDriverBalanceQueryVariables>;
export const GetBusinessBalanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinessBalance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businessBalance"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"totalPending"}},{"kind":"Field","name":{"kind":"Name","value":"totalPaid"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCount"}}]}}]}}]} as unknown as DocumentNode<GetBusinessBalanceQuery, GetBusinessBalanceQueryVariables>;
export const GetDriversWithBalanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDriversWithBalance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"drivers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"commissionPercentage"}}]}}]}}]} as unknown as DocumentNode<GetDriversWithBalanceQuery, GetDriversWithBalanceQueryVariables>;
export const GetBusinessesWithBalanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinessesWithBalance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"commissionPercentage"}}]}}]}}]} as unknown as DocumentNode<GetBusinessesWithBalanceQuery, GetBusinessesWithBalanceQueryVariables>;
export const UpdateCommissionPercentageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCommissionPercentage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"percentage"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCommissionPercentage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}},{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"percentage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"percentage"}}}]}]}}]} as unknown as DocumentNode<UpdateCommissionPercentageMutation, UpdateCommissionPercentageMutationVariables>;
export const MarkSettlementAsPaidDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkSettlementAsPaid"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settlementId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markSettlementAsPaid"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"settlementId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settlementId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"paidAt"}}]}}]}}]} as unknown as DocumentNode<MarkSettlementAsPaidMutation, MarkSettlementAsPaidMutationVariables>;
export const MarkSettlementsAsPaidDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkSettlementsAsPaid"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markSettlementsAsPaid"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"paidAt"}}]}}]}}]} as unknown as DocumentNode<MarkSettlementsAsPaidMutation, MarkSettlementsAsPaidMutationVariables>;
export const MarkSettlementAsPartiallyPaidDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkSettlementAsPartiallyPaid"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settlementId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"amount"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markSettlementAsPartiallyPaid"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"settlementId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settlementId"}}},{"kind":"Argument","name":{"kind":"Name","value":"amount"},"value":{"kind":"Variable","name":{"kind":"Name","value":"amount"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"paidAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<MarkSettlementAsPartiallyPaidMutation, MarkSettlementAsPartiallyPaidMutationVariables>;
export const BackfillSettlementsForDeliveredOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BackfillSettlementsForDeliveredOrders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"backfillSettlementsForDeliveredOrders"}}]}}]} as unknown as DocumentNode<BackfillSettlementsForDeliveredOrdersMutation, BackfillSettlementsForDeliveredOrdersMutationVariables>;
export const UnsettleSettlementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnsettleSettlement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settlementId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unsettleSettlement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"settlementId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settlementId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"paidAt"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]} as unknown as DocumentNode<UnsettleSettlementMutation, UnsettleSettlementMutationVariables>;
export const CreateUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"firstName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"lastName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<CreateUserMutation, CreateUserMutationVariables>;
export const UpdateUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"firstName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"lastName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateUserMutation, UpdateUserMutationVariables>;
export const DeleteUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteUserMutation, DeleteUserMutationVariables>;
export const UpdateUserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"flagColor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}},{"kind":"Argument","name":{"kind":"Name","value":"flagColor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"flagColor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"adminNote"}},{"kind":"Field","name":{"kind":"Name","value":"flagColor"}}]}}]}}]} as unknown as DocumentNode<UpdateUserNoteMutation, UpdateUserNoteMutationVariables>;
export const AdminUpdateDriverLocationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateDriverLocation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"latitude"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"longitude"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUpdateDriverLocation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}},{"kind":"Argument","name":{"kind":"Name","value":"latitude"},"value":{"kind":"Variable","name":{"kind":"Name","value":"latitude"}}},{"kind":"Argument","name":{"kind":"Name","value":"longitude"},"value":{"kind":"Variable","name":{"kind":"Name","value":"longitude"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}}]}}]}}]} as unknown as DocumentNode<AdminUpdateDriverLocationMutation, AdminUpdateDriverLocationMutationVariables>;
export const UpdateDriverOnlineStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDriverOnlineStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isOnline"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDriverOnlineStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"isOnline"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isOnline"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isOnline"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode<UpdateDriverOnlineStatusMutation, UpdateDriverOnlineStatusMutationVariables>;
export const UsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"adminNote"}},{"kind":"Field","name":{"kind":"Name","value":"flagColor"}},{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<UsersQuery, UsersQueryVariables>;
export const DriversDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Drivers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"drivers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"onlinePreference"}},{"kind":"Field","name":{"kind":"Name","value":"connectionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lastHeartbeatAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastLocationUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"disconnectedAt"}}]}}]}}]}}]} as unknown as DocumentNode<DriversQuery, DriversQueryVariables>;
export const UserBehaviorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserBehavior"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userBehavior"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"totalOrders"}},{"kind":"Field","name":{"kind":"Name","value":"deliveredOrders"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledOrders"}},{"kind":"Field","name":{"kind":"Name","value":"totalSpend"}},{"kind":"Field","name":{"kind":"Name","value":"avgOrderValue"}},{"kind":"Field","name":{"kind":"Name","value":"firstOrderAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastOrderAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastDeliveredAt"}}]}}]}}]} as unknown as DocumentNode<UserBehaviorQuery, UserBehaviorQueryVariables>;
export const DriversUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"DriversUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"driversUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"onlinePreference"}},{"kind":"Field","name":{"kind":"Name","value":"connectionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lastHeartbeatAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastLocationUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"disconnectedAt"}}]}}]}}]}}]} as unknown as DocumentNode<DriversUpdatedSubscription, DriversUpdatedSubscriptionVariables>;