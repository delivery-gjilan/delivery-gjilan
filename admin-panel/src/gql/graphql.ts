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

export type GetAllPromotionsQueryVariables = Exact<{
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetAllPromotionsQuery = { __typename?: 'Query', getAllPromotions: Array<{ __typename?: 'Promotion', id: string, code?: string | null, name: string, type: PromotionType, target: PromotionTarget, isActive: boolean, discountValue?: number | null, currentGlobalUsage: number, maxGlobalUsage?: number | null, totalRevenue: number }> };

export type DeletePromotionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePromotionMutation = { __typename?: 'Mutation', deletePromotion: boolean };

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


export type CreateBusinessMutation = { __typename?: 'Mutation', createBusiness: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, imageUrl?: string | null, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string }, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> } };

export type UpdateBusinessMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
}>;


export type UpdateBusinessMutation = { __typename?: 'Mutation', updateBusiness: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, imageUrl?: string | null, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string }, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> } };

export type DeleteBusinessMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBusinessMutation = { __typename?: 'Mutation', deleteBusiness: boolean };

export type SetBusinessScheduleMutationVariables = Exact<{
  businessId: Scalars['ID']['input'];
  schedule: Array<BusinessDayHoursInput> | BusinessDayHoursInput;
}>;


export type SetBusinessScheduleMutation = { __typename?: 'Mutation', setBusinessSchedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> };

export type BusinessQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BusinessQuery = { __typename?: 'Query', business?: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, createdAt: any, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string }, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> } | null };

export type BusinessesQueryVariables = Exact<{ [key: string]: never; }>;


export type BusinessesQuery = { __typename?: 'Query', businesses: Array<{ __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, createdAt: any, updatedAt: any, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string }, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> }> };

export type GetDeliveryPricingTiersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDeliveryPricingTiersQuery = { __typename?: 'Query', deliveryPricingTiers: Array<{ __typename?: 'DeliveryPricingTier', id: string, minDistanceKm: number, maxDistanceKm?: number | null, price: number, sortOrder: number, isActive: boolean, createdAt: any, updatedAt: any }> };

export type SetDeliveryPricingTiersMutationVariables = Exact<{
  input: SetDeliveryPricingTiersInput;
}>;


export type SetDeliveryPricingTiersMutation = { __typename?: 'Mutation', setDeliveryPricingTiers: Array<{ __typename?: 'DeliveryPricingTier', id: string, minDistanceKm: number, maxDistanceKm?: number | null, price: number, sortOrder: number, isActive: boolean }> };

export type CreateDeliveryPricingTierMutationVariables = Exact<{
  input: CreateDeliveryPricingTierInput;
}>;


export type CreateDeliveryPricingTierMutation = { __typename?: 'Mutation', createDeliveryPricingTier: { __typename?: 'DeliveryPricingTier', id: string, minDistanceKm: number, maxDistanceKm?: number | null, price: number, sortOrder: number, isActive: boolean } };

export type UpdateDeliveryPricingTierMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateDeliveryPricingTierInput;
}>;


export type UpdateDeliveryPricingTierMutation = { __typename?: 'Mutation', updateDeliveryPricingTier: { __typename?: 'DeliveryPricingTier', id: string, minDistanceKm: number, maxDistanceKm?: number | null, price: number, sortOrder: number, isActive: boolean } };

export type DeleteDeliveryPricingTierMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDeliveryPricingTierMutation = { __typename?: 'Mutation', deleteDeliveryPricingTier: boolean };

export type GetDeliveryZonesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDeliveryZonesQuery = { __typename?: 'Query', deliveryZones: Array<{ __typename?: 'DeliveryZone', id: string, name: string, deliveryFee: number, sortOrder: number, isActive: boolean, createdAt: any, updatedAt: any, polygon: Array<{ __typename?: 'PolygonPoint', lat: number, lng: number }> }> };

export type CreateDeliveryZoneMutationVariables = Exact<{
  input: CreateDeliveryZoneInput;
}>;


