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
  JSON: { input: any; output: any; }
};

export type ActionType =
  | 'BUSINESS_APPROVED'
  | 'BUSINESS_CREATED'
  | 'BUSINESS_DELETED'
  | 'BUSINESS_REJECTED'
  | 'BUSINESS_UPDATED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_DELETED'
  | 'CATEGORY_UPDATED'
  | 'DRIVER_APPROVED'
  | 'DRIVER_CREATED'
  | 'DRIVER_REJECTED'
  | 'DRIVER_STATUS_CHANGED'
  | 'DRIVER_UPDATED'
  | 'ORDER_ASSIGNED'
  | 'ORDER_CANCELLED'
  | 'ORDER_CREATED'
  | 'ORDER_DELIVERED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_UPDATED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'PRODUCT_AVAILABILITY_CHANGED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_DELETED'
  | 'PRODUCT_PRICE_CHANGED'
  | 'PRODUCT_PUBLISHED'
  | 'PRODUCT_UNPUBLISHED'
  | 'PRODUCT_UPDATED'
  | 'SETTLEMENT_CREATED'
  | 'SETTLEMENT_PAID'
  | 'SETTLEMENT_PARTIAL_PAID'
  | 'SETTLEMENT_UNSETTLED'
  | 'SUBCATEGORY_CREATED'
  | 'SUBCATEGORY_DELETED'
  | 'SUBCATEGORY_UPDATED'
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_ROLE_CHANGED'
  | 'USER_UPDATED';

export type ActorType =
  | 'ADMIN'
  | 'BUSINESS'
  | 'CUSTOMER'
  | 'DRIVER'
  | 'SYSTEM';

export type AddUserAddressInput = {
  addressName?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  priority?: InputMaybe<Scalars['Int']['input']>;
};

export type AddWalletCreditInput = {
  amount: Scalars['Float']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  type: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};

export type ApplicablePromotion = {
  __typename?: 'ApplicablePromotion';
  appliedAmount: Scalars['Float']['output'];
  code?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  freeDelivery: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  priority: Scalars['Int']['output'];
  target: PromotionTarget;
  type: PromotionType;
};

export type AssignPromotionToUserInput = {
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  promotionId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']>;
};

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
  schedule: Array<BusinessDayHours>;
  updatedAt: Scalars['Date']['output'];
  workingHours: WorkingHours;
};

export type BusinessDayHours = {
  __typename?: 'BusinessDayHours';
  closesAt: Scalars['String']['output'];
  dayOfWeek: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  opensAt: Scalars['String']['output'];
};

export type BusinessDayHoursInput = {
  closesAt: Scalars['String']['input'];
  dayOfWeek: Scalars['Int']['input'];
  opensAt: Scalars['String']['input'];
};

export type BusinessType =
  | 'MARKET'
  | 'PHARMACY'
  | 'RESTAURANT';

export type CartContextInput = {
  businessIds: Array<Scalars['ID']['input']>;
  deliveryPrice: Scalars['Float']['input'];
  items: Array<CartItemInput>;
  subtotal: Scalars['Float']['input'];
};

export type CartItemInput = {
  businessId: Scalars['ID']['input'];
  price: Scalars['Float']['input'];
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
};

export type CreateBusinessInput = {
  avgPrepTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  businessType: BusinessType;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  location: LocationInput;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  workingHours: WorkingHoursInput;
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
  code?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  discountValue?: InputMaybe<Scalars['Float']['input']>;
  eligibleBusinessIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  endsAt?: InputMaybe<Scalars['String']['input']>;
  isActive: Scalars['Boolean']['input'];
  isStackable: Scalars['Boolean']['input'];
  maxDiscountCap?: InputMaybe<Scalars['Float']['input']>;
  maxGlobalUsage?: InputMaybe<Scalars['Int']['input']>;
  maxUsagePerUser?: InputMaybe<Scalars['Int']['input']>;
  minOrderAmount?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  priority: Scalars['Int']['input'];
  spendThreshold?: InputMaybe<Scalars['Float']['input']>;
  startsAt?: InputMaybe<Scalars['String']['input']>;
  target: PromotionTarget;
  targetUserIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  thresholdReward?: InputMaybe<Scalars['String']['input']>;
  type: PromotionType;
};

export type CreateUserInput = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  role: UserRole;
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

export type DriverDailyMetrics = {
  __typename?: 'DriverDailyMetrics';
  /** Number of active (uncompleted) orders this driver currently has */
  activeOrdersCount: Scalars['Int']['output'];
  /** Commission rate as a percentage (e.g. 10.0 for 10%) */
  commissionPercentage: Scalars['Float']['output'];
  /** Driver's current connection status */
  connectionStatus: DriverConnectionStatus;
  /** Number of orders delivered today */
  deliveredTodayCount: Scalars['Int']['output'];
  /** Total delivery earnings today (before commission deduction) */
  grossEarningsToday: Scalars['Float']['output'];
  /** Whether the driver is currently online (online preference) */
  isOnline: Scalars['Boolean']['output'];
  /** Driver's personal maximum active orders limit */
  maxActiveOrders: Scalars['Int']['output'];
  /** Driver's net earnings today (after commission deduction) */
  netEarningsToday: Scalars['Float']['output'];
};

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

export type EntityType =
  | 'BUSINESS'
  | 'CATEGORY'
  | 'DELIVERY_ZONE'
  | 'DRIVER'
  | 'ORDER'
  | 'PRODUCT'
  | 'SETTLEMENT'
  | 'SUBCATEGORY'
  | 'USER';

export type InitiateSignupInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  referralCode?: InputMaybe<Scalars['String']['input']>;
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
  addUserAddress: UserAddress;
  addWalletCredit: WalletTransaction;
  /** Admin mutation to manually set connection status (for testing/recovery) */
  adminSetDriverConnectionStatus: User;
  adminUpdateDriverLocation: User;
  /** Admin mutation to update per-driver settings (commission %, max active orders) */
  adminUpdateDriverSettings: User;
  assignDriverToOrder: Order;
  assignPromotionToUsers: Array<UserPromotion>;
  backfillSettlementsForDeliveredOrders: Scalars['Int']['output'];
  cancelOrder: Order;
  createBusiness: Business;
  createOrder: Order;
  createProduct: Product;
  createProductCategory: ProductCategory;
  createProductSubcategory: ProductSubcategory;
  createPromotion: Promotion;
  createTestOrder: Order;
  createUser: AuthResponse;
  deductWalletCredit: WalletTransaction;
  deleteBusiness: Scalars['Boolean']['output'];
  deleteProduct: Scalars['Boolean']['output'];
  deleteProductCategory: Scalars['Boolean']['output'];
  deleteProductSubcategory: Scalars['Boolean']['output'];
  deletePromotion: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  deleteUserAddress: Scalars['Boolean']['output'];
  /**
   * Driver heartbeat - call every 5 seconds while online.
   * Updates lastHeartbeatAt and connectionStatus to CONNECTED.
   * Location is throttled: only written if >10s since last write OR moved >5m.
   */
  driverHeartbeat: DriverHeartbeatResult;
  generateReferralCode: Scalars['String']['output'];
  initiateSignup: AuthResponse;
  login: AuthResponse;
  markFirstOrderUsed: UserPromoMetadata;
  markSettlementAsPaid: Settlement;
  markSettlementAsPartiallyPaid: Settlement;
  markSettlementsAsPaid: Array<Settlement>;
  removeUserFromPromotion: Scalars['Boolean']['output'];
  resendEmailVerification: SignupStepResponse;
  setBusinessSchedule: Array<BusinessDayHours>;
  setDefaultAddress: Scalars['Boolean']['output'];
  setUserPermissions: User;
  submitPhoneNumber: SignupStepResponse;
  unsettleSettlement: Settlement;
  updateBusiness: Business;
  updateCommissionPercentage: Scalars['Boolean']['output'];
  updateDriverLocation: User;
  updateDriverOnlineStatus: User;
  updateOrderStatus: Order;
  updateProduct: Product;
  updateProductCategory: ProductCategory;
  updateProductSubcategory: ProductSubcategory;
  updateProductsOrder: Scalars['Boolean']['output'];
  updatePromotion: Promotion;
  updateStoreStatus: StoreStatus;
  updateUser: User;
  updateUserAddress: UserAddress;
  updateUserNote: User;
  verifyEmail: SignupStepResponse;
  verifyPhone: SignupStepResponse;
};


