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

export type AudiencePreview = {
  __typename?: 'AudiencePreview';
  count: Scalars['Int']['output'];
  sampleUsers: Array<User>;
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

export type Banner = {
  __typename?: 'Banner';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  imageUrl: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  linkTarget?: Maybe<Scalars['String']['output']>;
  linkType?: Maybe<Scalars['String']['output']>;
  sortOrder: Scalars['Int']['output'];
  subtitle?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export enum BannerType {
  Info = 'INFO',
  Success = 'SUCCESS',
  Warning = 'WARNING'
}

export type Business = {
  __typename?: 'Business';
  activePromotion?: Maybe<BusinessPromotion>;
  avgPrepTimeMinutes: Scalars['Int']['output'];
  businessType: BusinessType;
  commissionPercentage: Scalars['Float']['output'];
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
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

export type BusinessPromotion = {
  __typename?: 'BusinessPromotion';
  description?: Maybe<Scalars['String']['output']>;
  discountValue?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: PromotionType;
};

export enum BusinessType {
  Market = 'MARKET',
  Pharmacy = 'PHARMACY',
  Restaurant = 'RESTAURANT'
}

export enum CampaignStatus {
  Draft = 'DRAFT',
  Failed = 'FAILED',
  Sending = 'SENDING',
  Sent = 'SENT'
}

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

export type CreateBannerInput = {
  imageUrl: Scalars['String']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  linkTarget?: InputMaybe<Scalars['String']['input']>;
  linkType?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  subtitle?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateBusinessInput = {
  avgPrepTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  businessType: BusinessType;
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  location: LocationInput;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  workingHours: WorkingHoursInput;
};

export type CreateCampaignInput = {
  body: Scalars['String']['input'];
  data?: InputMaybe<Scalars['JSON']['input']>;
  query: Scalars['JSON']['input'];
  title: Scalars['String']['input'];
};

export type CreateDeliveryPricingTierInput = {
  maxDistanceKm?: InputMaybe<Scalars['Float']['input']>;
  minDistanceKm: Scalars['Float']['input'];
  price: Scalars['Float']['input'];
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateDeliveryZoneInput = {
  deliveryFee: Scalars['Float']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  polygon: Array<PolygonPointInput>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateOrderInput = {
  deliveryPrice: Scalars['Float']['input'];
  driverNotes?: InputMaybe<Scalars['String']['input']>;
  dropOffLocation: LocationInput;
  items: Array<CreateOrderItemInput>;
  promoCode?: InputMaybe<Scalars['String']['input']>;
  totalPrice: Scalars['Float']['input'];
};

export type CreateOrderItemInput = {
  notes?: InputMaybe<Scalars['String']['input']>;
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

export type DeliveryPriceResult = {
  __typename?: 'DeliveryPriceResult';
  distanceKm: Scalars['Float']['output'];
  price: Scalars['Float']['output'];
  tierApplied?: Maybe<DeliveryPricingTier>;
  zoneApplied?: Maybe<DeliveryZoneMatch>;
};

export type DeliveryPricingConfig = {
  __typename?: 'DeliveryPricingConfig';
  tiers: Array<DeliveryPricingTier>;
  zones: Array<DeliveryZone>;
};

export type DeliveryPricingTier = {
  __typename?: 'DeliveryPricingTier';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  maxDistanceKm?: Maybe<Scalars['Float']['output']>;
  minDistanceKm: Scalars['Float']['output'];
  price: Scalars['Float']['output'];
  sortOrder: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type DeliveryZone = {
  __typename?: 'DeliveryZone';
  createdAt: Scalars['DateTime']['output'];
  deliveryFee: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  polygon: Array<PolygonPoint>;
  sortOrder: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * Returned from calculateDeliveryPrice when a zone matches;
 * tells the client which zone (if any) is being applied.
 */
export type DeliveryZoneMatch = {
  __typename?: 'DeliveryZoneMatch';
  deliveryFee: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export enum DeviceAppType {
  Customer = 'CUSTOMER',
  Driver = 'DRIVER'
}

export enum DevicePlatform {
  Android = 'ANDROID',
  Ios = 'IOS'
}

export type DeviceToken = {
  __typename?: 'DeviceToken';
  appType: DeviceAppType;
  createdAt: Scalars['DateTime']['output'];
  deviceId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  platform: DevicePlatform;
  token: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
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
  createBanner: Banner;
  createBusiness: Business;
  createCampaign: NotificationCampaign;
  createDeliveryPricingTier: DeliveryPricingTier;
  createDeliveryZone: DeliveryZone;
  createOrder: Order;
  createProduct: Product;
  createProductCategory: ProductCategory;
  createProductSubcategory: ProductSubcategory;
  createPromotion: Promotion;
  createTestOrder: Order;
  createUser: AuthResponse;
  deductWalletCredit: WalletTransaction;
  deleteBanner: Scalars['Boolean']['output'];
  deleteBusiness: Scalars['Boolean']['output'];
  deleteCampaign: Scalars['Boolean']['output'];
  deleteDeliveryPricingTier: Scalars['Boolean']['output'];
  deleteDeliveryZone: Scalars['Boolean']['output'];
  deleteMyAccount: Scalars['Boolean']['output'];
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
  registerDeviceToken: Scalars['Boolean']['output'];
  removeUserFromPromotion: Scalars['Boolean']['output'];
  resendEmailVerification: SignupStepResponse;
  sendCampaign: NotificationCampaign;
  sendPushNotification: SendNotificationResult;
  setBusinessSchedule: Array<BusinessDayHours>;
  setDefaultAddress: Scalars['Boolean']['output'];
  setDeliveryPricingTiers: Array<DeliveryPricingTier>;
  setUserPermissions: User;
  startPreparing: Order;
  submitPhoneNumber: SignupStepResponse;
  unregisterDeviceToken: Scalars['Boolean']['output'];
  unsettleSettlement: Settlement;
  updateBanner: Banner;
  updateBannerOrder: Banner;
  updateBusiness: Business;
  updateCommissionPercentage: Scalars['Boolean']['output'];
  updateDeliveryPricingTier: DeliveryPricingTier;
  updateDeliveryZone: DeliveryZone;
  updateDriverLocation: User;
  updateDriverOnlineStatus: User;
  updateOrderStatus: Order;
  updatePreparationTime: Order;
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


export type MutationAddUserAddressArgs = {
  input: AddUserAddressInput;
};


export type MutationAddWalletCreditArgs = {
  input: AddWalletCreditInput;
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


export type MutationAdminUpdateDriverSettingsArgs = {
  commissionPercentage?: InputMaybe<Scalars['Float']['input']>;
  driverId: Scalars['ID']['input'];
  maxActiveOrders?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationAssignDriverToOrderArgs = {
  driverId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationAssignPromotionToUsersArgs = {
  input: AssignPromotionToUserInput;
};


export type MutationCancelOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateBannerArgs = {
  input: CreateBannerInput;
};


export type MutationCreateBusinessArgs = {
  input: CreateBusinessInput;
};


export type MutationCreateCampaignArgs = {
  input: CreateCampaignInput;
};


export type MutationCreateDeliveryPricingTierArgs = {
  input: CreateDeliveryPricingTierInput;
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


export type MutationDeductWalletCreditArgs = {
  amount: Scalars['Float']['input'];
  orderId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationDeleteBannerArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteBusinessArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCampaignArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteDeliveryPricingTierArgs = {
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


export type MutationDeleteUserAddressArgs = {
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


export type MutationMarkFirstOrderUsedArgs = {
  userId: Scalars['ID']['input'];
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


export type MutationRegisterDeviceTokenArgs = {
  input: RegisterDeviceTokenInput;
};


export type MutationRemoveUserFromPromotionArgs = {
  promotionId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationSendCampaignArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSendPushNotificationArgs = {
  input: SendPushNotificationInput;
};


export type MutationSetBusinessScheduleArgs = {
  businessId: Scalars['ID']['input'];
  schedule: Array<BusinessDayHoursInput>;
};


export type MutationSetDefaultAddressArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetDeliveryPricingTiersArgs = {
  input: SetDeliveryPricingTiersInput;
};


export type MutationSetUserPermissionsArgs = {
  permissions: Array<UserPermission>;
  userId: Scalars['ID']['input'];
};


export type MutationStartPreparingArgs = {
  id: Scalars['ID']['input'];
  preparationMinutes: Scalars['Int']['input'];
};


export type MutationSubmitPhoneNumberArgs = {
  input: SubmitPhoneNumberInput;
};


export type MutationUnregisterDeviceTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationUnsettleSettlementArgs = {
  settlementId: Scalars['ID']['input'];
};


export type MutationUpdateBannerArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBannerInput;
};


export type MutationUpdateBannerOrderArgs = {
  bannerId: Scalars['ID']['input'];
  newSortOrder: Scalars['Int']['input'];
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


export type MutationUpdateDeliveryPricingTierArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDeliveryPricingTierInput;
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


export type MutationUpdatePreparationTimeArgs = {
  id: Scalars['ID']['input'];
  preparationMinutes: Scalars['Int']['input'];
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
  input: UpdatePromotionInput;
};


export type MutationUpdateStoreStatusArgs = {
  input: UpdateStoreStatusInput;
};


export type MutationUpdateUserArgs = {
  input: UpdateUserInput;
};


export type MutationUpdateUserAddressArgs = {
  input: UpdateUserAddressInput;
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

export type Notification = {
  __typename?: 'Notification';
  body: Scalars['String']['output'];
  campaignId?: Maybe<Scalars['ID']['output']>;
  data?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['ID']['output'];
  sentAt: Scalars['DateTime']['output'];
  title: Scalars['String']['output'];
  type: NotificationType;
  userId?: Maybe<Scalars['ID']['output']>;
};

export type NotificationCampaign = {
  __typename?: 'NotificationCampaign';
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  failedCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  query?: Maybe<Scalars['JSON']['output']>;
  sender?: Maybe<User>;
  sentAt?: Maybe<Scalars['DateTime']['output']>;
  sentBy?: Maybe<Scalars['ID']['output']>;
  sentCount: Scalars['Int']['output'];
  status: CampaignStatus;
  targetCount: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export enum NotificationType {
  AdminAlert = 'ADMIN_ALERT',
  OrderAssigned = 'ORDER_ASSIGNED',
  OrderStatus = 'ORDER_STATUS',
  Promotional = 'PROMOTIONAL'
}

export type Order = {
  __typename?: 'Order';
  businesses: Array<OrderBusiness>;
  deliveredAt?: Maybe<Scalars['Date']['output']>;
  deliveryPrice: Scalars['Float']['output'];
  displayId: Scalars['String']['output'];
  driver?: Maybe<User>;
  driverNotes?: Maybe<Scalars['String']['output']>;
  dropOffLocation: Location;
  estimatedReadyAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  orderDate: Scalars['Date']['output'];
  orderPrice: Scalars['Float']['output'];
  orderPromotions?: Maybe<Array<OrderPromotion>>;
  originalDeliveryPrice?: Maybe<Scalars['Float']['output']>;
  originalPrice?: Maybe<Scalars['Float']['output']>;
  outForDeliveryAt?: Maybe<Scalars['Date']['output']>;
  pickupLocations: Array<Location>;
  preparationMinutes?: Maybe<Scalars['Int']['output']>;
  preparingAt?: Maybe<Scalars['Date']['output']>;
  readyAt?: Maybe<Scalars['Date']['output']>;
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
  notes?: Maybe<Scalars['String']['output']>;
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

export enum OrderStatus {
  Cancelled = 'CANCELLED',
  Delivered = 'DELIVERED',
  OutForDelivery = 'OUT_FOR_DELIVERY',
  Pending = 'PENDING',
  Preparing = 'PREPARING',
  Ready = 'READY'
}

export type PolygonPoint = {
  __typename?: 'PolygonPoint';
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
};

export type PolygonPointInput = {
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
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

export enum PromotionAppliesTo {
  Delivery = 'DELIVERY',
  Price = 'PRICE'
}

export type PromotionResult = {
  __typename?: 'PromotionResult';
  finalDeliveryPrice: Scalars['Float']['output'];
  finalSubtotal: Scalars['Float']['output'];
  finalTotal: Scalars['Float']['output'];
  freeDeliveryApplied: Scalars['Boolean']['output'];
  promotions: Array<ApplicablePromotion>;
  totalDiscount: Scalars['Float']['output'];
};

export enum PromotionTarget {
  AllUsers = 'ALL_USERS',
  Conditional = 'CONDITIONAL',
  FirstOrder = 'FIRST_ORDER',
  SpecificUsers = 'SPECIFIC_USERS'
}

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

export enum PromotionType {
  FixedAmount = 'FIXED_AMOUNT',
  FreeDelivery = 'FREE_DELIVERY',
  Percentage = 'PERCENTAGE',
  WalletCredit = 'WALLET_CREDIT'
}

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
  calculateDeliveryPrice: DeliveryPriceResult;
  deliveryPricingConfig: DeliveryPricingConfig;
  deliveryPricingTiers: Array<DeliveryPricingTier>;
  deliveryZones: Array<DeliveryZone>;
  driverBalance: SettlementSummary;
  drivers: Array<User>;
  getAllPromotions: Array<Promotion>;
  getApplicablePromotions: Array<ApplicablePromotion>;
  getBanner?: Maybe<Banner>;
  getBanners: Array<Banner>;
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
  notificationCampaign?: Maybe<NotificationCampaign>;
  notificationCampaigns: Array<NotificationCampaign>;
  order?: Maybe<Order>;
  orders: Array<Order>;
  ordersByStatus: Array<Order>;
  previewCampaignAudience: AudiencePreview;
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


export type QueryCalculateDeliveryPriceArgs = {
  businessId: Scalars['ID']['input'];
  dropoffLat: Scalars['Float']['input'];
  dropoffLng: Scalars['Float']['input'];
};


export type QueryDriverBalanceArgs = {
  driverId: Scalars['ID']['input'];
};


export type QueryGetAllPromotionsArgs = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryGetApplicablePromotionsArgs = {
  cart: CartContextInput;
  manualCode?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetBannerArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetBannersArgs = {
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryGetPromotionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetPromotionAnalyticsArgs = {
  promotionId: Scalars['ID']['input'];
};


export type QueryGetPromotionThresholdsArgs = {
  cart: CartContextInput;
};


export type QueryGetPromotionUsageArgs = {
  promotionId: Scalars['ID']['input'];
};


export type QueryGetUserPromoMetadataArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryGetUserPromotionsArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryGetUserWalletArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryGetWalletTransactionsArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryNotificationCampaignArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOrderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOrdersByStatusArgs = {
  status: OrderStatus;
};


export type QueryPreviewCampaignAudienceArgs = {
  query: Scalars['JSON']['input'];
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


export type QueryValidatePromotionsArgs = {
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

export enum ReferralStatus {
  Completed = 'COMPLETED',
  Expired = 'EXPIRED',
  Pending = 'PENDING'
}

export type RegisterDeviceTokenInput = {
  appType: DeviceAppType;
  deviceId: Scalars['String']['input'];
  platform: DevicePlatform;
  token: Scalars['String']['input'];
};

export type SendNotificationResult = {
  __typename?: 'SendNotificationResult';
  failureCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  successCount: Scalars['Int']['output'];
};

export type SendPushNotificationInput = {
  body: Scalars['String']['input'];
  data?: InputMaybe<Scalars['JSON']['input']>;
  title: Scalars['String']['input'];
  userIds: Array<Scalars['ID']['input']>;
};

export type SetDeliveryPricingTiersInput = {
  tiers: Array<CreateDeliveryPricingTierInput>;
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

export type StoreStatus = {
  __typename?: 'StoreStatus';
  bannerEnabled: Scalars['Boolean']['output'];
  bannerMessage?: Maybe<Scalars['String']['output']>;
  bannerType: BannerType;
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

export type UpdateBannerInput = {
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  linkTarget?: InputMaybe<Scalars['String']['input']>;
  linkType?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  subtitle?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBusinessInput = {
  avgPrepTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  businessType?: InputMaybe<BusinessType>;
  commissionPercentage?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<LocationInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  prepTimeOverrideMinutes?: InputMaybe<Scalars['Int']['input']>;
  workingHours?: InputMaybe<WorkingHoursInput>;
};

export type UpdateDeliveryPricingTierInput = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  maxDistanceKm?: InputMaybe<Scalars['Float']['input']>;
  minDistanceKm?: InputMaybe<Scalars['Float']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateDeliveryZoneInput = {
  deliveryFee?: InputMaybe<Scalars['Float']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  polygon?: InputMaybe<Array<PolygonPointInput>>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
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
  bannerEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  bannerMessage?: InputMaybe<Scalars['String']['input']>;
  bannerType?: InputMaybe<BannerType>;
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

export enum UserPermission {
  ManageOrders = 'manage_orders',
  ManageProducts = 'manage_products',
  ManageSettings = 'manage_settings',
  ViewAnalytics = 'view_analytics',
  ViewFinances = 'view_finances',
  ViewOrders = 'view_orders',
  ViewProducts = 'view_products'
}

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

export enum UserRole {
  Admin = 'ADMIN',
  BusinessEmployee = 'BUSINESS_EMPLOYEE',
  BusinessOwner = 'BUSINESS_OWNER',
  Customer = 'CUSTOMER',
  Driver = 'DRIVER',
  SuperAdmin = 'SUPER_ADMIN'
}

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

export type GetMyAddressesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyAddressesQuery = { __typename?: 'Query', myAddresses: Array<{ __typename?: 'UserAddress', id: string, latitude: number, longitude: number, addressName?: string | null, displayName?: string | null, priority: number, createdAt: any }> };

export type AddUserAddressMutationVariables = Exact<{
  input: AddUserAddressInput;
}>;


export type AddUserAddressMutation = { __typename?: 'Mutation', addUserAddress: { __typename?: 'UserAddress', id: string, latitude: number, longitude: number, addressName?: string | null, displayName?: string | null, priority: number } };

export type UpdateUserAddressMutationVariables = Exact<{
  input: UpdateUserAddressInput;
}>;


export type UpdateUserAddressMutation = { __typename?: 'Mutation', updateUserAddress: { __typename?: 'UserAddress', id: string, addressName?: string | null, displayName?: string | null, priority: number } };

export type DeleteUserAddressMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteUserAddressMutation = { __typename?: 'Mutation', deleteUserAddress: boolean };

export type SetDefaultAddressMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SetDefaultAddressMutation = { __typename?: 'Mutation', setDefaultAddress: boolean };

export type DeleteMyAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteMyAccountMutation = { __typename?: 'Mutation', deleteMyAccount: boolean };

export type InitiateSignupMutationVariables = Exact<{
  input: InitiateSignupInput;
}>;


export type InitiateSignupMutation = { __typename?: 'Mutation', initiateSignup: { __typename?: 'AuthResponse', token: string, message: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, signupStep: SignupStep, emailVerified: boolean, phoneVerified: boolean, phoneNumber?: string | null, role: UserRole } } };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthResponse', token: string, message: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, signupStep: SignupStep, emailVerified: boolean, phoneVerified: boolean, phoneNumber?: string | null, role: UserRole } } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, signupStep: SignupStep, emailVerified: boolean, phoneVerified: boolean, phoneNumber?: string | null, address?: string | null, role: UserRole } | null };

export type ResendEmailVerificationMutationVariables = Exact<{ [key: string]: never; }>;


export type ResendEmailVerificationMutation = { __typename?: 'Mutation', resendEmailVerification: { __typename?: 'SignupStepResponse', userId: string, currentStep: SignupStep, message: string } };

export type SubmitPhoneNumberMutationVariables = Exact<{
  input: SubmitPhoneNumberInput;
}>;


export type SubmitPhoneNumberMutation = { __typename?: 'Mutation', submitPhoneNumber: { __typename?: 'SignupStepResponse', userId: string, currentStep: SignupStep, message: string } };

export type VerifyEmailMutationVariables = Exact<{
  input: VerifyEmailInput;
}>;


export type VerifyEmailMutation = { __typename?: 'Mutation', verifyEmail: { __typename?: 'SignupStepResponse', userId: string, currentStep: SignupStep, message: string } };

export type VerifyPhoneMutationVariables = Exact<{
  input: VerifyPhoneInput;
}>;


export type VerifyPhoneMutation = { __typename?: 'Mutation', verifyPhone: { __typename?: 'SignupStepResponse', userId: string, currentStep: SignupStep, message: string } };

export type GetBannersQueryVariables = Exact<{
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetBannersQuery = { __typename?: 'Query', getBanners: Array<{ __typename?: 'Banner', id: string, title?: string | null, subtitle?: string | null, imageUrl: string, linkType?: string | null, linkTarget?: string | null, sortOrder: number, isActive: boolean }> };

export type GetBusinessesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBusinessesQuery = { __typename?: 'Query', businesses: Array<{ __typename?: 'Business', id: string, name: string, description?: string | null, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, isOpen: boolean, createdAt: any, updatedAt: any, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string }, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }>, activePromotion?: { __typename?: 'BusinessPromotion', id: string, name: string, description?: string | null, type: PromotionType, discountValue?: number | null } | null }> };

export type GetBusinessQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetBusinessQuery = { __typename?: 'Query', business?: { __typename?: 'Business', id: string, name: string, description?: string | null, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, isOpen: boolean, createdAt: any, updatedAt: any, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string }, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> } | null };

export type CalculateDeliveryPriceQueryVariables = Exact<{
  dropoffLat: Scalars['Float']['input'];
  dropoffLng: Scalars['Float']['input'];
  businessId: Scalars['ID']['input'];
}>;


export type CalculateDeliveryPriceQuery = { __typename?: 'Query', calculateDeliveryPrice: { __typename?: 'DeliveryPriceResult', distanceKm: number, price: number, zoneApplied?: { __typename?: 'DeliveryZoneMatch', id: string, name: string, deliveryFee: number } | null } };

export type DeliveryPricingConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type DeliveryPricingConfigQuery = { __typename?: 'Query', deliveryPricingConfig: { __typename?: 'DeliveryPricingConfig', zones: Array<{ __typename?: 'DeliveryZone', id: string, name: string, deliveryFee: number, sortOrder: number, polygon: Array<{ __typename?: 'PolygonPoint', lat: number, lng: number }> }>, tiers: Array<{ __typename?: 'DeliveryPricingTier', id: string, minDistanceKm: number, maxDistanceKm?: number | null, price: number, sortOrder: number }> } };

export type RegisterDeviceTokenMutationVariables = Exact<{
  input: RegisterDeviceTokenInput;
}>;


export type RegisterDeviceTokenMutation = { __typename?: 'Mutation', registerDeviceToken: boolean };

export type UnregisterDeviceTokenMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type UnregisterDeviceTokenMutation = { __typename?: 'Mutation', unregisterDeviceToken: boolean };

export type CreateOrderMutationVariables = Exact<{
  input: CreateOrderInput;
}>;


export type CreateOrderMutation = { __typename?: 'Mutation', createOrder: { __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, businessType: BusinessType, isActive: boolean, isOpen: boolean, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> } };

export type UpdateOrderStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: OrderStatus;
}>;


export type UpdateOrderStatusMutation = { __typename?: 'Mutation', updateOrderStatus: { __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> } };

export type CancelOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelOrderMutation = { __typename?: 'Mutation', cancelOrder: { __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> } };

export type GetOrdersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOrdersQuery = { __typename?: 'Query', orders: Array<{ __typename?: 'Order', id: string, displayId: string, userId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> }> };

export type GetOrderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetOrderQuery = { __typename?: 'Query', order?: { __typename?: 'Order', id: string, displayId: string, userId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, readyAt?: any | null, outForDeliveryAt?: any | null, deliveredAt?: any | null, driverNotes?: string | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, pickupLocations: Array<{ __typename?: 'Location', latitude: number, longitude: number, address: string }>, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, phoneNumber?: string | null, imageUrl?: string | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null } | null, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, createdAt: any, updatedAt: any, isOpen: boolean, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> } | null };

export type GetOrdersByStatusQueryVariables = Exact<{
  status: OrderStatus;
}>;


export type GetOrdersByStatusQuery = { __typename?: 'Query', ordersByStatus: Array<{ __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> }> };

export type GetOrderDriverQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetOrderDriverQuery = { __typename?: 'Query', order?: { __typename?: 'Order', id: string, status: OrderStatus, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, phoneNumber?: string | null, imageUrl?: string | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null } | null } | null };

export type UncompletedOrdersQueryVariables = Exact<{ [key: string]: never; }>;


export type UncompletedOrdersQuery = { __typename?: 'Query', uncompletedOrders: Array<{ __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, createdAt: any, updatedAt: any, isActive: boolean, isOpen: boolean, location: { __typename?: 'Location', address: string, longitude: number, latitude: number }, workingHours: { __typename?: 'WorkingHours', closesAt: string, opensAt: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> }> };

export type OrderStatusUpdatedSubscriptionVariables = Exact<{
  orderId: Scalars['ID']['input'];
}>;


export type OrderStatusUpdatedSubscription = { __typename?: 'Subscription', orderStatusUpdated: { __typename?: 'Order', id: string, status: OrderStatus } };

export type UserOrdersUpdatedSubscriptionVariables = Exact<{
  input: SubscriptionInput;
}>;


export type UserOrdersUpdatedSubscription = { __typename?: 'Subscription', userOrdersUpdated: Array<{ __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, createdAt: any, updatedAt: any, isActive: boolean, isOpen: boolean, location: { __typename?: 'Location', address: string, longitude: number, latitude: number }, workingHours: { __typename?: 'WorkingHours', closesAt: string, opensAt: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> }> };

export type GetProductsQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type GetProductsQuery = { __typename?: 'Query', products: Array<{ __typename?: 'Product', id: string, businessId: string, categoryId: string, subcategoryId?: string | null, name: string, description?: string | null, imageUrl?: string | null, price: number, isOnSale: boolean, salePrice?: number | null, isAvailable: boolean, sortOrder: number, createdAt: string, updatedAt: string }> };

export type GetProductQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetProductQuery = { __typename?: 'Query', product?: { __typename?: 'Product', id: string, businessId: string, categoryId: string, subcategoryId?: string | null, name: string, description?: string | null, imageUrl?: string | null, price: number, isOnSale: boolean, salePrice?: number | null, isAvailable: boolean, sortOrder: number, createdAt: string, updatedAt: string } | null };

export type ProductCategoriesQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type ProductCategoriesQuery = { __typename?: 'Query', productCategories: Array<{ __typename?: 'ProductCategory', id: string, name: string }> };

export type ProductSubcategoriesByBusinessQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type ProductSubcategoriesByBusinessQuery = { __typename?: 'Query', productSubcategoriesByBusiness: Array<{ __typename?: 'ProductSubcategory', id: string, categoryId: string, name: string }> };

export type ValidatePromotionsQueryVariables = Exact<{
  cart: CartContextInput;
  manualCode?: InputMaybe<Scalars['String']['input']>;
}>;


export type ValidatePromotionsQuery = { __typename?: 'Query', validatePromotions: { __typename?: 'PromotionResult', totalDiscount: number, freeDeliveryApplied: boolean, finalSubtotal: number, finalDeliveryPrice: number, finalTotal: number, promotions: Array<{ __typename?: 'ApplicablePromotion', id: string, name: string, code?: string | null, type: PromotionType, target: PromotionTarget, appliedAmount: number, freeDelivery: boolean, priority: number }> } };

export type GetPromotionThresholdsQueryVariables = Exact<{
  cart: CartContextInput;
}>;


export type GetPromotionThresholdsQuery = { __typename?: 'Query', getPromotionThresholds: Array<{ __typename?: 'PromotionThreshold', id: string, name: string, code?: string | null, spendThreshold: number, eligibleBusinessIds?: Array<string> | null, priority: number, isActive: boolean }> };

export type GetMyReferralStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyReferralStatsQuery = { __typename?: 'Query', myReferralStats: { __typename?: 'ReferralStats', totalReferrals: number, completedReferrals: number, pendingReferrals: number, totalRewardsEarned: number, referralCode: string, referrals: Array<{ __typename?: 'Referral', id: string, status: ReferralStatus, rewardGiven: boolean, rewardAmount?: number | null, completedAt?: any | null, createdAt: any, referredUser?: { __typename?: 'User', firstName: string, lastName: string } | null }> } };

export type GenerateReferralCodeMutationVariables = Exact<{ [key: string]: never; }>;


export type GenerateReferralCodeMutation = { __typename?: 'Mutation', generateReferralCode: string };

export type GetStoreStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetStoreStatusQuery = { __typename?: 'Query', getStoreStatus: { __typename?: 'StoreStatus', isStoreClosed: boolean, closedMessage?: string | null, bannerEnabled: boolean, bannerMessage?: string | null, bannerType: BannerType } };


export const GetMyAddressesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyAddresses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myAddresses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"addressName"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetMyAddressesQuery, GetMyAddressesQueryVariables>;
export const AddUserAddressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddUserAddress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddUserAddressInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addUserAddress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"addressName"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}}]}}]}}]} as unknown as DocumentNode<AddUserAddressMutation, AddUserAddressMutationVariables>;
export const UpdateUserAddressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserAddress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserAddressInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserAddress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"addressName"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}}]}}]}}]} as unknown as DocumentNode<UpdateUserAddressMutation, UpdateUserAddressMutationVariables>;
export const DeleteUserAddressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUserAddress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUserAddress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteUserAddressMutation, DeleteUserAddressMutationVariables>;
export const SetDefaultAddressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetDefaultAddress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setDefaultAddress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<SetDefaultAddressMutation, SetDefaultAddressMutationVariables>;
export const DeleteMyAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteMyAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteMyAccount"}}]}}]} as unknown as DocumentNode<DeleteMyAccountMutation, DeleteMyAccountMutationVariables>;
export const InitiateSignupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InitiateSignup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InitiateSignupInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"initiateSignup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"signupStep"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<InitiateSignupMutation, InitiateSignupMutationVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"signupStep"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"signupStep"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const ResendEmailVerificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResendEmailVerification"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resendEmailVerification"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"currentStep"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<ResendEmailVerificationMutation, ResendEmailVerificationMutationVariables>;
export const SubmitPhoneNumberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubmitPhoneNumber"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubmitPhoneNumberInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"submitPhoneNumber"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"currentStep"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SubmitPhoneNumberMutation, SubmitPhoneNumberMutationVariables>;
export const VerifyEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"VerifyEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"currentStep"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<VerifyEmailMutation, VerifyEmailMutationVariables>;
export const VerifyPhoneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyPhone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"VerifyPhoneInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyPhone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"currentStep"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<VerifyPhoneMutation, VerifyPhoneMutationVariables>;
export const GetBannersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBanners"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"activeOnly"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getBanners"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"activeOnly"},"value":{"kind":"Variable","name":{"kind":"Name","value":"activeOnly"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linkType"}},{"kind":"Field","name":{"kind":"Name","value":"linkTarget"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<GetBannersQuery, GetBannersQueryVariables>;
export const GetBusinessesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"activePromotion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"discountValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetBusinessesQuery, GetBusinessesQueryVariables>;
export const GetBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetBusinessQuery, GetBusinessQueryVariables>;
export const CalculateDeliveryPriceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CalculateDeliveryPrice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dropoffLat"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dropoffLng"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"calculateDeliveryPrice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"dropoffLat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dropoffLat"}}},{"kind":"Argument","name":{"kind":"Name","value":"dropoffLng"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dropoffLng"}}},{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"distanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"zoneApplied"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryFee"}}]}}]}}]}}]} as unknown as DocumentNode<CalculateDeliveryPriceQuery, CalculateDeliveryPriceQueryVariables>;
export const DeliveryPricingConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DeliveryPricingConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deliveryPricingConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"polygon"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lat"}},{"kind":"Field","name":{"kind":"Name","value":"lng"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deliveryFee"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"minDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"maxDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}}]}}]}}]}}]} as unknown as DocumentNode<DeliveryPricingConfigQuery, DeliveryPricingConfigQueryVariables>;
export const RegisterDeviceTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RegisterDeviceToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterDeviceTokenInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registerDeviceToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<RegisterDeviceTokenMutation, RegisterDeviceTokenMutationVariables>;
export const UnregisterDeviceTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnregisterDeviceToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unregisterDeviceToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}]}]}}]} as unknown as DocumentNode<UnregisterDeviceTokenMutation, UnregisterDeviceTokenMutationVariables>;
export const CreateOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateOrderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateOrderMutation, CreateOrderMutationVariables>;
export const UpdateOrderStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateOrderStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOrderStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UpdateOrderStatusMutation, UpdateOrderStatusMutationVariables>;
export const CancelOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CancelOrderMutation, CancelOrderMutationVariables>;
export const GetOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrdersQuery, GetOrdersQueryVariables>;
export const GetOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"readyAt"}},{"kind":"Field","name":{"kind":"Name","value":"outForDeliveryAt"}},{"kind":"Field","name":{"kind":"Name","value":"deliveredAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverNotes"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pickupLocations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrderQuery, GetOrderQueryVariables>;
export const GetOrdersByStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrdersByStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ordersByStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrdersByStatusQuery, GetOrdersByStatusQueryVariables>;
export const GetOrderDriverDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrderDriver"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetOrderDriverQuery, GetOrderDriverQueryVariables>;
export const UncompletedOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UncompletedOrders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uncompletedOrders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"closesAt"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UncompletedOrdersQuery, UncompletedOrdersQueryVariables>;
export const OrderStatusUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OrderStatusUpdated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orderStatusUpdated"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<OrderStatusUpdatedSubscription, OrderStatusUpdatedSubscriptionVariables>;
export const UserOrdersUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserOrdersUpdated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubscriptionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userOrdersUpdated"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"closesAt"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UserOrdersUpdatedSubscription, UserOrdersUpdatedSubscriptionVariables>;
export const GetProductsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProducts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"subcategoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"isOnSale"}},{"kind":"Field","name":{"kind":"Name","value":"salePrice"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetProductsQuery, GetProductsQueryVariables>;
export const GetProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"product"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"subcategoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"isOnSale"}},{"kind":"Field","name":{"kind":"Name","value":"salePrice"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetProductQuery, GetProductQueryVariables>;
export const ProductCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ProductCategoriesQuery, ProductCategoriesQueryVariables>;
export const ProductSubcategoriesByBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductSubcategoriesByBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productSubcategoriesByBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ProductSubcategoriesByBusinessQuery, ProductSubcategoriesByBusinessQueryVariables>;
export const ValidatePromotionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ValidatePromotions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cart"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CartContextInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"manualCode"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"validatePromotions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cart"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cart"}}},{"kind":"Argument","name":{"kind":"Name","value":"manualCode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"manualCode"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalDiscount"}},{"kind":"Field","name":{"kind":"Name","value":"freeDeliveryApplied"}},{"kind":"Field","name":{"kind":"Name","value":"finalSubtotal"}},{"kind":"Field","name":{"kind":"Name","value":"finalDeliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"finalTotal"}},{"kind":"Field","name":{"kind":"Name","value":"promotions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAmount"}},{"kind":"Field","name":{"kind":"Name","value":"freeDelivery"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}}]}}]}}]}}]} as unknown as DocumentNode<ValidatePromotionsQuery, ValidatePromotionsQueryVariables>;
export const GetPromotionThresholdsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPromotionThresholds"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cart"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CartContextInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPromotionThresholds"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cart"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cart"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"spendThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"eligibleBusinessIds"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<GetPromotionThresholdsQuery, GetPromotionThresholdsQueryVariables>;
export const GetMyReferralStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyReferralStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myReferralStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalReferrals"}},{"kind":"Field","name":{"kind":"Name","value":"completedReferrals"}},{"kind":"Field","name":{"kind":"Name","value":"pendingReferrals"}},{"kind":"Field","name":{"kind":"Name","value":"totalRewardsEarned"}},{"kind":"Field","name":{"kind":"Name","value":"referralCode"}},{"kind":"Field","name":{"kind":"Name","value":"referrals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"rewardGiven"}},{"kind":"Field","name":{"kind":"Name","value":"rewardAmount"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"referredUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetMyReferralStatsQuery, GetMyReferralStatsQueryVariables>;
export const GenerateReferralCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateReferralCode"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateReferralCode"}}]}}]} as unknown as DocumentNode<GenerateReferralCodeMutation, GenerateReferralCodeMutationVariables>;
export const GetStoreStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetStoreStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getStoreStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isStoreClosed"}},{"kind":"Field","name":{"kind":"Name","value":"closedMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"bannerMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerType"}}]}}]}}]} as unknown as DocumentNode<GetStoreStatusQuery, GetStoreStatusQueryVariables>;