export type CreateDeliveryZoneMutation = { __typename?: 'Mutation', createDeliveryZone: { __typename?: 'DeliveryZone', id: string, name: string, deliveryFee: number, sortOrder: number, isActive: boolean, createdAt: any, updatedAt: any, polygon: Array<{ __typename?: 'PolygonPoint', lat: number, lng: number }> } };

export type UpdateDeliveryZoneMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateDeliveryZoneInput;
}>;


export type UpdateDeliveryZoneMutation = { __typename?: 'Mutation', updateDeliveryZone: { __typename?: 'DeliveryZone', id: string, name: string, deliveryFee: number, sortOrder: number, isActive: boolean, createdAt: any, updatedAt: any, polygon: Array<{ __typename?: 'PolygonPoint', lat: number, lng: number }> } };

export type DeleteDeliveryZoneMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDeliveryZoneMutation = { __typename?: 'Mutation', deleteDeliveryZone: boolean };

export type GetNotificationCampaignsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetNotificationCampaignsQuery = { __typename?: 'Query', notificationCampaigns: Array<{ __typename?: 'NotificationCampaign', id: string, title: string, body: string, data?: any | null, query?: any | null, targetCount: number, sentCount: number, failedCount: number, status: CampaignStatus, sentBy?: string | null, createdAt: any, sentAt?: any | null }> };

export type GetNotificationCampaignQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetNotificationCampaignQuery = { __typename?: 'Query', notificationCampaign?: { __typename?: 'NotificationCampaign', id: string, title: string, body: string, data?: any | null, query?: any | null, targetCount: number, sentCount: number, failedCount: number, status: CampaignStatus, sentBy?: string | null, createdAt: any, sentAt?: any | null } | null };

export type PreviewCampaignAudienceQueryVariables = Exact<{
  query: Scalars['JSON']['input'];
}>;


export type PreviewCampaignAudienceQuery = { __typename?: 'Query', previewCampaignAudience: { __typename?: 'AudiencePreview', count: number, sampleUsers: Array<{ __typename?: 'User', id: string, firstName: string, lastName: string, email: string, role: UserRole }> } };

export type CreateCampaignMutationVariables = Exact<{
  input: CreateCampaignInput;
}>;


export type CreateCampaignMutation = { __typename?: 'Mutation', createCampaign: { __typename?: 'NotificationCampaign', id: string, title: string, body: string, status: CampaignStatus, createdAt: any } };

export type SendCampaignMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SendCampaignMutation = { __typename?: 'Mutation', sendCampaign: { __typename?: 'NotificationCampaign', id: string, title: string, status: CampaignStatus, targetCount: number, sentCount: number, failedCount: number, sentAt?: any | null } };

export type SendPushNotificationMutationVariables = Exact<{
  input: SendPushNotificationInput;
}>;


export type SendPushNotificationMutation = { __typename?: 'Mutation', sendPushNotification: { __typename?: 'SendNotificationResult', success: boolean, successCount: number, failureCount: number } };

export type DeleteCampaignMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCampaignMutation = { __typename?: 'Mutation', deleteCampaign: boolean };

export type UpdateOrderStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: OrderStatus;
}>;


export type UpdateOrderStatusMutation = { __typename?: 'Mutation', updateOrderStatus: { __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, businessType: BusinessType }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> } };

export type CancelOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelOrderMutation = { __typename?: 'Mutation', cancelOrder: { __typename?: 'Order', id: string, status: OrderStatus } };

export type StartPreparingMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  preparationMinutes: Scalars['Int']['input'];
}>;


export type StartPreparingMutation = { __typename?: 'Mutation', startPreparing: { __typename?: 'Order', id: string, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null } };

export type UpdatePreparationTimeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  preparationMinutes: Scalars['Int']['input'];
}>;