export type MutationaddUserAddressArgs = {
  input: AddUserAddressInput;
};


export type MutationaddWalletCreditArgs = {
  input: AddWalletCreditInput;
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


export type MutationadminUpdateDriverSettingsArgs = {
  commissionPercentage?: InputMaybe<Scalars['Float']['input']>;
  driverId: Scalars['ID']['input'];
  maxActiveOrders?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationassignDriverToOrderArgs = {
  driverId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationassignPromotionToUsersArgs = {
  input: AssignPromotionToUserInput;
};


export type MutationcancelOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationcreateBusinessArgs = {
  input: CreateBusinessInput;
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


export type MutationcreatePromotionArgs = {
  input: CreatePromotionInput;
};


export type MutationcreateUserArgs = {
  input: CreateUserInput;
};


export type MutationdeductWalletCreditArgs = {
  amount: Scalars['Float']['input'];
  orderId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
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


export type MutationdeleteProductSubcategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeletePromotionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteUserAddressArgs = {
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


export type MutationmarkFirstOrderUsedArgs = {
  userId: Scalars['ID']['input'];
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


export type MutationremoveUserFromPromotionArgs = {
  promotionId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationsetBusinessScheduleArgs = {
  businessId: Scalars['ID']['input'];
  schedule: Array<BusinessDayHoursInput>;
};


export type MutationsetDefaultAddressArgs = {
  id: Scalars['ID']['input'];
};


export type MutationsetUserPermissionsArgs = {
  permissions: Array<UserPermission>;
  userId: Scalars['ID']['input'];
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


export type MutationupdatePromotionArgs = {
  input: UpdatePromotionInput;
};


export type MutationupdateStoreStatusArgs = {
  input: UpdateStoreStatusInput;
};


export type MutationupdateUserArgs = {
  input: UpdateUserInput;
};


export type MutationupdateUserAddressArgs = {
  input: UpdateUserAddressInput;
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
  orderPromotions?: Maybe<Array<OrderPromotion>>;
  originalDeliveryPrice?: Maybe<Scalars['Float']['output']>;
  originalPrice?: Maybe<Scalars['Float']['output']>;
  pickupLocations: Array<Location>;
  status: OrderStatus;
  totalPrice: Scalars['Float']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
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

export type OrderPromotion = {
  __typename?: 'OrderPromotion';
  appliesTo: PromotionAppliesTo;
  discountAmount: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  promotionId: Scalars['ID']['output'];
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

export type Promotion = {
  __typename?: 'Promotion';
  assignedUsers?: Maybe<Array<UserPromotion>>;
  code?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  currentGlobalUsage: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  discountValue?: Maybe<Scalars['Float']['output']>;
  eligibleBusinesses?: Maybe<Array<Business>>;
  endsAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isStackable: Scalars['Boolean']['output'];
  maxDiscountCap?: Maybe<Scalars['Float']['output']>;
  maxGlobalUsage?: Maybe<Scalars['Int']['output']>;
  maxUsagePerUser?: Maybe<Scalars['Int']['output']>;
  minOrderAmount?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  priority: Scalars['Int']['output'];
  spendThreshold?: Maybe<Scalars['Float']['output']>;
  startsAt?: Maybe<Scalars['String']['output']>;
  target: PromotionTarget;
  thresholdReward?: Maybe<Scalars['String']['output']>;
  totalRevenue: Scalars['Float']['output'];
  totalUsageCount: Scalars['Int']['output'];
  type: PromotionType;
};

export type PromotionAnalyticsResult = {
  __typename?: 'PromotionAnalyticsResult';
  averageOrderValue: Scalars['Float']['output'];
  conversionRate?: Maybe<Scalars['Float']['output']>;
  promotion: Promotion;
  totalDiscountGiven: Scalars['Float']['output'];
  totalRevenue: Scalars['Float']['output'];
  totalUsageCount: Scalars['Int']['output'];
  uniqueUsers: Scalars['Int']['output'];
};

export type PromotionAppliesTo =
  | 'DELIVERY'
  | 'PRICE';

export type PromotionResult = {
  __typename?: 'PromotionResult';
  finalDeliveryPrice: Scalars['Float']['output'];
  finalSubtotal: Scalars['Float']['output'];
  finalTotal: Scalars['Float']['output'];
  freeDeliveryApplied: Scalars['Boolean']['output'];
  promotions: Array<ApplicablePromotion>;
  totalDiscount: Scalars['Float']['output'];
};

export type PromotionTarget =
  | 'ALL_USERS'
  | 'CONDITIONAL'
  | 'FIRST_ORDER'
  | 'SPECIFIC_USERS';

export type PromotionThreshold = {
  __typename?: 'PromotionThreshold';
  code?: Maybe<Scalars['String']['output']>;
  eligibleBusinessIds?: Maybe<Array<Scalars['ID']['output']>>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  priority: Scalars['Int']['output'];
  spendThreshold: Scalars['Float']['output'];
};

export type PromotionType =
  | 'FIXED_AMOUNT'
  | 'FREE_DELIVERY'
  | 'PERCENTAGE'
  | 'WALLET_CREDIT';

export type PromotionUsage = {
  __typename?: 'PromotionUsage';
  businessId?: Maybe<Scalars['ID']['output']>;
  discountAmount: Scalars['Float']['output'];
  freeDeliveryApplied: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  order?: Maybe<Order>;
  orderId: Scalars['ID']['output'];
  orderSubtotal: Scalars['Float']['output'];
  promotion?: Maybe<Promotion>;
  promotionId: Scalars['ID']['output'];
  usedAt: Scalars['String']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  auditLog?: Maybe<AuditLog>;
  auditLogs: AuditLogConnection;
  business?: Maybe<Business>;
  businessBalance: SettlementSummary;
  businesses: Array<Business>;
  driverBalance: SettlementSummary;
  drivers: Array<User>;
  getAllPromotions: Array<Promotion>;
  getApplicablePromotions: Array<ApplicablePromotion>;
  getPromotion?: Maybe<Promotion>;
  getPromotionAnalytics: PromotionAnalyticsResult;
  getPromotionThresholds: Array<PromotionThreshold>;
  getPromotionUsage: Array<PromotionUsage>;
  getStoreStatus: StoreStatus;
  getUserPromoMetadata?: Maybe<UserPromoMetadata>;
  getUserPromotions: Array<UserPromotion>;
  getUserWallet?: Maybe<UserWallet>;
  getWalletTransactions: Array<WalletTransaction>;
  me?: Maybe<User>;
  myAddresses: Array<UserAddress>;
  myBehavior?: Maybe<UserBehavior>;
  /** Get live metrics for the authenticated driver */
  myDriverMetrics: DriverDailyMetrics;
  myReferralStats: ReferralStats;
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
  userBehavior?: Maybe<UserBehavior>;
  users: Array<User>;
  validatePromotions: PromotionResult;
};


export type QueryauditLogArgs = {
  id: Scalars['ID']['input'];
};


export type QueryauditLogsArgs = {
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


export type QuerybusinessArgs = {
  id: Scalars['ID']['input'];
};


export type QuerybusinessBalanceArgs = {
  businessId: Scalars['ID']['input'];
};


export type QuerydriverBalanceArgs = {
  driverId: Scalars['ID']['input'];
};


export type QuerygetAllPromotionsArgs = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QuerygetApplicablePromotionsArgs = {
  cart: CartContextInput;
  manualCode?: InputMaybe<Scalars['String']['input']>;
};


export type QuerygetPromotionArgs = {
  id: Scalars['ID']['input'];
};


export type QuerygetPromotionAnalyticsArgs = {
  promotionId: Scalars['ID']['input'];
};


export type QuerygetPromotionThresholdsArgs = {
  cart: CartContextInput;
};


export type QuerygetPromotionUsageArgs = {
  promotionId: Scalars['ID']['input'];
};


export type QuerygetUserPromoMetadataArgs = {
  userId: Scalars['ID']['input'];
};


export type QuerygetUserPromotionsArgs = {
  userId: Scalars['ID']['input'];
};


export type QuerygetUserWalletArgs = {
  userId: Scalars['ID']['input'];
};


export type QuerygetWalletTransactionsArgs = {
  userId: Scalars['ID']['input'];
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


export type QueryuserBehaviorArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryvalidatePromotionsArgs = {
  cart: CartContextInput;
  manualCode?: InputMaybe<Scalars['String']['input']>;
};

export type Referral = {
  __typename?: 'Referral';
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  referralCode: Scalars['String']['output'];
  referredUser?: Maybe<User>;
  referredUserId?: Maybe<Scalars['ID']['output']>;
  referrerUserId: Scalars['ID']['output'];
  rewardAmount?: Maybe<Scalars['Float']['output']>;
  rewardGiven: Scalars['Boolean']['output'];
  status: ReferralStatus;
};

export type ReferralStats = {
  __typename?: 'ReferralStats';
  completedReferrals: Scalars['Int']['output'];
  pendingReferrals: Scalars['Int']['output'];
  referralCode: Scalars['String']['output'];
  referrals: Array<Referral>;
  totalReferrals: Scalars['Int']['output'];
  totalRewardsEarned: Scalars['Float']['output'];
};

export type ReferralStatus =
  | 'COMPLETED'
  | 'EXPIRED'
  | 'PENDING';

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

export type StoreStatus = {
  __typename?: 'StoreStatus';
  closedMessage?: Maybe<Scalars['String']['output']>;
  isStoreClosed: Scalars['Boolean']['output'];
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


export type SubscriptionauditLogCreatedArgs = {
  action?: InputMaybe<ActionType>;
  actorType?: InputMaybe<ActorType>;
  entityType?: InputMaybe<EntityType>;
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
  code?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  discountValue?: InputMaybe<Scalars['Float']['input']>;
  eligibleBusinessIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  endsAt?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isStackable?: InputMaybe<Scalars['Boolean']['input']>;
  maxDiscountCap?: InputMaybe<Scalars['Float']['input']>;
  maxGlobalUsage?: InputMaybe<Scalars['Int']['input']>;
  maxUsagePerUser?: InputMaybe<Scalars['Int']['input']>;
  minOrderAmount?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  spendThreshold?: InputMaybe<Scalars['Float']['input']>;
  startsAt?: InputMaybe<Scalars['String']['input']>;
  target?: InputMaybe<PromotionTarget>;
  thresholdReward?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<PromotionType>;
};

export type UpdateStoreStatusInput = {
  closedMessage?: InputMaybe<Scalars['String']['input']>;
  isStoreClosed: Scalars['Boolean']['input'];
};

export type UpdateUserAddressInput = {
  addressName?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
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
  maxActiveOrders?: Maybe<Scalars['Int']['output']>;
  permissions: Array<UserPermission>;
  phoneNumber?: Maybe<Scalars['String']['output']>;
  phoneVerified: Scalars['Boolean']['output'];
  referralCode?: Maybe<Scalars['String']['output']>;
  role: UserRole;
  signupStep: SignupStep;
};

export type UserAddress = {
  __typename?: 'UserAddress';
  addressName?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  priority: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
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

export type UserPermission =
  | 'manage_orders'
  | 'manage_products'
  | 'manage_settings'
  | 'view_analytics'
  | 'view_finances'
  | 'view_orders'
  | 'view_products';

export type UserPromoMetadata = {
  __typename?: 'UserPromoMetadata';
  hasUsedFirstOrderPromo: Scalars['Boolean']['output'];
  lastPromoUsedAt?: Maybe<Scalars['String']['output']>;
  totalPromosUsed: Scalars['Int']['output'];
  totalSavings: Scalars['Float']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export type UserPromotion = {
  __typename?: 'UserPromotion';
  assignedAt: Scalars['String']['output'];
  expiresAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  promotion?: Maybe<Promotion>;
  promotionId: Scalars['ID']['output'];
  usageCount: Scalars['Int']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export type UserRole =
  | 'ADMIN'
  | 'BUSINESS_EMPLOYEE'
  | 'BUSINESS_OWNER'
  | 'CUSTOMER'
  | 'DRIVER'
  | 'SUPER_ADMIN';

export type UserWallet = {
  __typename?: 'UserWallet';
  balance: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  transactions?: Maybe<Array<WalletTransaction>>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type VerifyEmailInput = {
  code: Scalars['String']['input'];
};

export type VerifyPhoneInput = {
  code: Scalars['String']['input'];
};

export type WalletTransaction = {
  __typename?: 'WalletTransaction';
  amount: Scalars['Float']['output'];
  balanceAfter: Scalars['Float']['output'];
  balanceBefore: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  orderId?: Maybe<Scalars['ID']['output']>;
  type: Scalars['String']['output'];
  wallet?: Maybe<UserWallet>;
  walletId: Scalars['ID']['output'];
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
  ActionType: ResolverTypeWrapper<'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_ROLE_CHANGED' | 'BUSINESS_CREATED' | 'BUSINESS_UPDATED' | 'BUSINESS_DELETED' | 'BUSINESS_APPROVED' | 'BUSINESS_REJECTED' | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED' | 'PRODUCT_PUBLISHED' | 'PRODUCT_UNPUBLISHED' | 'PRODUCT_AVAILABILITY_CHANGED' | 'PRODUCT_PRICE_CHANGED' | 'ORDER_CREATED' | 'ORDER_UPDATED' | 'ORDER_STATUS_CHANGED' | 'ORDER_CANCELLED' | 'ORDER_ASSIGNED' | 'ORDER_DELIVERED' | 'SETTLEMENT_CREATED' | 'SETTLEMENT_PAID' | 'SETTLEMENT_PARTIAL_PAID' | 'SETTLEMENT_UNSETTLED' | 'DRIVER_CREATED' | 'DRIVER_UPDATED' | 'DRIVER_APPROVED' | 'DRIVER_REJECTED' | 'DRIVER_STATUS_CHANGED' | 'USER_LOGIN' | 'USER_LOGOUT' | 'PASSWORD_CHANGED' | 'PASSWORD_RESET' | 'CATEGORY_CREATED' | 'CATEGORY_UPDATED' | 'CATEGORY_DELETED' | 'SUBCATEGORY_CREATED' | 'SUBCATEGORY_UPDATED' | 'SUBCATEGORY_DELETED'>;
  ActorType: ResolverTypeWrapper<'ADMIN' | 'BUSINESS' | 'DRIVER' | 'CUSTOMER' | 'SYSTEM'>;
  AddUserAddressInput: AddUserAddressInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  AddWalletCreditInput: AddWalletCreditInput;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ApplicablePromotion: ResolverTypeWrapper<Omit<ApplicablePromotion, 'target' | 'type'> & { target: ResolversTypes['PromotionTarget'], type: ResolversTypes['PromotionType'] }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  AssignPromotionToUserInput: AssignPromotionToUserInput;
  AuditLog: ResolverTypeWrapper<Omit<AuditLog, 'action' | 'actor' | 'actorType' | 'entityType'> & { action: ResolversTypes['ActionType'], actor?: Maybe<ResolversTypes['User']>, actorType: ResolversTypes['ActorType'], entityType: ResolversTypes['EntityType'] }>;
  AuditLogConnection: ResolverTypeWrapper<Omit<AuditLogConnection, 'logs'> & { logs: Array<ResolversTypes['AuditLog']> }>;
  AuthResponse: ResolverTypeWrapper<Omit<AuthResponse, 'user'> & { user: ResolversTypes['User'] }>;
  Business: ResolverTypeWrapper<Omit<Business, 'businessType'> & { businessType: ResolversTypes['BusinessType'] }>;
  BusinessDayHours: ResolverTypeWrapper<BusinessDayHours>;
  BusinessDayHoursInput: BusinessDayHoursInput;
  BusinessType: ResolverTypeWrapper<'MARKET' | 'PHARMACY' | 'RESTAURANT'>;
  CartContextInput: CartContextInput;
  CartItemInput: CartItemInput;
  CreateBusinessInput: CreateBusinessInput;
  CreateOrderInput: CreateOrderInput;
  CreateOrderItemInput: CreateOrderItemInput;
  CreateProductCategoryInput: CreateProductCategoryInput;
  CreateProductInput: CreateProductInput;
  CreateProductSubcategoryInput: CreateProductSubcategoryInput;
  CreatePromotionInput: CreatePromotionInput;
  CreateUserInput: CreateUserInput;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DriverConnection: ResolverTypeWrapper<Omit<DriverConnection, 'connectionStatus'> & { connectionStatus: ResolversTypes['DriverConnectionStatus'] }>;
  DriverConnectionStatus: ResolverTypeWrapper<'CONNECTED' | 'STALE' | 'LOST' | 'DISCONNECTED'>;
  DriverDailyMetrics: ResolverTypeWrapper<Omit<DriverDailyMetrics, 'connectionStatus'> & { connectionStatus: ResolversTypes['DriverConnectionStatus'] }>;
  DriverHeartbeatResult: ResolverTypeWrapper<Omit<DriverHeartbeatResult, 'connectionStatus'> & { connectionStatus: ResolversTypes['DriverConnectionStatus'] }>;
  EntityType: ResolverTypeWrapper<'USER' | 'BUSINESS' | 'PRODUCT' | 'ORDER' | 'SETTLEMENT' | 'DRIVER' | 'CATEGORY' | 'SUBCATEGORY' | 'DELIVERY_ZONE'>;
  InitiateSignupInput: InitiateSignupInput;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Location: ResolverTypeWrapper<Location>;
  LocationInput: LocationInput;
  LoginInput: LoginInput;
  Mutation: ResolverTypeWrapper<{}>;
  Order: ResolverTypeWrapper<Omit<Order, 'businesses' | 'driver' | 'orderPromotions' | 'status' | 'user'> & { businesses: Array<ResolversTypes['OrderBusiness']>, driver?: Maybe<ResolversTypes['User']>, orderPromotions?: Maybe<Array<ResolversTypes['OrderPromotion']>>, status: ResolversTypes['OrderStatus'], user?: Maybe<ResolversTypes['User']> }>;
  OrderBusiness: ResolverTypeWrapper<Omit<OrderBusiness, 'business'> & { business: ResolversTypes['Business'] }>;
  OrderItem: ResolverTypeWrapper<OrderItem>;
  OrderPromotion: ResolverTypeWrapper<Omit<OrderPromotion, 'appliesTo'> & { appliesTo: ResolversTypes['PromotionAppliesTo'] }>;
  OrderStatus: ResolverTypeWrapper<'PENDING' | 'ACCEPTED' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'>;
  Product: ResolverTypeWrapper<Product>;
  ProductCategory: ResolverTypeWrapper<ProductCategory>;
  ProductOrderInput: ProductOrderInput;
  ProductSubcategory: ResolverTypeWrapper<ProductSubcategory>;
  Promotion: ResolverTypeWrapper<Omit<Promotion, 'assignedUsers' | 'eligibleBusinesses' | 'target' | 'type'> & { assignedUsers?: Maybe<Array<ResolversTypes['UserPromotion']>>, eligibleBusinesses?: Maybe<Array<ResolversTypes['Business']>>, target: ResolversTypes['PromotionTarget'], type: ResolversTypes['PromotionType'] }>;
  PromotionAnalyticsResult: ResolverTypeWrapper<Omit<PromotionAnalyticsResult, 'promotion'> & { promotion: ResolversTypes['Promotion'] }>;
  PromotionAppliesTo: ResolverTypeWrapper<'PRICE' | 'DELIVERY'>;
  PromotionResult: ResolverTypeWrapper<Omit<PromotionResult, 'promotions'> & { promotions: Array<ResolversTypes['ApplicablePromotion']> }>;
  PromotionTarget: ResolverTypeWrapper<'ALL_USERS' | 'SPECIFIC_USERS' | 'FIRST_ORDER' | 'CONDITIONAL'>;
  PromotionThreshold: ResolverTypeWrapper<PromotionThreshold>;
  PromotionType: ResolverTypeWrapper<'FIXED_AMOUNT' | 'PERCENTAGE' | 'FREE_DELIVERY' | 'WALLET_CREDIT'>;
  PromotionUsage: ResolverTypeWrapper<Omit<PromotionUsage, 'order' | 'promotion' | 'user'> & { order?: Maybe<ResolversTypes['Order']>, promotion?: Maybe<ResolversTypes['Promotion']>, user?: Maybe<ResolversTypes['User']> }>;
  Query: ResolverTypeWrapper<{}>;
  Referral: ResolverTypeWrapper<Omit<Referral, 'referredUser' | 'status'> & { referredUser?: Maybe<ResolversTypes['User']>, status: ResolversTypes['ReferralStatus'] }>;
  ReferralStats: ResolverTypeWrapper<Omit<ReferralStats, 'referrals'> & { referrals: Array<ResolversTypes['Referral']> }>;
  ReferralStatus: ResolverTypeWrapper<'PENDING' | 'COMPLETED' | 'EXPIRED'>;
  Settlement: ResolverTypeWrapper<Omit<Settlement, 'business' | 'driver' | 'order' | 'status' | 'type'> & { business?: Maybe<ResolversTypes['Business']>, driver?: Maybe<ResolversTypes['User']>, order: ResolversTypes['Order'], status: ResolversTypes['SettlementStatus'], type: ResolversTypes['SettlementType'] }>;
  SettlementStatus: ResolverTypeWrapper<'PENDING' | 'PAID'>;
  SettlementSummary: ResolverTypeWrapper<SettlementSummary>;
  SettlementType: ResolverTypeWrapper<'DRIVER_PAYMENT' | 'BUSINESS_PAYMENT'>;
  SignupStep: ResolverTypeWrapper<'INITIAL' | 'EMAIL_SENT' | 'EMAIL_VERIFIED' | 'PHONE_SENT' | 'COMPLETED'>;
  SignupStepResponse: ResolverTypeWrapper<Omit<SignupStepResponse, 'currentStep'> & { currentStep: ResolversTypes['SignupStep'] }>;
  StoreStatus: ResolverTypeWrapper<StoreStatus>;
  SubmitPhoneNumberInput: SubmitPhoneNumberInput;
  Subscription: ResolverTypeWrapper<{}>;
  SubscriptionInput: SubscriptionInput;
  UpdateBusinessInput: UpdateBusinessInput;
  UpdateProductCategoryInput: UpdateProductCategoryInput;
  UpdateProductInput: UpdateProductInput;
  UpdateProductSubcategoryInput: UpdateProductSubcategoryInput;
  UpdatePromotionInput: UpdatePromotionInput;
  UpdateStoreStatusInput: UpdateStoreStatusInput;
  UpdateUserAddressInput: UpdateUserAddressInput;
  UpdateUserInput: UpdateUserInput;
  User: ResolverTypeWrapper<Omit<User, 'business' | 'driverConnection' | 'permissions' | 'role' | 'signupStep'> & { business?: Maybe<ResolversTypes['Business']>, driverConnection?: Maybe<ResolversTypes['DriverConnection']>, permissions: Array<ResolversTypes['UserPermission']>, role: ResolversTypes['UserRole'], signupStep: ResolversTypes['SignupStep'] }>;
  UserAddress: ResolverTypeWrapper<UserAddress>;
  UserBehavior: ResolverTypeWrapper<UserBehavior>;
  UserPermission: ResolverTypeWrapper<'view_orders' | 'manage_orders' | 'view_products' | 'manage_products' | 'view_finances' | 'manage_settings' | 'view_analytics'>;
  UserPromoMetadata: ResolverTypeWrapper<Omit<UserPromoMetadata, 'user'> & { user?: Maybe<ResolversTypes['User']> }>;
  UserPromotion: ResolverTypeWrapper<Omit<UserPromotion, 'promotion' | 'user'> & { promotion?: Maybe<ResolversTypes['Promotion']>, user?: Maybe<ResolversTypes['User']> }>;
  UserRole: ResolverTypeWrapper<'CUSTOMER' | 'DRIVER' | 'SUPER_ADMIN' | 'ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_EMPLOYEE'>;
  UserWallet: ResolverTypeWrapper<UserWallet>;
  VerifyEmailInput: VerifyEmailInput;
  VerifyPhoneInput: VerifyPhoneInput;
  WalletTransaction: ResolverTypeWrapper<WalletTransaction>;
  WorkingHours: ResolverTypeWrapper<WorkingHours>;
  WorkingHoursInput: WorkingHoursInput;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AddUserAddressInput: AddUserAddressInput;
  String: Scalars['String']['output'];
  Float: Scalars['Float']['output'];
  Int: Scalars['Int']['output'];
  AddWalletCreditInput: AddWalletCreditInput;
  ID: Scalars['ID']['output'];
  ApplicablePromotion: ApplicablePromotion;
  Boolean: Scalars['Boolean']['output'];
  AssignPromotionToUserInput: AssignPromotionToUserInput;
  AuditLog: Omit<AuditLog, 'actor'> & { actor?: Maybe<ResolversParentTypes['User']> };
  AuditLogConnection: Omit<AuditLogConnection, 'logs'> & { logs: Array<ResolversParentTypes['AuditLog']> };
  AuthResponse: Omit<AuthResponse, 'user'> & { user: ResolversParentTypes['User'] };
  Business: Business;
  BusinessDayHours: BusinessDayHours;
  BusinessDayHoursInput: BusinessDayHoursInput;
  CartContextInput: CartContextInput;
  CartItemInput: CartItemInput;
  CreateBusinessInput: CreateBusinessInput;
  CreateOrderInput: CreateOrderInput;
  CreateOrderItemInput: CreateOrderItemInput;
  CreateProductCategoryInput: CreateProductCategoryInput;
  CreateProductInput: CreateProductInput;
  CreateProductSubcategoryInput: CreateProductSubcategoryInput;
  CreatePromotionInput: CreatePromotionInput;
  CreateUserInput: CreateUserInput;
  Date: Scalars['Date']['output'];
  DateTime: Scalars['DateTime']['output'];
  DriverConnection: DriverConnection;
  DriverDailyMetrics: DriverDailyMetrics;
  DriverHeartbeatResult: DriverHeartbeatResult;
  InitiateSignupInput: InitiateSignupInput;
  JSON: Scalars['JSON']['output'];
  Location: Location;
  LocationInput: LocationInput;
  LoginInput: LoginInput;
  Mutation: {};
  Order: Omit<Order, 'businesses' | 'driver' | 'orderPromotions' | 'user'> & { businesses: Array<ResolversParentTypes['OrderBusiness']>, driver?: Maybe<ResolversParentTypes['User']>, orderPromotions?: Maybe<Array<ResolversParentTypes['OrderPromotion']>>, user?: Maybe<ResolversParentTypes['User']> };
  OrderBusiness: Omit<OrderBusiness, 'business'> & { business: ResolversParentTypes['Business'] };
  OrderItem: OrderItem;
  OrderPromotion: OrderPromotion;
  Product: Product;
  ProductCategory: ProductCategory;
  ProductOrderInput: ProductOrderInput;
  ProductSubcategory: ProductSubcategory;
  Promotion: Omit<Promotion, 'assignedUsers' | 'eligibleBusinesses'> & { assignedUsers?: Maybe<Array<ResolversParentTypes['UserPromotion']>>, eligibleBusinesses?: Maybe<Array<ResolversParentTypes['Business']>> };
  PromotionAnalyticsResult: Omit<PromotionAnalyticsResult, 'promotion'> & { promotion: ResolversParentTypes['Promotion'] };
  PromotionResult: Omit<PromotionResult, 'promotions'> & { promotions: Array<ResolversParentTypes['ApplicablePromotion']> };
  PromotionThreshold: PromotionThreshold;
  PromotionUsage: Omit<PromotionUsage, 'order' | 'promotion' | 'user'> & { order?: Maybe<ResolversParentTypes['Order']>, promotion?: Maybe<ResolversParentTypes['Promotion']>, user?: Maybe<ResolversParentTypes['User']> };
  Query: {};
  Referral: Omit<Referral, 'referredUser'> & { referredUser?: Maybe<ResolversParentTypes['User']> };
  ReferralStats: Omit<ReferralStats, 'referrals'> & { referrals: Array<ResolversParentTypes['Referral']> };
  Settlement: Omit<Settlement, 'business' | 'driver' | 'order'> & { business?: Maybe<ResolversParentTypes['Business']>, driver?: Maybe<ResolversParentTypes['User']>, order: ResolversParentTypes['Order'] };
  SettlementSummary: SettlementSummary;
  SignupStepResponse: SignupStepResponse;
  StoreStatus: StoreStatus;
  SubmitPhoneNumberInput: SubmitPhoneNumberInput;
  Subscription: {};
  SubscriptionInput: SubscriptionInput;
  UpdateBusinessInput: UpdateBusinessInput;
  UpdateProductCategoryInput: UpdateProductCategoryInput;
  UpdateProductInput: UpdateProductInput;
  UpdateProductSubcategoryInput: UpdateProductSubcategoryInput;
  UpdatePromotionInput: UpdatePromotionInput;
  UpdateStoreStatusInput: UpdateStoreStatusInput;
  UpdateUserAddressInput: UpdateUserAddressInput;
  UpdateUserInput: UpdateUserInput;
  User: Omit<User, 'business' | 'driverConnection'> & { business?: Maybe<ResolversParentTypes['Business']>, driverConnection?: Maybe<ResolversParentTypes['DriverConnection']> };
  UserAddress: UserAddress;
  UserBehavior: UserBehavior;
  UserPromoMetadata: Omit<UserPromoMetadata, 'user'> & { user?: Maybe<ResolversParentTypes['User']> };
  UserPromotion: Omit<UserPromotion, 'promotion' | 'user'> & { promotion?: Maybe<ResolversParentTypes['Promotion']>, user?: Maybe<ResolversParentTypes['User']> };
  UserWallet: UserWallet;
  VerifyEmailInput: VerifyEmailInput;
  VerifyPhoneInput: VerifyPhoneInput;
  WalletTransaction: WalletTransaction;
  WorkingHours: WorkingHours;
  WorkingHoursInput: WorkingHoursInput;
};

export type skipAuthDirectiveArgs = { };

export type skipAuthDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = skipAuthDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ActionTypeResolvers = EnumResolverSignature<{ BUSINESS_APPROVED?: any, BUSINESS_CREATED?: any, BUSINESS_DELETED?: any, BUSINESS_REJECTED?: any, BUSINESS_UPDATED?: any, CATEGORY_CREATED?: any, CATEGORY_DELETED?: any, CATEGORY_UPDATED?: any, DRIVER_APPROVED?: any, DRIVER_CREATED?: any, DRIVER_REJECTED?: any, DRIVER_STATUS_CHANGED?: any, DRIVER_UPDATED?: any, ORDER_ASSIGNED?: any, ORDER_CANCELLED?: any, ORDER_CREATED?: any, ORDER_DELIVERED?: any, ORDER_STATUS_CHANGED?: any, ORDER_UPDATED?: any, PASSWORD_CHANGED?: any, PASSWORD_RESET?: any, PRODUCT_AVAILABILITY_CHANGED?: any, PRODUCT_CREATED?: any, PRODUCT_DELETED?: any, PRODUCT_PRICE_CHANGED?: any, PRODUCT_PUBLISHED?: any, PRODUCT_UNPUBLISHED?: any, PRODUCT_UPDATED?: any, SETTLEMENT_CREATED?: any, SETTLEMENT_PAID?: any, SETTLEMENT_PARTIAL_PAID?: any, SETTLEMENT_UNSETTLED?: any, SUBCATEGORY_CREATED?: any, SUBCATEGORY_DELETED?: any, SUBCATEGORY_UPDATED?: any, USER_CREATED?: any, USER_DELETED?: any, USER_LOGIN?: any, USER_LOGOUT?: any, USER_ROLE_CHANGED?: any, USER_UPDATED?: any }, ResolversTypes['ActionType']>;

export type ActorTypeResolvers = EnumResolverSignature<{ ADMIN?: any, BUSINESS?: any, CUSTOMER?: any, DRIVER?: any, SYSTEM?: any }, ResolversTypes['ActorType']>;

export type ApplicablePromotionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ApplicablePromotion'] = ResolversParentTypes['ApplicablePromotion']> = {
  appliedAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  freeDelivery?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  target?: Resolver<ResolversTypes['PromotionTarget'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['PromotionType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuditLogResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuditLog'] = ResolversParentTypes['AuditLog']> = {
  action?: Resolver<ResolversTypes['ActionType'], ParentType, ContextType>;
  actor?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  actorId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  actorType?: Resolver<ResolversTypes['ActorType'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  entityType?: Resolver<ResolversTypes['EntityType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  ipAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  userAgent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuditLogConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuditLogConnection'] = ResolversParentTypes['AuditLogConnection']> = {
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  logs?: Resolver<Array<ResolversTypes['AuditLog']>, ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

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
  schedule?: Resolver<Array<ResolversTypes['BusinessDayHours']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  workingHours?: Resolver<ResolversTypes['WorkingHours'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessDayHoursResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BusinessDayHours'] = ResolversParentTypes['BusinessDayHours']> = {
  closesAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dayOfWeek?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  opensAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessTypeResolvers = EnumResolverSignature<{ MARKET?: any, PHARMACY?: any, RESTAURANT?: any }, ResolversTypes['BusinessType']>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DriverConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverConnection'] = ResolversParentTypes['DriverConnection']> = {
  connectionStatus?: Resolver<ResolversTypes['DriverConnectionStatus'], ParentType, ContextType>;
  disconnectedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  lastHeartbeatAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  lastLocationUpdate?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  onlinePreference?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverConnectionStatusResolvers = EnumResolverSignature<{ CONNECTED?: any, DISCONNECTED?: any, LOST?: any, STALE?: any }, ResolversTypes['DriverConnectionStatus']>;

export type DriverDailyMetricsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverDailyMetrics'] = ResolversParentTypes['DriverDailyMetrics']> = {
  activeOrdersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  commissionPercentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  connectionStatus?: Resolver<ResolversTypes['DriverConnectionStatus'], ParentType, ContextType>;
  deliveredTodayCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  grossEarningsToday?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  isOnline?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  maxActiveOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  netEarningsToday?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverHeartbeatResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverHeartbeatResult'] = ResolversParentTypes['DriverHeartbeatResult']> = {
  connectionStatus?: Resolver<ResolversTypes['DriverConnectionStatus'], ParentType, ContextType>;
  lastHeartbeatAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  locationUpdated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EntityTypeResolvers = EnumResolverSignature<{ BUSINESS?: any, CATEGORY?: any, DELIVERY_ZONE?: any, DRIVER?: any, ORDER?: any, PRODUCT?: any, SETTLEMENT?: any, SUBCATEGORY?: any, USER?: any }, ResolversTypes['EntityType']>;

export interface JSONScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LocationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  latitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  longitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addUserAddress?: Resolver<ResolversTypes['UserAddress'], ParentType, ContextType, RequireFields<MutationaddUserAddressArgs, 'input'>>;
  addWalletCredit?: Resolver<ResolversTypes['WalletTransaction'], ParentType, ContextType, RequireFields<MutationaddWalletCreditArgs, 'input'>>;
  adminSetDriverConnectionStatus?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationadminSetDriverConnectionStatusArgs, 'driverId' | 'status'>>;
  adminUpdateDriverLocation?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationadminUpdateDriverLocationArgs, 'driverId' | 'latitude' | 'longitude'>>;
  adminUpdateDriverSettings?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationadminUpdateDriverSettingsArgs, 'driverId'>>;
  assignDriverToOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationassignDriverToOrderArgs, 'id'>>;
  assignPromotionToUsers?: Resolver<Array<ResolversTypes['UserPromotion']>, ParentType, ContextType, RequireFields<MutationassignPromotionToUsersArgs, 'input'>>;
  backfillSettlementsForDeliveredOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  cancelOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationcancelOrderArgs, 'id'>>;
  createBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationcreateBusinessArgs, 'input'>>;
  createOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationcreateOrderArgs, 'input'>>;
  createProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationcreateProductArgs, 'input'>>;
  createProductCategory?: Resolver<ResolversTypes['ProductCategory'], ParentType, ContextType, RequireFields<MutationcreateProductCategoryArgs, 'input'>>;
  createProductSubcategory?: Resolver<ResolversTypes['ProductSubcategory'], ParentType, ContextType, RequireFields<MutationcreateProductSubcategoryArgs, 'input'>>;
  createPromotion?: Resolver<ResolversTypes['Promotion'], ParentType, ContextType, RequireFields<MutationcreatePromotionArgs, 'input'>>;
  createTestOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  createUser?: Resolver<ResolversTypes['AuthResponse'], ParentType, ContextType, RequireFields<MutationcreateUserArgs, 'input'>>;
  deductWalletCredit?: Resolver<ResolversTypes['WalletTransaction'], ParentType, ContextType, RequireFields<MutationdeductWalletCreditArgs, 'amount' | 'orderId' | 'userId'>>;
  deleteBusiness?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteBusinessArgs, 'id'>>;
  deleteProduct?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductArgs, 'id'>>;
  deleteProductCategory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductCategoryArgs, 'id'>>;
  deleteProductSubcategory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductSubcategoryArgs, 'id'>>;
  deletePromotion?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeletePromotionArgs, 'id'>>;
  deleteUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteUserArgs, 'id'>>;
  deleteUserAddress?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteUserAddressArgs, 'id'>>;
  driverHeartbeat?: Resolver<ResolversTypes['DriverHeartbeatResult'], ParentType, ContextType, RequireFields<MutationdriverHeartbeatArgs, 'latitude' | 'longitude'>>;
  generateReferralCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  initiateSignup?: Resolver<ResolversTypes['AuthResponse'], ParentType, ContextType, RequireFields<MutationinitiateSignupArgs, 'input'>>;
  login?: Resolver<ResolversTypes['AuthResponse'], ParentType, ContextType, RequireFields<MutationloginArgs, 'input'>>;
  markFirstOrderUsed?: Resolver<ResolversTypes['UserPromoMetadata'], ParentType, ContextType, RequireFields<MutationmarkFirstOrderUsedArgs, 'userId'>>;
  markSettlementAsPaid?: Resolver<ResolversTypes['Settlement'], ParentType, ContextType, RequireFields<MutationmarkSettlementAsPaidArgs, 'settlementId'>>;
  markSettlementAsPartiallyPaid?: Resolver<ResolversTypes['Settlement'], ParentType, ContextType, RequireFields<MutationmarkSettlementAsPartiallyPaidArgs, 'amount' | 'settlementId'>>;
  markSettlementsAsPaid?: Resolver<Array<ResolversTypes['Settlement']>, ParentType, ContextType, RequireFields<MutationmarkSettlementsAsPaidArgs, 'ids'>>;
  removeUserFromPromotion?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationremoveUserFromPromotionArgs, 'promotionId' | 'userId'>>;
  resendEmailVerification?: Resolver<ResolversTypes['SignupStepResponse'], ParentType, ContextType>;
  setBusinessSchedule?: Resolver<Array<ResolversTypes['BusinessDayHours']>, ParentType, ContextType, RequireFields<MutationsetBusinessScheduleArgs, 'businessId' | 'schedule'>>;
  setDefaultAddress?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationsetDefaultAddressArgs, 'id'>>;
  setUserPermissions?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationsetUserPermissionsArgs, 'permissions' | 'userId'>>;
  submitPhoneNumber?: Resolver<ResolversTypes['SignupStepResponse'], ParentType, ContextType, RequireFields<MutationsubmitPhoneNumberArgs, 'input'>>;
  unsettleSettlement?: Resolver<ResolversTypes['Settlement'], ParentType, ContextType, RequireFields<MutationunsettleSettlementArgs, 'settlementId'>>;
  updateBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationupdateBusinessArgs, 'id' | 'input'>>;
  updateCommissionPercentage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationupdateCommissionPercentageArgs, 'percentage'>>;
  updateDriverLocation?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateDriverLocationArgs, 'latitude' | 'longitude'>>;
  updateDriverOnlineStatus?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateDriverOnlineStatusArgs, 'isOnline'>>;
  updateOrderStatus?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationupdateOrderStatusArgs, 'id' | 'status'>>;
  updateProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationupdateProductArgs, 'id' | 'input'>>;
  updateProductCategory?: Resolver<ResolversTypes['ProductCategory'], ParentType, ContextType, RequireFields<MutationupdateProductCategoryArgs, 'id' | 'input'>>;
  updateProductSubcategory?: Resolver<ResolversTypes['ProductSubcategory'], ParentType, ContextType, RequireFields<MutationupdateProductSubcategoryArgs, 'id' | 'input'>>;
  updateProductsOrder?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationupdateProductsOrderArgs, 'businessId' | 'products'>>;
  updatePromotion?: Resolver<ResolversTypes['Promotion'], ParentType, ContextType, RequireFields<MutationupdatePromotionArgs, 'input'>>;
  updateStoreStatus?: Resolver<ResolversTypes['StoreStatus'], ParentType, ContextType, RequireFields<MutationupdateStoreStatusArgs, 'input'>>;
  updateUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateUserArgs, 'input'>>;
  updateUserAddress?: Resolver<ResolversTypes['UserAddress'], ParentType, ContextType, RequireFields<MutationupdateUserAddressArgs, 'input'>>;
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
  orderPromotions?: Resolver<Maybe<Array<ResolversTypes['OrderPromotion']>>, ParentType, ContextType>;
  originalDeliveryPrice?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  originalPrice?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  pickupLocations?: Resolver<Array<ResolversTypes['Location']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OrderStatus'], ParentType, ContextType>;
  totalPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
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

export type OrderPromotionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderPromotion'] = ResolversParentTypes['OrderPromotion']> = {
  appliesTo?: Resolver<ResolversTypes['PromotionAppliesTo'], ParentType, ContextType>;
  discountAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  promotionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
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

export type PromotionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Promotion'] = ResolversParentTypes['Promotion']> = {
  assignedUsers?: Resolver<Maybe<Array<ResolversTypes['UserPromotion']>>, ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  currentGlobalUsage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  discountValue?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  eligibleBusinesses?: Resolver<Maybe<Array<ResolversTypes['Business']>>, ParentType, ContextType>;
  endsAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isStackable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  maxDiscountCap?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  maxGlobalUsage?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  maxUsagePerUser?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  minOrderAmount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  spendThreshold?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  startsAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  target?: Resolver<ResolversTypes['PromotionTarget'], ParentType, ContextType>;
  thresholdReward?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  totalRevenue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalUsageCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['PromotionType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PromotionAnalyticsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PromotionAnalyticsResult'] = ResolversParentTypes['PromotionAnalyticsResult']> = {
  averageOrderValue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  conversionRate?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  promotion?: Resolver<ResolversTypes['Promotion'], ParentType, ContextType>;
  totalDiscountGiven?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalRevenue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalUsageCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  uniqueUsers?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PromotionAppliesToResolvers = EnumResolverSignature<{ DELIVERY?: any, PRICE?: any }, ResolversTypes['PromotionAppliesTo']>;

export type PromotionResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PromotionResult'] = ResolversParentTypes['PromotionResult']> = {
  finalDeliveryPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  finalSubtotal?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  finalTotal?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  freeDeliveryApplied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  promotions?: Resolver<Array<ResolversTypes['ApplicablePromotion']>, ParentType, ContextType>;
  totalDiscount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PromotionTargetResolvers = EnumResolverSignature<{ ALL_USERS?: any, CONDITIONAL?: any, FIRST_ORDER?: any, SPECIFIC_USERS?: any }, ResolversTypes['PromotionTarget']>;

export type PromotionThresholdResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PromotionThreshold'] = ResolversParentTypes['PromotionThreshold']> = {
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  eligibleBusinessIds?: Resolver<Maybe<Array<ResolversTypes['ID']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  spendThreshold?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PromotionTypeResolvers = EnumResolverSignature<{ FIXED_AMOUNT?: any, FREE_DELIVERY?: any, PERCENTAGE?: any, WALLET_CREDIT?: any }, ResolversTypes['PromotionType']>;

export type PromotionUsageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PromotionUsage'] = ResolversParentTypes['PromotionUsage']> = {
  businessId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  discountAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  freeDeliveryApplied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orderSubtotal?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  promotion?: Resolver<Maybe<ResolversTypes['Promotion']>, ParentType, ContextType>;
  promotionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  usedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  auditLog?: Resolver<Maybe<ResolversTypes['AuditLog']>, ParentType, ContextType, RequireFields<QueryauditLogArgs, 'id'>>;
  auditLogs?: Resolver<ResolversTypes['AuditLogConnection'], ParentType, ContextType, Partial<QueryauditLogsArgs>>;
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType, RequireFields<QuerybusinessArgs, 'id'>>;
  businessBalance?: Resolver<ResolversTypes['SettlementSummary'], ParentType, ContextType, RequireFields<QuerybusinessBalanceArgs, 'businessId'>>;
  businesses?: Resolver<Array<ResolversTypes['Business']>, ParentType, ContextType>;
  driverBalance?: Resolver<ResolversTypes['SettlementSummary'], ParentType, ContextType, RequireFields<QuerydriverBalanceArgs, 'driverId'>>;
  drivers?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  getAllPromotions?: Resolver<Array<ResolversTypes['Promotion']>, ParentType, ContextType, Partial<QuerygetAllPromotionsArgs>>;
  getApplicablePromotions?: Resolver<Array<ResolversTypes['ApplicablePromotion']>, ParentType, ContextType, RequireFields<QuerygetApplicablePromotionsArgs, 'cart'>>;
  getPromotion?: Resolver<Maybe<ResolversTypes['Promotion']>, ParentType, ContextType, RequireFields<QuerygetPromotionArgs, 'id'>>;
  getPromotionAnalytics?: Resolver<ResolversTypes['PromotionAnalyticsResult'], ParentType, ContextType, RequireFields<QuerygetPromotionAnalyticsArgs, 'promotionId'>>;
  getPromotionThresholds?: Resolver<Array<ResolversTypes['PromotionThreshold']>, ParentType, ContextType, RequireFields<QuerygetPromotionThresholdsArgs, 'cart'>>;
  getPromotionUsage?: Resolver<Array<ResolversTypes['PromotionUsage']>, ParentType, ContextType, RequireFields<QuerygetPromotionUsageArgs, 'promotionId'>>;
  getStoreStatus?: Resolver<ResolversTypes['StoreStatus'], ParentType, ContextType>;
  getUserPromoMetadata?: Resolver<Maybe<ResolversTypes['UserPromoMetadata']>, ParentType, ContextType, RequireFields<QuerygetUserPromoMetadataArgs, 'userId'>>;
  getUserPromotions?: Resolver<Array<ResolversTypes['UserPromotion']>, ParentType, ContextType, RequireFields<QuerygetUserPromotionsArgs, 'userId'>>;
  getUserWallet?: Resolver<Maybe<ResolversTypes['UserWallet']>, ParentType, ContextType, RequireFields<QuerygetUserWalletArgs, 'userId'>>;
  getWalletTransactions?: Resolver<Array<ResolversTypes['WalletTransaction']>, ParentType, ContextType, RequireFields<QuerygetWalletTransactionsArgs, 'userId'>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  myAddresses?: Resolver<Array<ResolversTypes['UserAddress']>, ParentType, ContextType>;
  myBehavior?: Resolver<Maybe<ResolversTypes['UserBehavior']>, ParentType, ContextType>;
  myDriverMetrics?: Resolver<ResolversTypes['DriverDailyMetrics'], ParentType, ContextType>;
  myReferralStats?: Resolver<ResolversTypes['ReferralStats'], ParentType, ContextType>;
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
  userBehavior?: Resolver<Maybe<ResolversTypes['UserBehavior']>, ParentType, ContextType, RequireFields<QueryuserBehaviorArgs, 'userId'>>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  validatePromotions?: Resolver<ResolversTypes['PromotionResult'], ParentType, ContextType, RequireFields<QueryvalidatePromotionsArgs, 'cart'>>;
};

export type ReferralResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Referral'] = ResolversParentTypes['Referral']> = {
  completedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  referralCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  referredUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  referredUserId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  referrerUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  rewardAmount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  rewardGiven?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReferralStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReferralStatsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ReferralStats'] = ResolversParentTypes['ReferralStats']> = {
  completedReferrals?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pendingReferrals?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  referralCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  referrals?: Resolver<Array<ResolversTypes['Referral']>, ParentType, ContextType>;
  totalReferrals?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalRewardsEarned?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReferralStatusResolvers = EnumResolverSignature<{ COMPLETED?: any, EXPIRED?: any, PENDING?: any }, ResolversTypes['ReferralStatus']>;

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

export type StoreStatusResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['StoreStatus'] = ResolversParentTypes['StoreStatus']> = {
  closedMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isStoreClosed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  allOrdersUpdated?: SubscriptionResolver<Array<ResolversTypes['Order']>, "allOrdersUpdated", ParentType, ContextType>;
  auditLogCreated?: SubscriptionResolver<ResolversTypes['AuditLog'], "auditLogCreated", ParentType, ContextType, Partial<SubscriptionauditLogCreatedArgs>>;
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
  maxActiveOrders?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['UserPermission']>, ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  referralCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  signupStep?: Resolver<ResolversTypes['SignupStep'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserAddressResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserAddress'] = ResolversParentTypes['UserAddress']> = {
  addressName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  latitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  longitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserBehaviorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserBehavior'] = ResolversParentTypes['UserBehavior']> = {
  avgOrderValue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  cancelledOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deliveredOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  firstOrderAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastDeliveredAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastOrderAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  totalOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalSpend?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserPermissionResolvers = EnumResolverSignature<{ manage_orders?: any, manage_products?: any, manage_settings?: any, view_analytics?: any, view_finances?: any, view_orders?: any, view_products?: any }, ResolversTypes['UserPermission']>;

export type UserPromoMetadataResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserPromoMetadata'] = ResolversParentTypes['UserPromoMetadata']> = {
  hasUsedFirstOrderPromo?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastPromoUsedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  totalPromosUsed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalSavings?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserPromotionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserPromotion'] = ResolversParentTypes['UserPromotion']> = {
  assignedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  promotion?: Resolver<Maybe<ResolversTypes['Promotion']>, ParentType, ContextType>;
  promotionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  usageCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserRoleResolvers = EnumResolverSignature<{ ADMIN?: any, BUSINESS_EMPLOYEE?: any, BUSINESS_OWNER?: any, CUSTOMER?: any, DRIVER?: any, SUPER_ADMIN?: any }, ResolversTypes['UserRole']>;

export type UserWalletResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserWallet'] = ResolversParentTypes['UserWallet']> = {
  balance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  transactions?: Resolver<Maybe<Array<ResolversTypes['WalletTransaction']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WalletTransactionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WalletTransaction'] = ResolversParentTypes['WalletTransaction']> = {
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  balanceAfter?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  balanceBefore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  wallet?: Resolver<Maybe<ResolversTypes['UserWallet']>, ParentType, ContextType>;
  walletId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WorkingHoursResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WorkingHours'] = ResolversParentTypes['WorkingHours']> = {
  closesAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  opensAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  ActionType?: ActionTypeResolvers;
  ActorType?: ActorTypeResolvers;
  ApplicablePromotion?: ApplicablePromotionResolvers<ContextType>;
  AuditLog?: AuditLogResolvers<ContextType>;
  AuditLogConnection?: AuditLogConnectionResolvers<ContextType>;
  AuthResponse?: AuthResponseResolvers<ContextType>;
  Business?: BusinessResolvers<ContextType>;
  BusinessDayHours?: BusinessDayHoursResolvers<ContextType>;
  BusinessType?: BusinessTypeResolvers;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  DriverConnection?: DriverConnectionResolvers<ContextType>;
  DriverConnectionStatus?: DriverConnectionStatusResolvers;
  DriverDailyMetrics?: DriverDailyMetricsResolvers<ContextType>;
  DriverHeartbeatResult?: DriverHeartbeatResultResolvers<ContextType>;
  EntityType?: EntityTypeResolvers;
  JSON?: GraphQLScalarType;
  Location?: LocationResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Order?: OrderResolvers<ContextType>;
  OrderBusiness?: OrderBusinessResolvers<ContextType>;
  OrderItem?: OrderItemResolvers<ContextType>;
  OrderPromotion?: OrderPromotionResolvers<ContextType>;
  OrderStatus?: OrderStatusResolvers;
  Product?: ProductResolvers<ContextType>;
  ProductCategory?: ProductCategoryResolvers<ContextType>;
  ProductSubcategory?: ProductSubcategoryResolvers<ContextType>;
  Promotion?: PromotionResolvers<ContextType>;
  PromotionAnalyticsResult?: PromotionAnalyticsResultResolvers<ContextType>;
  PromotionAppliesTo?: PromotionAppliesToResolvers;
  PromotionResult?: PromotionResultResolvers<ContextType>;
  PromotionTarget?: PromotionTargetResolvers;
  PromotionThreshold?: PromotionThresholdResolvers<ContextType>;
  PromotionType?: PromotionTypeResolvers;
  PromotionUsage?: PromotionUsageResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Referral?: ReferralResolvers<ContextType>;
  ReferralStats?: ReferralStatsResolvers<ContextType>;
  ReferralStatus?: ReferralStatusResolvers;
  Settlement?: SettlementResolvers<ContextType>;
  SettlementStatus?: SettlementStatusResolvers;
  SettlementSummary?: SettlementSummaryResolvers<ContextType>;
  SettlementType?: SettlementTypeResolvers;
  SignupStep?: SignupStepResolvers;
  SignupStepResponse?: SignupStepResponseResolvers<ContextType>;
  StoreStatus?: StoreStatusResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserAddress?: UserAddressResolvers<ContextType>;
  UserBehavior?: UserBehaviorResolvers<ContextType>;
  UserPermission?: UserPermissionResolvers;
  UserPromoMetadata?: UserPromoMetadataResolvers<ContextType>;
  UserPromotion?: UserPromotionResolvers<ContextType>;
  UserRole?: UserRoleResolvers;
  UserWallet?: UserWalletResolvers<ContextType>;
  WalletTransaction?: WalletTransactionResolvers<ContextType>;
  WorkingHours?: WorkingHoursResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = GraphQLContext> = {
  skipAuth?: skipAuthDirectiveResolver<any, any, ContextType>;
};