export type UpdatePreparationTimeMutation = { __typename?: 'Mutation', updatePreparationTime: { __typename?: 'Order', id: string, preparationMinutes?: number | null, estimatedReadyAt?: any | null } };

export type AssignDriverToOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  driverId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type AssignDriverToOrderMutation = { __typename?: 'Mutation', assignDriverToOrder: { __typename?: 'Order', id: string, status: OrderStatus, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null } };

export type CreateTestOrderMutationVariables = Exact<{ [key: string]: never; }>;


export type CreateTestOrderMutation = { __typename?: 'Mutation', createTestOrder: { __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, businessType: BusinessType }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> } };

export type GetOrdersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOrdersQuery = { __typename?: 'Query', orders: Array<{ __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number, quantityInStock: number, quantityNeeded: number }> }> }> };

export type GetOrderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetOrderQuery = { __typename?: 'Query', order?: { __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number, quantityInStock: number, quantityNeeded: number }> }> } | null };

export type GetOrdersByStatusQueryVariables = Exact<{
  status: OrderStatus;
}>;


export type GetOrdersByStatusQuery = { __typename?: 'Query', ordersByStatus: Array<{ __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number }> }> }> };

export type OrdersUpdatedSubscriptionVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type OrdersUpdatedSubscription = { __typename?: 'Subscription', userOrdersUpdated: Array<{ __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number, quantityInStock: number, quantityNeeded: number }> }> }> };

export type AllOrdersUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type AllOrdersUpdatedSubscription = { __typename?: 'Subscription', allOrdersUpdated: Array<{ __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, businessType: BusinessType, phoneNumber?: string | null, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, price: number, quantityInStock: number, quantityNeeded: number }> }> }> };

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


export type CreatePromotionMutation = { __typename?: 'Mutation', createPromotion: { __typename?: 'Promotion', id: string, name: string, description?: string | null, code?: string | null, type: PromotionType, target: PromotionTarget, discountValue?: number | null, maxDiscountCap?: number | null, minOrderAmount?: number | null, spendThreshold?: number | null, thresholdReward?: string | null, maxGlobalUsage?: number | null, currentGlobalUsage: number, maxUsagePerUser?: number | null, isStackable: boolean, priority: number, isActive: boolean, startsAt?: string | null, endsAt?: string | null, createdAt: string } };

export type UpdatePromotionMutationVariables = Exact<{
  input: UpdatePromotionInput;
}>;


export type UpdatePromotionMutation = { __typename?: 'Mutation', updatePromotion: { __typename?: 'Promotion', id: string, name: string, description?: string | null, code?: string | null, type: PromotionType, target: PromotionTarget, discountValue?: number | null, maxDiscountCap?: number | null, minOrderAmount?: number | null, spendThreshold?: number | null, thresholdReward?: string | null, maxGlobalUsage?: number | null, currentGlobalUsage: number, maxUsagePerUser?: number | null, isStackable: boolean, priority: number, isActive: boolean, startsAt?: string | null, endsAt?: string | null, createdAt: string } };

export type GetPromotionsQueryVariables = Exact<{
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetPromotionsQuery = { __typename?: 'Query', getAllPromotions: Array<{ __typename?: 'Promotion', id: string, name: string, description?: string | null, code?: string | null, type: PromotionType, target: PromotionTarget, discountValue?: number | null, maxDiscountCap?: number | null, minOrderAmount?: number | null, spendThreshold?: number | null, thresholdReward?: string | null, maxGlobalUsage?: number | null, currentGlobalUsage: number, maxUsagePerUser?: number | null, isStackable: boolean, priority: number, isActive: boolean, startsAt?: string | null, endsAt?: string | null, createdAt: string, totalUsageCount: number, totalRevenue: number }> };

export type GetPromotionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetPromotionQuery = { __typename?: 'Query', getPromotion?: { __typename?: 'Promotion', id: string, name: string, description?: string | null, code?: string | null, type: PromotionType, target: PromotionTarget, discountValue?: number | null, maxDiscountCap?: number | null, minOrderAmount?: number | null, spendThreshold?: number | null, thresholdReward?: string | null, maxGlobalUsage?: number | null, currentGlobalUsage: number, maxUsagePerUser?: number | null, isStackable: boolean, priority: number, isActive: boolean, startsAt?: string | null, endsAt?: string | null, createdAt: string, totalUsageCount: number, totalRevenue: number } | null };

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

export type GetStoreStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetStoreStatusQuery = { __typename?: 'Query', getStoreStatus: { __typename?: 'StoreStatus', isStoreClosed: boolean, closedMessage?: string | null, bannerEnabled: boolean, bannerMessage?: string | null, bannerType: BannerType } };

export type UpdateStoreStatusMutationVariables = Exact<{
  input: UpdateStoreStatusInput;
}>;


export type UpdateStoreStatusMutation = { __typename?: 'Mutation', updateStoreStatus: { __typename?: 'StoreStatus', isStoreClosed: boolean, closedMessage?: string | null, bannerEnabled: boolean, bannerMessage?: string | null, bannerType: BannerType } };

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

export type AdminUpdateDriverSettingsMutationVariables = Exact<{
  driverId: Scalars['ID']['input'];
  commissionPercentage?: InputMaybe<Scalars['Float']['input']>;
  maxActiveOrders?: InputMaybe<Scalars['Int']['input']>;
}>;


export type AdminUpdateDriverSettingsMutation = { __typename?: 'Mutation', adminUpdateDriverSettings: { __typename?: 'User', id: string, commissionPercentage?: number | null, maxActiveOrders?: number | null } };

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

export type SetUserPermissionsMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  permissions: Array<UserPermission> | UserPermission;
}>;


export type SetUserPermissionsMutation = { __typename?: 'Mutation', setUserPermissions: { __typename?: 'User', id: string, permissions: Array<UserPermission> } };

export type UsersQueryVariables = Exact<{ [key: string]: never; }>;


export type UsersQuery = { __typename?: 'Query', users: Array<{ __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, phoneNumber?: string | null, address?: string | null, adminNote?: string | null, flagColor?: string | null, permissions: Array<UserPermission>, business?: { __typename?: 'Business', id: string, name: string } | null }> };

export type DriversQueryVariables = Exact<{ [key: string]: never; }>;


export type DriversQuery = { __typename?: 'Query', drivers: Array<{ __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, imageUrl?: string | null, phoneNumber?: string | null, commissionPercentage?: number | null, maxActiveOrders?: number | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null, driverConnection?: { __typename?: 'DriverConnection', onlinePreference: boolean, connectionStatus: DriverConnectionStatus, lastHeartbeatAt?: any | null, lastLocationUpdate?: any | null, disconnectedAt?: any | null } | null }> };

export type UserBehaviorQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type UserBehaviorQuery = { __typename?: 'Query', userBehavior?: { __typename?: 'UserBehavior', userId: string, totalOrders: number, deliveredOrders: number, cancelledOrders: number, totalSpend: number, avgOrderValue: number, firstOrderAt?: any | null, lastOrderAt?: any | null, lastDeliveredAt?: any | null } | null };

export type DriversUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type DriversUpdatedSubscription = { __typename?: 'Subscription', driversUpdated: Array<{ __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, imageUrl?: string | null, phoneNumber?: string | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null, driverConnection?: { __typename?: 'DriverConnection', onlinePreference: boolean, connectionStatus: DriverConnectionStatus, lastHeartbeatAt?: any | null, lastLocationUpdate?: any | null, disconnectedAt?: any | null } | null }> };


export const GetAllPromotionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllPromotions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAllPromotions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"isActive"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"discountValue"}},{"kind":"Field","name":{"kind":"Name","value":"currentGlobalUsage"}},{"kind":"Field","name":{"kind":"Name","value":"maxGlobalUsage"}},{"kind":"Field","name":{"kind":"Name","value":"totalRevenue"}}]}}]}}]} as unknown as DocumentNode<GetAllPromotionsQuery, GetAllPromotionsQueryVariables>;
export const DeletePromotionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePromotion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePromotion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeletePromotionMutation, DeletePromotionMutationVariables>;
export const GetAuditLogsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAuditLogs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actorId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actorType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ActorType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"action"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ActionType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"EntityType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"DateTime"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"DateTime"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"auditLogs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"actorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"actorType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actorType"}}},{"kind":"Argument","name":{"kind":"Name","value":"action"},"value":{"kind":"Variable","name":{"kind":"Name","value":"action"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"actorId"}},{"kind":"Field","name":{"kind":"Name","value":"actor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actorType"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"ipAddress"}},{"kind":"Field","name":{"kind":"Name","value":"userAgent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"hasMore"}}]}}]}}]} as unknown as DocumentNode<GetAuditLogsQuery, GetAuditLogsQueryVariables>;
export const GetAuditLogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAuditLog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"auditLog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"actorId"}},{"kind":"Field","name":{"kind":"Name","value":"actor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actorType"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"ipAddress"}},{"kind":"Field","name":{"kind":"Name","value":"userAgent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetAuditLogQuery, GetAuditLogQueryVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const CreateBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateBusinessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}}]}}]} as unknown as DocumentNode<CreateBusinessMutation, CreateBusinessMutationVariables>;
export const UpdateBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateBusinessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateBusinessMutation, UpdateBusinessMutationVariables>;
export const DeleteBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteBusinessMutation, DeleteBusinessMutationVariables>;
export const SetBusinessScheduleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetBusinessSchedule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BusinessDayHoursInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setBusinessSchedule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"schedule"},"value":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}}]} as unknown as DocumentNode<SetBusinessScheduleMutation, SetBusinessScheduleMutationVariables>;
export const BusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Business"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<BusinessQuery, BusinessQueryVariables>;
export const BusinessesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<BusinessesQuery, BusinessesQueryVariables>;
export const GetDeliveryPricingTiersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDeliveryPricingTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deliveryPricingTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"minDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"maxDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetDeliveryPricingTiersQuery, GetDeliveryPricingTiersQueryVariables>;
export const SetDeliveryPricingTiersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetDeliveryPricingTiers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetDeliveryPricingTiersInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setDeliveryPricingTiers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"minDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"maxDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<SetDeliveryPricingTiersMutation, SetDeliveryPricingTiersMutationVariables>;
export const CreateDeliveryPricingTierDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateDeliveryPricingTier"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateDeliveryPricingTierInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createDeliveryPricingTier"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"minDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"maxDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<CreateDeliveryPricingTierMutation, CreateDeliveryPricingTierMutationVariables>;
export const UpdateDeliveryPricingTierDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDeliveryPricingTier"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateDeliveryPricingTierInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDeliveryPricingTier"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"minDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"maxDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<UpdateDeliveryPricingTierMutation, UpdateDeliveryPricingTierMutationVariables>;
export const DeleteDeliveryPricingTierDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteDeliveryPricingTier"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteDeliveryPricingTier"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteDeliveryPricingTierMutation, DeleteDeliveryPricingTierMutationVariables>;
export const GetDeliveryZonesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDeliveryZones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deliveryZones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"polygon"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lat"}},{"kind":"Field","name":{"kind":"Name","value":"lng"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deliveryFee"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetDeliveryZonesQuery, GetDeliveryZonesQueryVariables>;
export const CreateDeliveryZoneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateDeliveryZone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateDeliveryZoneInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createDeliveryZone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"polygon"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lat"}},{"kind":"Field","name":{"kind":"Name","value":"lng"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deliveryFee"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateDeliveryZoneMutation, CreateDeliveryZoneMutationVariables>;
export const UpdateDeliveryZoneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDeliveryZone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateDeliveryZoneInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDeliveryZone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"polygon"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lat"}},{"kind":"Field","name":{"kind":"Name","value":"lng"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deliveryFee"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateDeliveryZoneMutation, UpdateDeliveryZoneMutationVariables>;
export const DeleteDeliveryZoneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteDeliveryZone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteDeliveryZone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteDeliveryZoneMutation, DeleteDeliveryZoneMutationVariables>;
export const GetNotificationCampaignsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotificationCampaigns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationCampaigns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"query"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"sentCount"}},{"kind":"Field","name":{"kind":"Name","value":"failedCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sentBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}}]}}]}}]} as unknown as DocumentNode<GetNotificationCampaignsQuery, GetNotificationCampaignsQueryVariables>;
export const GetNotificationCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotificationCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"query"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"sentCount"}},{"kind":"Field","name":{"kind":"Name","value":"failedCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sentBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}}]}}]}}]} as unknown as DocumentNode<GetNotificationCampaignQuery, GetNotificationCampaignQueryVariables>;
export const PreviewCampaignAudienceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PreviewCampaignAudience"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"previewCampaignAudience"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"sampleUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]}}]} as unknown as DocumentNode<PreviewCampaignAudienceQuery, PreviewCampaignAudienceQueryVariables>;
export const CreateCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCampaignInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateCampaignMutation, CreateCampaignMutationVariables>;
export const SendCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"sentCount"}},{"kind":"Field","name":{"kind":"Name","value":"failedCount"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}}]}}]}}]} as unknown as DocumentNode<SendCampaignMutation, SendCampaignMutationVariables>;
export const SendPushNotificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendPushNotification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SendPushNotificationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendPushNotification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"successCount"}},{"kind":"Field","name":{"kind":"Name","value":"failureCount"}}]}}]}}]} as unknown as DocumentNode<SendPushNotificationMutation, SendPushNotificationMutationVariables>;
export const DeleteCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteCampaignMutation, DeleteCampaignMutationVariables>;
export const UpdateOrderStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateOrderStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOrderStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UpdateOrderStatusMutation, UpdateOrderStatusMutationVariables>;
export const CancelOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<CancelOrderMutation, CancelOrderMutationVariables>;
export const StartPreparingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartPreparing"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startPreparing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"preparationMinutes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}}]}}]}}]} as unknown as DocumentNode<StartPreparingMutation, StartPreparingMutationVariables>;
export const UpdatePreparationTimeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePreparationTime"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePreparationTime"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"preparationMinutes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}}]}}]}}]} as unknown as DocumentNode<UpdatePreparationTimeMutation, UpdatePreparationTimeMutationVariables>;
export const AssignDriverToOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AssignDriverToOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignDriverToOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AssignDriverToOrderMutation, AssignDriverToOrderMutationVariables>;
export const CreateTestOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTestOrder"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTestOrder"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateTestOrderMutation, CreateTestOrderMutationVariables>;
export const GetOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"quantityInStock"}},{"kind":"Field","name":{"kind":"Name","value":"quantityNeeded"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrdersQuery, GetOrdersQueryVariables>;
export const GetOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"quantityInStock"}},{"kind":"Field","name":{"kind":"Name","value":"quantityNeeded"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrderQuery, GetOrderQueryVariables>;
export const GetOrdersByStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrdersByStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ordersByStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrdersByStatusQuery, GetOrdersByStatusQueryVariables>;
export const OrdersUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OrdersUpdated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userOrdersUpdated"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"quantityInStock"}},{"kind":"Field","name":{"kind":"Name","value":"quantityNeeded"}}]}}]}}]}}]}}]} as unknown as DocumentNode<OrdersUpdatedSubscription, OrdersUpdatedSubscriptionVariables>;
export const AllOrdersUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"AllOrdersUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allOrdersUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"quantityInStock"}},{"kind":"Field","name":{"kind":"Name","value":"quantityNeeded"}}]}}]}}]}}]}}]} as unknown as DocumentNode<AllOrdersUpdatedSubscription, AllOrdersUpdatedSubscriptionVariables>;
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
export const CreatePromotionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePromotion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreatePromotionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPromotion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"discountValue"}},{"kind":"Field","name":{"kind":"Name","value":"maxDiscountCap"}},{"kind":"Field","name":{"kind":"Name","value":"minOrderAmount"}},{"kind":"Field","name":{"kind":"Name","value":"spendThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"thresholdReward"}},{"kind":"Field","name":{"kind":"Name","value":"maxGlobalUsage"}},{"kind":"Field","name":{"kind":"Name","value":"currentGlobalUsage"}},{"kind":"Field","name":{"kind":"Name","value":"maxUsagePerUser"}},{"kind":"Field","name":{"kind":"Name","value":"isStackable"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreatePromotionMutation, CreatePromotionMutationVariables>;
export const UpdatePromotionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePromotion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdatePromotionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePromotion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"discountValue"}},{"kind":"Field","name":{"kind":"Name","value":"maxDiscountCap"}},{"kind":"Field","name":{"kind":"Name","value":"minOrderAmount"}},{"kind":"Field","name":{"kind":"Name","value":"spendThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"thresholdReward"}},{"kind":"Field","name":{"kind":"Name","value":"maxGlobalUsage"}},{"kind":"Field","name":{"kind":"Name","value":"currentGlobalUsage"}},{"kind":"Field","name":{"kind":"Name","value":"maxUsagePerUser"}},{"kind":"Field","name":{"kind":"Name","value":"isStackable"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<UpdatePromotionMutation, UpdatePromotionMutationVariables>;
export const GetPromotionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPromotions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAllPromotions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"isActive"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"discountValue"}},{"kind":"Field","name":{"kind":"Name","value":"maxDiscountCap"}},{"kind":"Field","name":{"kind":"Name","value":"minOrderAmount"}},{"kind":"Field","name":{"kind":"Name","value":"spendThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"thresholdReward"}},{"kind":"Field","name":{"kind":"Name","value":"maxGlobalUsage"}},{"kind":"Field","name":{"kind":"Name","value":"currentGlobalUsage"}},{"kind":"Field","name":{"kind":"Name","value":"maxUsagePerUser"}},{"kind":"Field","name":{"kind":"Name","value":"isStackable"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"totalUsageCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalRevenue"}}]}}]}}]} as unknown as DocumentNode<GetPromotionsQuery, GetPromotionsQueryVariables>;
export const GetPromotionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPromotion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPromotion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"discountValue"}},{"kind":"Field","name":{"kind":"Name","value":"maxDiscountCap"}},{"kind":"Field","name":{"kind":"Name","value":"minOrderAmount"}},{"kind":"Field","name":{"kind":"Name","value":"spendThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"thresholdReward"}},{"kind":"Field","name":{"kind":"Name","value":"maxGlobalUsage"}},{"kind":"Field","name":{"kind":"Name","value":"currentGlobalUsage"}},{"kind":"Field","name":{"kind":"Name","value":"maxUsagePerUser"}},{"kind":"Field","name":{"kind":"Name","value":"isStackable"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"totalUsageCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalRevenue"}}]}}]}}]} as unknown as DocumentNode<GetPromotionQuery, GetPromotionQueryVariables>;
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
export const GetStoreStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetStoreStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getStoreStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isStoreClosed"}},{"kind":"Field","name":{"kind":"Name","value":"closedMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"bannerMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerType"}}]}}]}}]} as unknown as DocumentNode<GetStoreStatusQuery, GetStoreStatusQueryVariables>;
export const UpdateStoreStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateStoreStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateStoreStatusInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateStoreStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isStoreClosed"}},{"kind":"Field","name":{"kind":"Name","value":"closedMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"bannerMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerType"}}]}}]}}]} as unknown as DocumentNode<UpdateStoreStatusMutation, UpdateStoreStatusMutationVariables>;
export const CreateUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"firstName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"lastName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<CreateUserMutation, CreateUserMutationVariables>;
export const UpdateUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"firstName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"lastName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateUserMutation, UpdateUserMutationVariables>;
export const DeleteUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteUserMutation, DeleteUserMutationVariables>;
export const AdminUpdateDriverSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateDriverSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"commissionPercentage"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"maxActiveOrders"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUpdateDriverSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}},{"kind":"Argument","name":{"kind":"Name","value":"commissionPercentage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"commissionPercentage"}}},{"kind":"Argument","name":{"kind":"Name","value":"maxActiveOrders"},"value":{"kind":"Variable","name":{"kind":"Name","value":"maxActiveOrders"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commissionPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"maxActiveOrders"}}]}}]}}]} as unknown as DocumentNode<AdminUpdateDriverSettingsMutation, AdminUpdateDriverSettingsMutationVariables>;
export const UpdateUserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"flagColor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}},{"kind":"Argument","name":{"kind":"Name","value":"flagColor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"flagColor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"adminNote"}},{"kind":"Field","name":{"kind":"Name","value":"flagColor"}}]}}]}}]} as unknown as DocumentNode<UpdateUserNoteMutation, UpdateUserNoteMutationVariables>;
export const AdminUpdateDriverLocationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateDriverLocation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"latitude"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"longitude"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUpdateDriverLocation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}},{"kind":"Argument","name":{"kind":"Name","value":"latitude"},"value":{"kind":"Variable","name":{"kind":"Name","value":"latitude"}}},{"kind":"Argument","name":{"kind":"Name","value":"longitude"},"value":{"kind":"Variable","name":{"kind":"Name","value":"longitude"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}}]}}]}}]} as unknown as DocumentNode<AdminUpdateDriverLocationMutation, AdminUpdateDriverLocationMutationVariables>;
export const UpdateDriverOnlineStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDriverOnlineStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isOnline"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDriverOnlineStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"isOnline"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isOnline"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isOnline"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode<UpdateDriverOnlineStatusMutation, UpdateDriverOnlineStatusMutationVariables>;
export const SetUserPermissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetUserPermissions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"permissions"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserPermission"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setUserPermissions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"permissions"},"value":{"kind":"Variable","name":{"kind":"Name","value":"permissions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}}]} as unknown as DocumentNode<SetUserPermissionsMutation, SetUserPermissionsMutationVariables>;
export const UsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"adminNote"}},{"kind":"Field","name":{"kind":"Name","value":"flagColor"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<UsersQuery, UsersQueryVariables>;
export const DriversDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Drivers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"drivers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"commissionPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"maxActiveOrders"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"onlinePreference"}},{"kind":"Field","name":{"kind":"Name","value":"connectionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lastHeartbeatAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastLocationUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"disconnectedAt"}}]}}]}}]}}]} as unknown as DocumentNode<DriversQuery, DriversQueryVariables>;
export const UserBehaviorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserBehavior"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userBehavior"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"totalOrders"}},{"kind":"Field","name":{"kind":"Name","value":"deliveredOrders"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledOrders"}},{"kind":"Field","name":{"kind":"Name","value":"totalSpend"}},{"kind":"Field","name":{"kind":"Name","value":"avgOrderValue"}},{"kind":"Field","name":{"kind":"Name","value":"firstOrderAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastOrderAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastDeliveredAt"}}]}}]}}]} as unknown as DocumentNode<UserBehaviorQuery, UserBehaviorQueryVariables>;
export const DriversUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"DriversUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"driversUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"onlinePreference"}},{"kind":"Field","name":{"kind":"Name","value":"connectionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lastHeartbeatAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastLocationUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"disconnectedAt"}}]}}]}}]}}]} as unknown as DocumentNode<DriversUpdatedSubscription, DriversUpdatedSubscriptionVariables>;