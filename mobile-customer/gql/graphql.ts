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

export type AgoraRtcCredentials = {
  __typename?: 'AgoraRtcCredentials';
  appId: Scalars['String']['output'];
  channelName: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  token: Scalars['String']['output'];
  uid: Scalars['Int']['output'];
};

export enum AgoraRtcRole {
  Publisher = 'PUBLISHER',
  Subscriber = 'SUBSCRIBER'
}

export enum AppLanguage {
  Al = 'AL',
  En = 'EN'
}

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
  refreshToken?: Maybe<Scalars['String']['output']>;
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
  isTemporarilyClosed: Scalars['Boolean']['output'];
  location: Location;
  name: Scalars['String']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
  prepTimeOverrideMinutes?: Maybe<Scalars['Int']['output']>;
  schedule: Array<BusinessDayHours>;
  temporaryClosureReason?: Maybe<Scalars['String']['output']>;
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

export type BusinessDeviceHealth = {
  __typename?: 'BusinessDeviceHealth';
  appState?: Maybe<Scalars['String']['output']>;
  appVersion?: Maybe<Scalars['String']['output']>;
  batteryLevel?: Maybe<Scalars['Int']['output']>;
  businessId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  deviceId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isCharging?: Maybe<Scalars['Boolean']['output']>;
  lastHeartbeatAt: Scalars['DateTime']['output'];
  lastOrderId?: Maybe<Scalars['ID']['output']>;
  lastOrderSignalAt?: Maybe<Scalars['DateTime']['output']>;
  lastPushReceivedAt?: Maybe<Scalars['DateTime']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  networkType?: Maybe<Scalars['String']['output']>;
  onlineStatus: BusinessDeviceOnlineStatus;
  platform: DevicePlatform;
  receivingOrders: Scalars['Boolean']['output'];
  subscriptionAlive: Scalars['Boolean']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

export type BusinessDeviceHeartbeatInput = {
  appState?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  batteryLevel?: InputMaybe<Scalars['Int']['input']>;
  deviceId: Scalars['String']['input'];
  isCharging?: InputMaybe<Scalars['Boolean']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  networkType?: InputMaybe<Scalars['String']['input']>;
  platform: DevicePlatform;
  subscriptionAlive: Scalars['Boolean']['input'];
};

export enum BusinessDeviceOnlineStatus {
  Offline = 'OFFLINE',
  Online = 'ONLINE',
  Stale = 'STALE'
}

export type BusinessKpi = {
  __typename?: 'BusinessKPI';
  /** Median minutes driver waited at pickup after arriving */
  avgDriverWaitMin?: Maybe<Scalars['Float']['output']>;
  avgPrepTimeMin?: Maybe<Scalars['Float']['output']>;
  businessId: Scalars['ID']['output'];
  businessName: Scalars['String']['output'];
  cancellationRate: Scalars['Float']['output'];
  completedOrders: Scalars['Int']['output'];
  /** Orders where driver arrived before restaurant pressed Ready */
  fakeReadyCount: Scalars['Int']['output'];
  fakeReadyRate?: Maybe<Scalars['Float']['output']>;
  p90PrepTimeMin?: Maybe<Scalars['Float']['output']>;
  /** % of orders where restaurant pressed Ready before prep time was 50% elapsed */
  prematureReadyRate?: Maybe<Scalars['Float']['output']>;
  prepOverrunRate?: Maybe<Scalars['Float']['output']>;
  totalOrders: Scalars['Int']['output'];
};

export type BusinessMessage = {
  __typename?: 'BusinessMessage';
  admin?: Maybe<BusinessMessageUser>;
  adminId: Scalars['ID']['output'];
  alertType: MessageAlertType;
  body: Scalars['String']['output'];
  businessUser?: Maybe<BusinessMessageUser>;
  businessUserId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  readAt?: Maybe<Scalars['DateTime']['output']>;
  senderRole: Scalars['String']['output'];
};

export type BusinessMessageThread = {
  __typename?: 'BusinessMessageThread';
  businessUserId: Scalars['ID']['output'];
  businessUserName: Scalars['String']['output'];
  lastMessage?: Maybe<BusinessMessage>;
  unreadCount: Scalars['Int']['output'];
};

export type BusinessMessageUser = {
  __typename?: 'BusinessMessageUser';
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
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

export type CreateBusinessOwnerInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type CreateBusinessWithOwnerInput = {
  business: CreateBusinessInput;
  owner: CreateBusinessOwnerInput;
};

export type CreateBusinessWithOwnerPayload = {
  __typename?: 'CreateBusinessWithOwnerPayload';
  business: Business;
  owner: User;
};

export type CreateCampaignInput = {
  body: Scalars['String']['input'];
  bodyAl?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  data?: InputMaybe<Scalars['JSON']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  query: Scalars['JSON']['input'];
  relevanceScore?: InputMaybe<Scalars['Float']['input']>;
  timeSensitive?: InputMaybe<Scalars['Boolean']['input']>;
  title: Scalars['String']['input'];
  titleAl?: InputMaybe<Scalars['String']['input']>;
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
  isServiceZone?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  polygon: Array<PolygonPointInput>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateOptionGroupInput = {
  displayOrder?: InputMaybe<Scalars['Int']['input']>;
  maxSelections: Scalars['Int']['input'];
  minSelections: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  options: Array<CreateOptionInput>;
  productId: Scalars['ID']['input'];
};

export type CreateOptionInput = {
  displayOrder?: InputMaybe<Scalars['Int']['input']>;
  extraPrice?: InputMaybe<Scalars['Float']['input']>;
  linkedProductId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
};

export type CreateOrderChildItemInput = {
  productId: Scalars['ID']['input'];
  selectedOptions: Array<CreateOrderItemOptionInput>;
};

export type CreateOrderInput = {
  deliveryPrice: Scalars['Float']['input'];
  driverNotes?: InputMaybe<Scalars['String']['input']>;
  dropOffLocation: LocationInput;
  items: Array<CreateOrderItemInput>;
  paymentCollection?: InputMaybe<OrderPaymentCollection>;
  prioritySurcharge?: InputMaybe<Scalars['Float']['input']>;
  promotionId?: InputMaybe<Scalars['ID']['input']>;
  totalPrice: Scalars['Float']['input'];
};

export type CreateOrderItemInput = {
  childItems?: InputMaybe<Array<CreateOrderChildItemInput>>;
  notes?: InputMaybe<Scalars['String']['input']>;
  price: Scalars['Float']['input'];
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
  selectedOptions: Array<CreateOrderItemOptionInput>;
};

export type CreateOrderItemOptionInput = {
  optionGroupId: Scalars['ID']['input'];
  optionId: Scalars['ID']['input'];
};

export type CreateProductCategoryInput = {
  businessId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateProductInput = {
  businessId: Scalars['ID']['input'];
  categoryId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  isOffer?: InputMaybe<Scalars['Boolean']['input']>;
  isOnSale?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  price: Scalars['Float']['input'];
  salePrice?: InputMaybe<Scalars['Float']['input']>;
  subcategoryId?: InputMaybe<Scalars['ID']['input']>;
  variantGroupId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateProductSubcategoryInput = {
  categoryId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CreateProductVariantGroupInput = {
  businessId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CreatePromotionInput = {
  addDriverCommission?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  createSettlementRules?: InputMaybe<Scalars['Boolean']['input']>;
  creatorId?: InputMaybe<Scalars['ID']['input']>;
  creatorType?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  discountValue?: InputMaybe<Scalars['Float']['input']>;
  driverRuleAmount?: InputMaybe<Scalars['Float']['input']>;
  driverRuleAmountType?: InputMaybe<SettlementAmountType>;
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

export type CreateSettlementRuleInput = {
  amount: Scalars['Float']['input'];
  amountType: SettlementAmountType;
  appliesTo?: InputMaybe<Scalars['String']['input']>;
  businessId?: InputMaybe<Scalars['ID']['input']>;
  direction: SettlementDirection;
  entityType: SettlementEntityType;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  promotionId?: InputMaybe<Scalars['ID']['input']>;
  type: SettlementRuleType;
};

export type CreateUserInput = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  role: UserRole;
};

export type DayOfWeekDistribution = {
  __typename?: 'DayOfWeekDistribution';
  /** 0 = Sunday, 6 = Saturday */
  dow: Scalars['Int']['output'];
  orderCount: Scalars['Int']['output'];
  revenue: Scalars['Float']['output'];
};

export type DayVolume = {
  __typename?: 'DayVolume';
  date: Scalars['String']['output'];
  orderCount: Scalars['Int']['output'];
  revenue: Scalars['Float']['output'];
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
  isServiceZone: Scalars['Boolean']['output'];
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
  Admin = 'ADMIN',
  Business = 'BUSINESS',
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

/** Result of driverLogin / driverRegister mutations */
export type DriverAuthResult = {
  __typename?: 'DriverAuthResult';
  driver: DriverBasicInfo;
  message: Scalars['String']['output'];
  refreshToken?: Maybe<Scalars['String']['output']>;
  token: Scalars['String']['output'];
};

/** Basic driver profile returned by driverLogin / driverRegister */
export type DriverBasicInfo = {
  __typename?: 'DriverBasicInfo';
  connectionStatus: DriverConnectionStatus;
  driverLat?: Maybe<Scalars['Float']['output']>;
  driverLng?: Maybe<Scalars['Float']['output']>;
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastHeartbeatAt?: Maybe<Scalars['Date']['output']>;
  lastLocationUpdate?: Maybe<Scalars['Date']['output']>;
  lastName: Scalars['String']['output'];
  onlinePreference: Scalars['Boolean']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
};

export type DriverConnection = {
  __typename?: 'DriverConnection';
  /** Current navigation order this ETA belongs to */
  activeOrderId?: Maybe<Scalars['ID']['output']>;
  /** Most recently reported battery level percentage from driver device */
  batteryLevel?: Maybe<Scalars['Int']['output']>;
  /** Whether driver opted in to battery telemetry sharing */
  batteryOptIn: Scalars['Boolean']['output'];
  /** When battery telemetry was last refreshed */
  batteryUpdatedAt?: Maybe<Scalars['Date']['output']>;
  /** System-calculated: current connection state */
  connectionStatus: DriverConnectionStatus;
  /** Timestamp when driver was marked as DISCONNECTED */
  disconnectedAt?: Maybe<Scalars['Date']['output']>;
  /** When the ETA payload was last refreshed */
  etaUpdatedAt?: Maybe<Scalars['Date']['output']>;
  /** Whether device reported it is currently charging */
  isCharging?: Maybe<Scalars['Boolean']['output']>;
  /** Last timestamp when driver sent a heartbeat (every 5s) */
  lastHeartbeatAt?: Maybe<Scalars['Date']['output']>;
  /** Last timestamp when location was written to DB (throttled to every 10s) */
  lastLocationUpdate?: Maybe<Scalars['Date']['output']>;
  /** Current navigation phase reported by the driver */
  navigationPhase?: Maybe<Scalars['String']['output']>;
  /** User's preference: "I want to work" toggle */
  onlinePreference: Scalars['Boolean']['output'];
  /** Driver-reported remaining ETA in seconds */
  remainingEtaSeconds?: Maybe<Scalars['Int']['output']>;
};

/**
 * Connection status for drivers:
 * - CONNECTED: Actively sending heartbeats
 * - STALE: No heartbeat for 45 seconds (warning state)
 * - LOST: No heartbeat for 90 seconds (offline state)
 * - DISCONNECTED: Subscription closed or never connected
 */
export enum DriverConnectionStatus {
  Connected = 'CONNECTED',
  Disconnected = 'DISCONNECTED',
  Lost = 'LOST',
  Stale = 'STALE'
}

export enum DriverCustomerNotificationKind {
  ArrivedWaiting = 'ARRIVED_WAITING',
  EtaLt_3Min = 'ETA_LT_3_MIN'
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

export type DriverKpi = {
  __typename?: 'DriverKPI';
  /** Minutes from OUT_FOR_DELIVERY to DELIVERED */
  avgDeliveryTimeMin?: Maybe<Scalars['Float']['output']>;
  /** Minutes from driver assignment to picking up (travel + wait) */
  avgPickupTimeMin?: Maybe<Scalars['Float']['output']>;
  /** Minutes driver waited at restaurant after arriving */
  avgWaitAtPickupMin?: Maybe<Scalars['Float']['output']>;
  driverId: Scalars['ID']['output'];
  driverName: Scalars['String']['output'];
  totalDeliveries: Scalars['Int']['output'];
};

export type DriverLoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type DriverMessage = {
  __typename?: 'DriverMessage';
  admin?: Maybe<DriverMessageUser>;
  adminId: Scalars['ID']['output'];
  alertType: MessageAlertType;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  driver?: Maybe<DriverMessageUser>;
  driverId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  readAt?: Maybe<Scalars['DateTime']['output']>;
  senderRole: Scalars['String']['output'];
};

export type DriverMessageThread = {
  __typename?: 'DriverMessageThread';
  driverId: Scalars['ID']['output'];
  driverName: Scalars['String']['output'];
  lastMessage?: Maybe<DriverMessage>;
  unreadCount: Scalars['Int']['output'];
};

export type DriverMessageUser = {
  __typename?: 'DriverMessageUser';
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
};

export type DriverPttSignal = {
  __typename?: 'DriverPttSignal';
  action: DriverPttSignalAction;
  adminId: Scalars['ID']['output'];
  channelName: Scalars['String']['output'];
  driverId: Scalars['ID']['output'];
  muted: Scalars['Boolean']['output'];
  timestamp: Scalars['DateTime']['output'];
};

export enum DriverPttSignalAction {
  Mute = 'MUTE',
  Started = 'STARTED',
  Stopped = 'STOPPED',
  Unmute = 'UNMUTE'
}

export type DriverRegisterInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
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

export type HourlyDistribution = {
  __typename?: 'HourlyDistribution';
  avgDeliveryTimeMin?: Maybe<Scalars['Float']['output']>;
  hour: Scalars['Int']['output'];
  orderCount: Scalars['Int']['output'];
  revenue: Scalars['Float']['output'];
};

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

export enum MessageAlertType {
  Info = 'INFO',
  Urgent = 'URGENT',
  Warning = 'WARNING'
}

export type Mutation = {
  __typename?: 'Mutation';
  addUserAddress: UserAddress;
  adminCancelOrder: Order;
  /** Admin sends push-to-talk signaling state to one or multiple drivers */
  adminSendPttSignal: Scalars['Boolean']['output'];
  /** Admin mutation to manually set connection status (for testing/recovery) */
  adminSetDriverConnectionStatus: User;
  /**
   * Admin mutation to set which drivers are on the current shift.
   * Only on-shift drivers will receive new-order dispatch notifications.
   * Pass an empty list to clear the shift restriction (all eligible drivers receive notifications).
   */
  adminSetShiftDrivers: Scalars['Boolean']['output'];
  /**
   * Admin simulation heartbeat — wraps processHeartbeat for SUPER_ADMIN.
   * Triggers the full heartbeat pipeline (ETA cache, Live Activity, subscriptions).
   * Non-production only.
   */
  adminSimulateDriverHeartbeat: DriverHeartbeatResult;
  adminUpdateDriverLocation: User;
  /** Admin mutation to update per-driver settings (commission %, max active orders, vehicle ownership) */
  adminUpdateDriverSettings: User;
  approveOrder: Order;
  assignDriverToOrder: Order;
  assignPromotionToUsers: Array<UserPromotion>;
  backfillSettlementsForDeliveredOrders: Scalars['Int']['output'];
  businessDeviceHeartbeat: Scalars['Boolean']['output'];
  businessDeviceOrderSignal: Scalars['Boolean']['output'];
  cancelOrder: Order;
  /** Admin cancels an outstanding settlement request. */
  cancelSettlementRequest: SettlementRequest;
  changeMyPassword: Scalars['Boolean']['output'];
  createBanner: Banner;
  createBusiness: Business;
  createBusinessWithOwner: CreateBusinessWithOwnerPayload;
  createCampaign: NotificationCampaign;
  createDeliveryPricingTier: DeliveryPricingTier;
  createDeliveryZone: DeliveryZone;
  createOption: Option;
  createOptionGroup: OptionGroup;
  createOrder: Order;
  createProduct: Product;
  createProductCategory: ProductCategory;
  createProductSubcategory: ProductSubcategory;
  createProductVariantGroup: ProductVariantGroup;
  createPromotion: Promotion;
  /** Admin creates a settlement request, notifying the business via push. */
  createSettlementRequest: SettlementRequest;
  createSettlementRule: SettlementRule;
  createTestOrder: Order;
  createUser: AuthResponse;
  deleteBanner: Scalars['Boolean']['output'];
  deleteBusiness: Scalars['Boolean']['output'];
  deleteCampaign: Scalars['Boolean']['output'];
  deleteDeliveryPricingTier: Scalars['Boolean']['output'];
  deleteDeliveryZone: Scalars['Boolean']['output'];
  deleteMyAccount: Scalars['Boolean']['output'];
  deleteOption: Scalars['Boolean']['output'];
  deleteOptionGroup: Scalars['Boolean']['output'];
  deleteProduct: Scalars['Boolean']['output'];
  deleteProductCategory: Scalars['Boolean']['output'];
  deleteProductSubcategory: Scalars['Boolean']['output'];
  deleteProductVariantGroup: Scalars['Boolean']['output'];
  deletePromotion: Scalars['Boolean']['output'];
  deleteSettlementRule: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  deleteUserAddress: Scalars['Boolean']['output'];
  /**
   * Driver heartbeat - call every 5 seconds while online.
   * Updates lastHeartbeatAt and connectionStatus to CONNECTED.
   * Location is throttled: only written if >10s since last write OR moved >5m.
   */
  driverHeartbeat: DriverHeartbeatResult;
  /** Driver login — returns short-lived access token + refresh token */
  driverLogin: DriverAuthResult;
  driverNotifyCustomer: Scalars['Boolean']['output'];
  /** Driver self-registration — creates user (role=DRIVER) + driver profile row */
  driverRegister: DriverAuthResult;
  /** Driver battery telemetry update (recommended every 5-10 minutes) */
  driverUpdateBatteryStatus: DriverConnection;
  generateReferralCode: Scalars['String']['output'];
  grantFreeDelivery: Scalars['Boolean']['output'];
  initiateSignup: AuthResponse;
  login: AuthResponse;
  logoutAllSessions: Scalars['Boolean']['output'];
  logoutCurrentSession: Scalars['Boolean']['output'];
  /** Mark all messages in a business conversation as read */
  markBusinessMessagesRead: Scalars['Boolean']['output'];
  /** Mark all messages in a conversation as read */
  markDriverMessagesRead: Scalars['Boolean']['output'];
  markFirstOrderUsed: UserPromoMetadata;
  markSettlementAsPaid: Settlement;
  markSettlementAsPartiallyPaid: Settlement;
  markSettlementsAsPaid: Array<Settlement>;
  refreshToken: TokenRefreshResponse;
  registerDeviceToken: Scalars['Boolean']['output'];
  registerLiveActivityToken: Scalars['Boolean']['output'];
  removeUserFromPromotion: Scalars['Boolean']['output'];
  /** Business user replies to admin */
  replyToBusinessMessage: BusinessMessage;
  /** Driver replies to admin */
  replyToDriverMessage: DriverMessage;
  resendEmailVerification: SignupStepResponse;
  /** Business owner accepts or disputes a pending settlement request. */
  respondToSettlementRequest: SettlementRequest;
  runSettlementScenarioHarness: SettlementScenarioHarnessResult;
  /** Admin sends a message to a business user */
  sendBusinessMessage: BusinessMessage;
  sendCampaign: NotificationCampaign;
  /** Admin sends a message to a driver */
  sendDriverMessage: DriverMessage;
  sendPushNotification: SendNotificationResult;
  setBusinessSchedule: Array<BusinessDayHours>;
  setDefaultAddress: Scalars['Boolean']['output'];
  setDeliveryPricingTiers: Array<DeliveryPricingTier>;
  setMyPreferredLanguage: User;
  setOrderAdminNote: Order;
  setUserPermissions: User;
  /** Settle all unsettled settlements for a business. Supports partial payment. */
  settleWithBusiness: SettleResult;
  /** Settle all unsettled settlements for a driver (always full). */
  settleWithDriver: SettleResult;
  startPreparing: Order;
  submitPhoneNumber: SignupStepResponse;
  trackPushTelemetry: Scalars['Boolean']['output'];
  unregisterDeviceToken: Scalars['Boolean']['output'];
  unsettleSettlement: Settlement;
  updateBanner: Banner;
  updateBannerOrder: Banner;
  updateBusiness: Business;
  updateDeliveryPricingTier: DeliveryPricingTier;
  updateDeliveryZone: DeliveryZone;
  updateDriverLocation: User;
  updateDriverOnlineStatus: User;
  updateOption: Option;
  updateOptionGroup: OptionGroup;
  updateOrderStatus: Order;
  updatePreparationTime: Order;
  updateProduct: Product;
  updateProductCategoriesOrder: Scalars['Boolean']['output'];
  updateProductCategory: ProductCategory;
  updateProductSubcategory: ProductSubcategory;
  updateProductsOrder: Scalars['Boolean']['output'];
  updatePromotion: Promotion;
  updateSettlementRule: SettlementRule;
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


export type MutationAdminCancelOrderArgs = {
  id: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
  settleBusiness?: InputMaybe<Scalars['Boolean']['input']>;
  settleDriver?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationAdminSendPttSignalArgs = {
  action: DriverPttSignalAction;
  channelName: Scalars['String']['input'];
  driverIds: Array<Scalars['ID']['input']>;
  muted?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationAdminSetDriverConnectionStatusArgs = {
  driverId: Scalars['ID']['input'];
  status: DriverConnectionStatus;
};


export type MutationAdminSetShiftDriversArgs = {
  driverIds: Array<Scalars['ID']['input']>;
};


export type MutationAdminSimulateDriverHeartbeatArgs = {
  activeOrderId?: InputMaybe<Scalars['ID']['input']>;
  driverId: Scalars['ID']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  navigationPhase?: InputMaybe<Scalars['String']['input']>;
  remainingEtaSeconds?: InputMaybe<Scalars['Int']['input']>;
  setOnline?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationAdminUpdateDriverLocationArgs = {
  driverId: Scalars['ID']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};


export type MutationAdminUpdateDriverSettingsArgs = {
  commissionPercentage?: InputMaybe<Scalars['Float']['input']>;
  driverId: Scalars['ID']['input'];
  hasOwnVehicle?: InputMaybe<Scalars['Boolean']['input']>;
  maxActiveOrders?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationApproveOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAssignDriverToOrderArgs = {
  driverId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationAssignPromotionToUsersArgs = {
  input: AssignPromotionToUserInput;
};


export type MutationBusinessDeviceHeartbeatArgs = {
  input: BusinessDeviceHeartbeatInput;
};


export type MutationBusinessDeviceOrderSignalArgs = {
  deviceId: Scalars['String']['input'];
  orderId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationCancelOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelSettlementRequestArgs = {
  requestId: Scalars['ID']['input'];
};


export type MutationChangeMyPasswordArgs = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};


export type MutationCreateBannerArgs = {
  input: CreateBannerInput;
};


export type MutationCreateBusinessArgs = {
  input: CreateBusinessInput;
};


export type MutationCreateBusinessWithOwnerArgs = {
  input: CreateBusinessWithOwnerInput;
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


export type MutationCreateOptionArgs = {
  input: CreateOptionInput;
  optionGroupId: Scalars['ID']['input'];
};


export type MutationCreateOptionGroupArgs = {
  input: CreateOptionGroupInput;
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


export type MutationCreateProductVariantGroupArgs = {
  input: CreateProductVariantGroupInput;
};


export type MutationCreatePromotionArgs = {
  input: CreatePromotionInput;
};


export type MutationCreateSettlementRequestArgs = {
  amount: Scalars['Float']['input'];
  businessId: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  periodEnd: Scalars['Date']['input'];
  periodStart: Scalars['Date']['input'];
};


export type MutationCreateSettlementRuleArgs = {
  input: CreateSettlementRuleInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
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


export type MutationDeleteOptionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteOptionGroupArgs = {
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


export type MutationDeleteProductVariantGroupArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePromotionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSettlementRuleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserAddressArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDriverHeartbeatArgs = {
  activeOrderId?: InputMaybe<Scalars['ID']['input']>;
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  navigationPhase?: InputMaybe<Scalars['String']['input']>;
  remainingEtaSeconds?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationDriverLoginArgs = {
  input: DriverLoginInput;
};


export type MutationDriverNotifyCustomerArgs = {
  kind: DriverCustomerNotificationKind;
  orderId: Scalars['ID']['input'];
};


export type MutationDriverRegisterArgs = {
  input: DriverRegisterInput;
};


export type MutationDriverUpdateBatteryStatusArgs = {
  isCharging?: InputMaybe<Scalars['Boolean']['input']>;
  level: Scalars['Int']['input'];
  optIn: Scalars['Boolean']['input'];
};


export type MutationGrantFreeDeliveryArgs = {
  orderId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationInitiateSignupArgs = {
  input: InitiateSignupInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationLogoutCurrentSessionArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationMarkBusinessMessagesReadArgs = {
  otherUserId: Scalars['ID']['input'];
};


export type MutationMarkDriverMessagesReadArgs = {
  otherUserId: Scalars['ID']['input'];
};


export type MutationMarkFirstOrderUsedArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationMarkSettlementAsPaidArgs = {
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  paymentReference?: InputMaybe<Scalars['String']['input']>;
  settlementId: Scalars['ID']['input'];
};


export type MutationMarkSettlementAsPartiallyPaidArgs = {
  amount: Scalars['Float']['input'];
  settlementId: Scalars['ID']['input'];
};


export type MutationMarkSettlementsAsPaidArgs = {
  ids: Array<Scalars['ID']['input']>;
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  paymentReference?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRefreshTokenArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationRegisterDeviceTokenArgs = {
  input: RegisterDeviceTokenInput;
};


export type MutationRegisterLiveActivityTokenArgs = {
  activityId: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
  token: Scalars['String']['input'];
};


export type MutationRemoveUserFromPromotionArgs = {
  promotionId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationReplyToBusinessMessageArgs = {
  adminId: Scalars['ID']['input'];
  body: Scalars['String']['input'];
};


export type MutationReplyToDriverMessageArgs = {
  adminId: Scalars['ID']['input'];
  body: Scalars['String']['input'];
};


export type MutationRespondToSettlementRequestArgs = {
  action: SettlementRequestAction;
  disputeReason?: InputMaybe<Scalars['String']['input']>;
  requestId: Scalars['ID']['input'];
};


export type MutationRunSettlementScenarioHarnessArgs = {
  scenarioIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationSendBusinessMessageArgs = {
  alertType: MessageAlertType;
  body: Scalars['String']['input'];
  businessUserId: Scalars['ID']['input'];
};


export type MutationSendCampaignArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSendDriverMessageArgs = {
  alertType: MessageAlertType;
  body: Scalars['String']['input'];
  driverId: Scalars['ID']['input'];
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


export type MutationSetMyPreferredLanguageArgs = {
  language: AppLanguage;
};


export type MutationSetOrderAdminNoteArgs = {
  id: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSetUserPermissionsArgs = {
  permissions: Array<UserPermission>;
  userId: Scalars['ID']['input'];
};


export type MutationSettleWithBusinessArgs = {
  amount: Scalars['Float']['input'];
  businessId: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  paymentReference?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSettleWithDriverArgs = {
  driverId: Scalars['ID']['input'];
};


export type MutationStartPreparingArgs = {
  id: Scalars['ID']['input'];
  preparationMinutes: Scalars['Int']['input'];
};


export type MutationSubmitPhoneNumberArgs = {
  input: SubmitPhoneNumberInput;
};


export type MutationTrackPushTelemetryArgs = {
  input: TrackPushTelemetryInput;
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


export type MutationUpdateOptionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOptionInput;
};


export type MutationUpdateOptionGroupArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOptionGroupInput;
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


export type MutationUpdateProductCategoriesOrderArgs = {
  businessId: Scalars['ID']['input'];
  categories: Array<ProductCategoryOrderInput>;
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


export type MutationUpdateSettlementRuleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSettlementRuleInput;
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
  bodyAl?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  failedCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  query?: Maybe<Scalars['JSON']['output']>;
  relevanceScore?: Maybe<Scalars['Float']['output']>;
  sender?: Maybe<User>;
  sentAt?: Maybe<Scalars['DateTime']['output']>;
  sentBy?: Maybe<Scalars['ID']['output']>;
  sentCount: Scalars['Int']['output'];
  status: CampaignStatus;
  targetCount: Scalars['Int']['output'];
  timeSensitive: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
  titleAl?: Maybe<Scalars['String']['output']>;
};

export enum NotificationType {
  AdminAlert = 'ADMIN_ALERT',
  OrderAssigned = 'ORDER_ASSIGNED',
  OrderStatus = 'ORDER_STATUS',
  Promotional = 'PROMOTIONAL'
}

export type OperationalKpIs = {
  __typename?: 'OperationalKPIs';
  aov: Scalars['Float']['output'];
  avgDeliveryTimeMin?: Maybe<Scalars['Float']['output']>;
  avgDriverWaitAtPickupMin?: Maybe<Scalars['Float']['output']>;
  avgPrepTimeMin?: Maybe<Scalars['Float']['output']>;
  cancellationRate: Scalars['Float']['output'];
  cancelledOrders: Scalars['Int']['output'];
  completedOrders: Scalars['Int']['output'];
  dailyVolume: Array<DayVolume>;
  fakeReadyRate?: Maybe<Scalars['Float']['output']>;
  gmv: Scalars['Float']['output'];
  prepOverrunRate?: Maybe<Scalars['Float']['output']>;
  totalOrders: Scalars['Int']['output'];
};

export type Option = {
  __typename?: 'Option';
  displayOrder: Scalars['Int']['output'];
  extraPrice: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  linkedProduct?: Maybe<Product>;
  linkedProductId?: Maybe<Scalars['ID']['output']>;
  name: Scalars['String']['output'];
  optionGroupId: Scalars['ID']['output'];
};

export type OptionGroup = {
  __typename?: 'OptionGroup';
  displayOrder: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  maxSelections: Scalars['Int']['output'];
  minSelections: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  options: Array<Option>;
  productId: Scalars['ID']['output'];
};

export type Order = {
  __typename?: 'Order';
  adminNote?: Maybe<Scalars['String']['output']>;
  businessId: Scalars['ID']['output'];
  businesses: Array<OrderBusiness>;
  cancellationReason?: Maybe<Scalars['String']['output']>;
  cancelledAt?: Maybe<Scalars['Date']['output']>;
  deliveredAt?: Maybe<Scalars['Date']['output']>;
  deliveryPrice: Scalars['Float']['output'];
  displayId: Scalars['String']['output'];
  driver?: Maybe<User>;
  driverArrivedAtPickup?: Maybe<Scalars['Date']['output']>;
  driverAssignedAt?: Maybe<Scalars['Date']['output']>;
  driverNotes?: Maybe<Scalars['String']['output']>;
  dropOffLocation: Location;
  estimatedReadyAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  locationFlagged: Scalars['Boolean']['output'];
  needsApproval: Scalars['Boolean']['output'];
  orderDate: Scalars['Date']['output'];
  orderPrice: Scalars['Float']['output'];
  orderPromotions?: Maybe<Array<OrderPromotion>>;
  originalPrice?: Maybe<Scalars['Float']['output']>;
  outForDeliveryAt?: Maybe<Scalars['Date']['output']>;
  paymentCollection: OrderPaymentCollection;
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

export type OrderDriverLiveTracking = {
  __typename?: 'OrderDriverLiveTracking';
  driverId: Scalars['ID']['output'];
  etaUpdatedAt: Scalars['Date']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  navigationPhase?: Maybe<Scalars['String']['output']>;
  orderId: Scalars['ID']['output'];
  remainingEtaSeconds?: Maybe<Scalars['Int']['output']>;
};

export type OrderItem = {
  __typename?: 'OrderItem';
  childItems: Array<OrderItem>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  parentOrderItemId?: Maybe<Scalars['ID']['output']>;
  productId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
  selectedOptions: Array<OrderItemOption>;
  unitPrice: Scalars['Float']['output'];
};

export type OrderItemOption = {
  __typename?: 'OrderItemOption';
  id: Scalars['ID']['output'];
  optionGroupId: Scalars['ID']['output'];
  optionGroupName: Scalars['String']['output'];
  optionId: Scalars['ID']['output'];
  optionName: Scalars['String']['output'];
  priceAtOrder: Scalars['Float']['output'];
};

export enum OrderPaymentCollection {
  CashToDriver = 'CASH_TO_DRIVER',
  PrepaidToPlatform = 'PREPAID_TO_PLATFORM'
}

export type OrderPromotion = {
  __typename?: 'OrderPromotion';
  appliesTo: PromotionAppliesTo;
  discountAmount: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  promoCode?: Maybe<Scalars['String']['output']>;
  promotionId: Scalars['ID']['output'];
};

export enum OrderStatus {
  AwaitingApproval = 'AWAITING_APPROVAL',
  Cancelled = 'CANCELLED',
  Delivered = 'DELIVERED',
  OutForDelivery = 'OUT_FOR_DELIVERY',
  Pending = 'PENDING',
  Preparing = 'PREPARING',
  Ready = 'READY'
}

export type PeakHourAnalysis = {
  __typename?: 'PeakHourAnalysis';
  byDayOfWeek: Array<DayOfWeekDistribution>;
  hourly: Array<HourlyDistribution>;
  peakDow: Scalars['Int']['output'];
  peakHour: Scalars['Int']['output'];
};

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
  isOffer: Scalars['Boolean']['output'];
  isOnSale: Scalars['Boolean']['output'];
  markupPrice?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  nightMarkedupPrice?: Maybe<Scalars['Float']['output']>;
  optionGroups: Array<OptionGroup>;
  price: Scalars['Float']['output'];
  salePrice?: Maybe<Scalars['Float']['output']>;
  sortOrder: Scalars['Int']['output'];
  subcategoryId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['String']['output'];
  variantGroup?: Maybe<ProductVariantGroup>;
  variantGroupId?: Maybe<Scalars['ID']['output']>;
  variants: Array<Product>;
};

export type ProductCard = {
  __typename?: 'ProductCard';
  basePrice: Scalars['Float']['output'];
  hasOptionGroups: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isOffer: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  product?: Maybe<Product>;
  variants: Array<Product>;
};

export type ProductCategory = {
  __typename?: 'ProductCategory';
  businessId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  sortOrder: Scalars['Int']['output'];
  updatedAt: Scalars['String']['output'];
};

export type ProductCategoryOrderInput = {
  id: Scalars['ID']['input'];
  sortOrder: Scalars['Int']['input'];
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

export type ProductVariantGroup = {
  __typename?: 'ProductVariantGroup';
  businessId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type Promotion = {
  __typename?: 'Promotion';
  assignedUsers?: Maybe<Array<UserPromotion>>;
  code?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  creatorId?: Maybe<Scalars['ID']['output']>;
  creatorType: Scalars['String']['output'];
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
  SpendXFixed = 'SPEND_X_FIXED',
  SpendXGetFree = 'SPEND_X_GET_FREE',
  SpendXPercent = 'SPEND_X_PERCENT'
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

export type PushTelemetryEvent = {
  __typename?: 'PushTelemetryEvent';
  actionId?: Maybe<Scalars['String']['output']>;
  appType: DeviceAppType;
  campaignId?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deviceId?: Maybe<Scalars['String']['output']>;
  eventType: PushTelemetryEventType;
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  notificationBody?: Maybe<Scalars['String']['output']>;
  notificationTitle?: Maybe<Scalars['String']['output']>;
  orderId?: Maybe<Scalars['ID']['output']>;
  platform: DevicePlatform;
  token?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
};

export enum PushTelemetryEventType {
  ActionTapped = 'ACTION_TAPPED',
  Opened = 'OPENED',
  Received = 'RECEIVED',
  TokenRefreshed = 'TOKEN_REFRESHED',
  TokenRegistered = 'TOKEN_REGISTERED',
  TokenUnregistered = 'TOKEN_UNREGISTERED'
}

export type PushTelemetrySummary = {
  __typename?: 'PushTelemetrySummary';
  byAppType: Array<TelemetryCount>;
  byEvent: Array<TelemetryCount>;
  byPlatform: Array<TelemetryCount>;
  totalEvents: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  auditLog?: Maybe<AuditLog>;
  auditLogs: AuditLogConnection;
  business?: Maybe<Business>;
  businessBalance: SettlementSummary;
  businessDeviceHealth: Array<BusinessDeviceHealth>;
  businessKPIs: Array<BusinessKpi>;
  /** Admin: list of all business user threads with unread counts */
  businessMessageThreads: Array<BusinessMessageThread>;
  /** Admin: full conversation with a specific business user */
  businessMessages: Array<BusinessMessage>;
  businesses: Array<Business>;
  calculateDeliveryPrice: DeliveryPriceResult;
  cancelledOrders: Array<Order>;
  deliveryPricingConfig: DeliveryPricingConfig;
  deliveryPricingTiers: Array<DeliveryPricingTier>;
  deliveryZones: Array<DeliveryZone>;
  deviceTokens: Array<DeviceToken>;
  driverBalance: SettlementSummary;
  driverKPIs: Array<DriverKpi>;
  /** Admin: list of all driver threads with unread counts */
  driverMessageThreads: Array<DriverMessageThread>;
  /** Admin: full conversation with a specific driver */
  driverMessages: Array<DriverMessage>;
  drivers: Array<User>;
  getActiveGlobalPromotions: Array<Promotion>;
  /** Get Agora RTC credentials for the current authenticated user */
  getAgoraRtcCredentials: AgoraRtcCredentials;
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
  me?: Maybe<User>;
  myAddresses: Array<UserAddress>;
  myBehavior?: Maybe<UserBehavior>;
  /** Business user: my messages */
  myBusinessMessages: Array<BusinessMessage>;
  /** Driver: my messages */
  myDriverMessages: Array<DriverMessage>;
  /** Get live metrics for the authenticated driver */
  myDriverMetrics: DriverDailyMetrics;
  myReferralStats: ReferralStats;
  notificationCampaign?: Maybe<NotificationCampaign>;
  notificationCampaigns: Array<NotificationCampaign>;
  offers: Array<Product>;
  operationalKPIs: OperationalKpIs;
  order?: Maybe<Order>;
  orders: Array<Order>;
  ordersByStatus: Array<Order>;
  peakHourAnalysis: PeakHourAnalysis;
  previewCampaignAudience: AudiencePreview;
  product?: Maybe<Product>;
  productCategories: Array<ProductCategory>;
  productCategory?: Maybe<ProductCategory>;
  productSubcategories: Array<ProductSubcategory>;
  productSubcategoriesByBusiness: Array<ProductSubcategory>;
  products: Array<ProductCard>;
  pushTelemetryEvents: Array<PushTelemetryEvent>;
  pushTelemetrySummary: PushTelemetrySummary;
  settlementPayment?: Maybe<SettlementPayment>;
  settlementPayments: Array<SettlementPayment>;
  settlementRequests: Array<SettlementRequest>;
  settlementRule?: Maybe<SettlementRule>;
  settlementRules: Array<SettlementRule>;
  settlementScenarioDefinitions: Array<SettlementScenarioDefinition>;
  settlementSummary: SettlementSummary;
  settlements: Array<Settlement>;
  uncompletedOrders: Array<Order>;
  unsettledBalance: Scalars['Float']['output'];
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


export type QueryBusinessDeviceHealthArgs = {
  hours?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBusinessKpIsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};


export type QueryBusinessMessagesArgs = {
  businessUserId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCalculateDeliveryPriceArgs = {
  businessId: Scalars['ID']['input'];
  dropoffLat: Scalars['Float']['input'];
  dropoffLng: Scalars['Float']['input'];
};


export type QueryCancelledOrdersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDeviceTokensArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryDriverBalanceArgs = {
  driverId: Scalars['ID']['input'];
};


export type QueryDriverKpIsArgs = {
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};


export type QueryDriverMessagesArgs = {
  driverId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetAgoraRtcCredentialsArgs = {
  channelName: Scalars['String']['input'];
  role: AgoraRtcRole;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  promotionId: Scalars['ID']['input'];
};


export type QueryGetStoreStatusArgs = {
  url?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetUserPromoMetadataArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryGetUserPromotionsArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryMyBusinessMessagesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyDriverMessagesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNotificationCampaignArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOffersArgs = {
  businessId: Scalars['ID']['input'];
};


export type QueryOperationalKpIsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};


export type QueryOrderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOrdersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOrdersByStatusArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status: OrderStatus;
};


export type QueryPeakHourAnalysisArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
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


export type QueryPushTelemetryEventsArgs = {
  appType?: InputMaybe<DeviceAppType>;
  eventType?: InputMaybe<PushTelemetryEventType>;
  hours?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  platform?: InputMaybe<DevicePlatform>;
};


export type QueryPushTelemetrySummaryArgs = {
  hours?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySettlementPaymentArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySettlementPaymentsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  entityType?: InputMaybe<SettlementType>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
};


export type QuerySettlementRequestsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<SettlementRequestStatus>;
};


export type QuerySettlementRuleArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySettlementRulesArgs = {
  filter?: InputMaybe<SettlementRuleFilterInput>;
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
  direction?: InputMaybe<SettlementDirection>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  isSettled?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  status?: InputMaybe<SettlementStatus>;
  type?: InputMaybe<SettlementType>;
};


export type QueryUnsettledBalanceArgs = {
  entityId: Scalars['ID']['input'];
  entityType: SettlementType;
};


export type QueryUserBehaviorArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
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
  bodyAl?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  data?: InputMaybe<Scalars['JSON']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  relevanceScore?: InputMaybe<Scalars['Float']['input']>;
  timeSensitive?: InputMaybe<Scalars['Boolean']['input']>;
  title: Scalars['String']['input'];
  titleAl?: InputMaybe<Scalars['String']['input']>;
  userIds: Array<Scalars['ID']['input']>;
};

export type SetDeliveryPricingTiersInput = {
  tiers: Array<CreateDeliveryPricingTierInput>;
};

export type SettleResult = {
  __typename?: 'SettleResult';
  direction: SettlementPaymentDirection;
  netAmount: Scalars['Float']['output'];
  payment: SettlementPayment;
  remainderAmount: Scalars['Float']['output'];
  remainderSettlement?: Maybe<Settlement>;
  settledCount: Scalars['Int']['output'];
};

export type Settlement = {
  __typename?: 'Settlement';
  amount: Scalars['Float']['output'];
  business?: Maybe<Business>;
  createdAt: Scalars['Date']['output'];
  currency: Scalars['String']['output'];
  direction: SettlementDirection;
  driver?: Maybe<User>;
  id: Scalars['ID']['output'];
  isSettled: Scalars['Boolean']['output'];
  order?: Maybe<Order>;
  paidAt?: Maybe<Scalars['Date']['output']>;
  paymentMethod?: Maybe<Scalars['String']['output']>;
  paymentReference?: Maybe<Scalars['String']['output']>;
  ruleId?: Maybe<Scalars['ID']['output']>;
  settlementPayment?: Maybe<SettlementPayment>;
  sourcePayment?: Maybe<SettlementPayment>;
  status: SettlementStatus;
  type: SettlementType;
  updatedAt: Scalars['Date']['output'];
};

export enum SettlementAmountType {
  Fixed = 'FIXED',
  Percent = 'PERCENT'
}

export enum SettlementDirection {
  Payable = 'PAYABLE',
  Receivable = 'RECEIVABLE'
}

export enum SettlementEntityType {
  Business = 'BUSINESS',
  Driver = 'DRIVER'
}

export type SettlementPayment = {
  __typename?: 'SettlementPayment';
  amount: Scalars['Float']['output'];
  business?: Maybe<Business>;
  createdAt: Scalars['Date']['output'];
  createdBy?: Maybe<User>;
  direction?: Maybe<SettlementPaymentDirection>;
  driver?: Maybe<User>;
  entityType: SettlementType;
  id: Scalars['ID']['output'];
  note?: Maybe<Scalars['String']['output']>;
  paymentMethod?: Maybe<Scalars['String']['output']>;
  paymentReference?: Maybe<Scalars['String']['output']>;
  totalBalanceAtTime?: Maybe<Scalars['Float']['output']>;
};

export enum SettlementPaymentDirection {
  EntityToPlatform = 'ENTITY_TO_PLATFORM',
  PlatformToEntity = 'PLATFORM_TO_ENTITY'
}

export type SettlementRequest = {
  __typename?: 'SettlementRequest';
  amount: Scalars['Float']['output'];
  business: Business;
  createdAt: Scalars['Date']['output'];
  currency: Scalars['String']['output'];
  disputeReason?: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  note?: Maybe<Scalars['String']['output']>;
  periodEnd: Scalars['Date']['output'];
  periodStart: Scalars['Date']['output'];
  requestedBy?: Maybe<User>;
  respondedAt?: Maybe<Scalars['Date']['output']>;
  respondedBy?: Maybe<User>;
  status: SettlementRequestStatus;
  updatedAt: Scalars['Date']['output'];
};

export enum SettlementRequestAction {
  Accept = 'ACCEPT',
  Dispute = 'DISPUTE'
}

export enum SettlementRequestStatus {
  Accepted = 'ACCEPTED',
  Cancelled = 'CANCELLED',
  Disputed = 'DISPUTED',
  Expired = 'EXPIRED',
  PendingApproval = 'PENDING_APPROVAL'
}

export type SettlementRule = {
  __typename?: 'SettlementRule';
  amount: Scalars['Float']['output'];
  amountType: SettlementAmountType;
  appliesTo?: Maybe<Scalars['String']['output']>;
  business?: Maybe<Business>;
  createdAt: Scalars['String']['output'];
  direction: SettlementDirection;
  entityType: SettlementEntityType;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  promotion?: Maybe<Promotion>;
  type: SettlementRuleType;
  updatedAt: Scalars['String']['output'];
};

export type SettlementRuleFilterInput = {
  businessIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  entityTypes?: InputMaybe<Array<SettlementEntityType>>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  promotionIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  scopes?: InputMaybe<Array<SettlementRuleScope>>;
  type?: InputMaybe<SettlementRuleType>;
};

export enum SettlementRuleScope {
  Business = 'BUSINESS',
  BusinessPromotion = 'BUSINESS_PROMOTION',
  Global = 'GLOBAL',
  Promotion = 'PROMOTION'
}

export enum SettlementRuleType {
  DeliveryPrice = 'DELIVERY_PRICE',
  OrderPrice = 'ORDER_PRICE'
}

export type SettlementScenarioDefinition = {
  __typename?: 'SettlementScenarioDefinition';
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type SettlementScenarioHarnessResult = {
  __typename?: 'SettlementScenarioHarnessResult';
  failedCount: Scalars['Int']['output'];
  passed: Scalars['Boolean']['output'];
  passedCount: Scalars['Int']['output'];
  results: Array<SettlementScenarioResult>;
  total: Scalars['Int']['output'];
};

export type SettlementScenarioResult = {
  __typename?: 'SettlementScenarioResult';
  actualCount: Scalars['Int']['output'];
  actualSettlements: Scalars['JSON']['output'];
  expectedCount: Scalars['Int']['output'];
  expectedSettlements: Scalars['JSON']['output'];
  mismatches: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  passed: Scalars['Boolean']['output'];
  scenarioId: Scalars['String']['output'];
};

export enum SettlementStatus {
  Cancelled = 'CANCELLED',
  Disputed = 'DISPUTED',
  Overdue = 'OVERDUE',
  Paid = 'PAID',
  Pending = 'PENDING'
}

export type SettlementSummary = {
  __typename?: 'SettlementSummary';
  count: Scalars['Int']['output'];
  pendingCount: Scalars['Int']['output'];
  totalAmount: Scalars['Float']['output'];
  totalPaid: Scalars['Float']['output'];
  totalPayable: Scalars['Float']['output'];
  totalPending: Scalars['Float']['output'];
  totalReceivable: Scalars['Float']['output'];
};

export enum SettlementType {
  Business = 'BUSINESS',
  Driver = 'DRIVER'
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
  dispatchModeEnabled: Scalars['Boolean']['output'];
  isStoreClosed: Scalars['Boolean']['output'];
};

export type SubmitPhoneNumberInput = {
  phoneNumber: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Admin receives replies from a specific business user in real-time */
  adminBusinessMessageReceived: BusinessMessage;
  /** Admin receives replies from a specific driver in real-time */
  adminMessageReceived: DriverMessage;
  allOrdersUpdated: Array<Order>;
  auditLogCreated: AuditLog;
  /** Business user receives messages from admin in real-time */
  businessMessageReceived: BusinessMessage;
  driverConnectionStatusChanged: DriverConnection;
  /** Driver receives messages from admin in real-time */
  driverMessageReceived: DriverMessage;
  /** Per-driver push-to-talk signal stream (start/stop/mute/unmute) */
  driverPttSignal: DriverPttSignal;
  driversUpdated: Array<User>;
  orderDriverLiveTracking: OrderDriverLiveTracking;
  orderStatusUpdated: Order;
  settlementCreated: Settlement;
  settlementStatusChanged: Settlement;
  storeStatusUpdated: StoreStatus;
  userOrdersUpdated: Array<Order>;
};


export type SubscriptionAdminBusinessMessageReceivedArgs = {
  businessUserId: Scalars['ID']['input'];
};


export type SubscriptionAdminMessageReceivedArgs = {
  driverId: Scalars['ID']['input'];
};


export type SubscriptionAuditLogCreatedArgs = {
  action?: InputMaybe<ActionType>;
  actorType?: InputMaybe<ActorType>;
  entityType?: InputMaybe<EntityType>;
};


export type SubscriptionDriverConnectionStatusChangedArgs = {
  driverId: Scalars['ID']['input'];
};


export type SubscriptionDriverPttSignalArgs = {
  driverId: Scalars['ID']['input'];
};


export type SubscriptionOrderDriverLiveTrackingArgs = {
  input?: InputMaybe<SubscriptionInput>;
  orderId: Scalars['ID']['input'];
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
  input?: InputMaybe<SubscriptionInput>;
};

export type SubscriptionInput = {
  token?: InputMaybe<Scalars['String']['input']>;
};

export type TelemetryCount = {
  __typename?: 'TelemetryCount';
  count: Scalars['Int']['output'];
  key: Scalars['String']['output'];
};

export type TokenRefreshResponse = {
  __typename?: 'TokenRefreshResponse';
  refreshToken: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type TrackPushTelemetryInput = {
  actionId?: InputMaybe<Scalars['String']['input']>;
  appType: DeviceAppType;
  campaignId?: InputMaybe<Scalars['ID']['input']>;
  deviceId?: InputMaybe<Scalars['String']['input']>;
  eventType: PushTelemetryEventType;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  notificationBody?: InputMaybe<Scalars['String']['input']>;
  notificationTitle?: InputMaybe<Scalars['String']['input']>;
  orderId?: InputMaybe<Scalars['ID']['input']>;
  platform: DevicePlatform;
  token?: InputMaybe<Scalars['String']['input']>;
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
  isTemporarilyClosed?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<LocationInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  prepTimeOverrideMinutes?: InputMaybe<Scalars['Int']['input']>;
  temporaryClosureReason?: InputMaybe<Scalars['String']['input']>;
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
  isServiceZone?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  polygon?: InputMaybe<Array<PolygonPointInput>>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateOptionGroupInput = {
  displayOrder?: InputMaybe<Scalars['Int']['input']>;
  maxSelections?: InputMaybe<Scalars['Int']['input']>;
  minSelections?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOptionInput = {
  displayOrder?: InputMaybe<Scalars['Int']['input']>;
  extraPrice?: InputMaybe<Scalars['Float']['input']>;
  linkedProductId?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProductCategoryInput = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateProductInput = {
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  isOnSale?: InputMaybe<Scalars['Boolean']['input']>;
  markupPrice?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  nightMarkedupPrice?: InputMaybe<Scalars['Float']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  salePrice?: InputMaybe<Scalars['Float']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  subcategoryId?: InputMaybe<Scalars['ID']['input']>;
  variantGroupId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateProductSubcategoryInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePromotionInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  creatorId?: InputMaybe<Scalars['ID']['input']>;
  creatorType?: InputMaybe<Scalars['String']['input']>;
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

export type UpdateSettlementRuleInput = {
  amount?: InputMaybe<Scalars['Float']['input']>;
  amountType?: InputMaybe<SettlementAmountType>;
  appliesTo?: InputMaybe<Scalars['String']['input']>;
  direction?: InputMaybe<SettlementDirection>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<SettlementRuleType>;
};

export type UpdateStoreStatusInput = {
  bannerEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  bannerMessage?: InputMaybe<Scalars['String']['input']>;
  bannerType?: InputMaybe<BannerType>;
  closedMessage?: InputMaybe<Scalars['String']['input']>;
  dispatchModeEnabled?: InputMaybe<Scalars['Boolean']['input']>;
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
  hasOwnVehicle?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isOnline: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  maxActiveOrders?: Maybe<Scalars['Int']['output']>;
  permissions: Array<UserPermission>;
  phoneNumber?: Maybe<Scalars['String']['output']>;
  phoneVerified: Scalars['Boolean']['output'];
  preferredLanguage: AppLanguage;
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

export type AdminGetBusinessesQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminGetBusinessesQuery = { __typename?: 'Query', businesses: Array<{ __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, createdAt: any, updatedAt: any, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string }, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> }> };

export type AdminGetBusinessQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type AdminGetBusinessQuery = { __typename?: 'Query', business?: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, createdAt: any, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string }, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> } | null };

export type AdminGetDriversQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminGetDriversQuery = { __typename?: 'Query', drivers: Array<{ __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, imageUrl?: string | null, phoneNumber?: string | null, commissionPercentage?: number | null, maxActiveOrders?: number | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null, driverConnection?: { __typename?: 'DriverConnection', onlinePreference: boolean, connectionStatus: DriverConnectionStatus, lastHeartbeatAt?: any | null, lastLocationUpdate?: any | null, disconnectedAt?: any | null } | null }> };

export type AdminUpdateDriverSettingsMutationVariables = Exact<{
  driverId: Scalars['ID']['input'];
  commissionPercentage?: InputMaybe<Scalars['Float']['input']>;
  maxActiveOrders?: InputMaybe<Scalars['Int']['input']>;
}>;


export type AdminUpdateDriverSettingsMutation = { __typename?: 'Mutation', adminUpdateDriverSettings: { __typename?: 'User', id: string, commissionPercentage?: number | null, maxActiveOrders?: number | null } };

export type AdminSetDriverOnlineStatusMutationVariables = Exact<{
  isOnline: Scalars['Boolean']['input'];
}>;


export type AdminSetDriverOnlineStatusMutation = { __typename?: 'Mutation', updateDriverOnlineStatus: { __typename?: 'User', id: string, isOnline: boolean, firstName: string, lastName: string } };

export type AdminDriversUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type AdminDriversUpdatedSubscription = { __typename?: 'Subscription', driversUpdated: Array<{ __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, imageUrl?: string | null, phoneNumber?: string | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null, driverConnection?: { __typename?: 'DriverConnection', onlinePreference: boolean, connectionStatus: DriverConnectionStatus, lastHeartbeatAt?: any | null, lastLocationUpdate?: any | null, disconnectedAt?: any | null } | null }> };

export type AdminGetStoreStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminGetStoreStatusQuery = { __typename?: 'Query', getStoreStatus: { __typename?: 'StoreStatus', isStoreClosed: boolean, closedMessage?: string | null } };

export type AdminUpdateStoreStatusMutationVariables = Exact<{
  input: UpdateStoreStatusInput;
}>;


export type AdminUpdateStoreStatusMutation = { __typename?: 'Mutation', updateStoreStatus: { __typename?: 'StoreStatus', isStoreClosed: boolean, closedMessage?: string | null } };

export type AdminGetNotificationCampaignsQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminGetNotificationCampaignsQuery = { __typename?: 'Query', notificationCampaigns: Array<{ __typename?: 'NotificationCampaign', id: string, title: string, body: string, targetCount: number, sentCount: number, failedCount: number, status: CampaignStatus, createdAt: any, sentAt?: any | null }> };

export type AdminSendCampaignMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type AdminSendCampaignMutation = { __typename?: 'Mutation', sendCampaign: { __typename?: 'NotificationCampaign', id: string, status: CampaignStatus, sentCount: number, failedCount: number, sentAt?: any | null } };

export type AdminCreateCampaignMutationVariables = Exact<{
  input: CreateCampaignInput;
}>;


export type AdminCreateCampaignMutation = { __typename?: 'Mutation', createCampaign: { __typename?: 'NotificationCampaign', id: string, title: string, body: string, status: CampaignStatus } };

export type AdminGetOrdersQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminGetOrdersQuery = { __typename?: 'Query', orders: Array<{ __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, phoneNumber?: string | null } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number }> }> }> };

export type AdminGetOrderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type AdminGetOrderQuery = { __typename?: 'Query', order?: { __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, phoneNumber?: string | null } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number }> }> } | null };

export type AdminUpdateOrderStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: OrderStatus;
}>;


export type AdminUpdateOrderStatusMutation = { __typename?: 'Mutation', updateOrderStatus: { __typename?: 'Order', id: string, status: OrderStatus } };

export type AdminStartPreparingMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  preparationMinutes: Scalars['Int']['input'];
}>;


export type AdminStartPreparingMutation = { __typename?: 'Mutation', startPreparing: { __typename?: 'Order', id: string, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null } };

export type AdminUpdatePreparationTimeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  preparationMinutes: Scalars['Int']['input'];
}>;


export type AdminUpdatePreparationTimeMutation = { __typename?: 'Mutation', updatePreparationTime: { __typename?: 'Order', id: string, preparationMinutes?: number | null, estimatedReadyAt?: any | null } };

export type AdminCancelOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type AdminCancelOrderMutation = { __typename?: 'Mutation', cancelOrder: { __typename?: 'Order', id: string, status: OrderStatus } };

export type AdminAssignDriverToOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  driverId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type AdminAssignDriverToOrderMutation = { __typename?: 'Mutation', assignDriverToOrder: { __typename?: 'Order', id: string, status: OrderStatus, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string } | null } };

export type AdminAllOrdersUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type AdminAllOrdersUpdatedSubscription = { __typename?: 'Subscription', allOrdersUpdated: Array<{ __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, address?: string | null, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string, phoneNumber?: string | null } | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, phoneNumber?: string | null, businessType: BusinessType, location: { __typename?: 'Location', latitude: number, longitude: number, address: string } }, items: Array<{ __typename?: 'OrderItem', productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number }> }> }> };

export type AdminGetSettlementsQueryVariables = Exact<{
  type?: InputMaybe<SettlementType>;
  status?: InputMaybe<SettlementStatus>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type AdminGetSettlementsQuery = { __typename?: 'Query', settlements: Array<{ __typename?: 'Settlement', id: string, type: SettlementType, amount: number, status: SettlementStatus, paidAt?: any | null, createdAt: any, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string } | null, business?: { __typename?: 'Business', id: string, name: string } | null }> };

export type AdminMarkSettlementAsPaidMutationVariables = Exact<{
  settlementId: Scalars['ID']['input'];
}>;


export type AdminMarkSettlementAsPaidMutation = { __typename?: 'Mutation', markSettlementAsPaid: { __typename?: 'Settlement', id: string, status: SettlementStatus, paidAt?: any | null } };

export type AdminGetUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminGetUsersQuery = { __typename?: 'Query', users: Array<{ __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, phoneNumber?: string | null, address?: string | null, adminNote?: string | null, flagColor?: string | null, permissions: Array<UserPermission>, business?: { __typename?: 'Business', id: string, name: string } | null }> };

export type AdminUserBehaviorQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type AdminUserBehaviorQuery = { __typename?: 'Query', userBehavior?: { __typename?: 'UserBehavior', userId: string, totalOrders: number, deliveredOrders: number, cancelledOrders: number, totalSpend: number, avgOrderValue: number, firstOrderAt?: any | null, lastOrderAt?: any | null, lastDeliveredAt?: any | null } | null };

export type AdminUpdateUserNoteMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  flagColor?: InputMaybe<Scalars['String']['input']>;
}>;


export type AdminUpdateUserNoteMutation = { __typename?: 'Mutation', updateUserNote: { __typename?: 'User', id: string, adminNote?: string | null, flagColor?: string | null } };

export type DeleteMyAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteMyAccountMutation = { __typename?: 'Mutation', deleteMyAccount: boolean };

export type InitiateSignupMutationVariables = Exact<{
  input: InitiateSignupInput;
}>;


export type InitiateSignupMutation = { __typename?: 'Mutation', initiateSignup: { __typename?: 'AuthResponse', token: string, message: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, signupStep: SignupStep, emailVerified: boolean, phoneVerified: boolean, phoneNumber?: string | null, role: UserRole } } };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthResponse', token: string, refreshToken?: string | null, message: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, signupStep: SignupStep, emailVerified: boolean, phoneVerified: boolean, phoneNumber?: string | null, role: UserRole, preferredLanguage: AppLanguage } } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, signupStep: SignupStep, emailVerified: boolean, phoneVerified: boolean, phoneNumber?: string | null, address?: string | null, role: UserRole, preferredLanguage: AppLanguage } | null };

export type ResendEmailVerificationMutationVariables = Exact<{ [key: string]: never; }>;


export type ResendEmailVerificationMutation = { __typename?: 'Mutation', resendEmailVerification: { __typename?: 'SignupStepResponse', userId: string, currentStep: SignupStep, message: string } };

export type SetMyPreferredLanguageMutationVariables = Exact<{
  language: AppLanguage;
}>;


export type SetMyPreferredLanguageMutation = { __typename?: 'Mutation', setMyPreferredLanguage: { __typename?: 'User', id: string, preferredLanguage: AppLanguage } };

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


export type GetBusinessesQuery = { __typename?: 'Query', businesses: Array<{ __typename?: 'Business', id: string, name: string, description?: string | null, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, isTemporarilyClosed: boolean, temporaryClosureReason?: string | null, isOpen: boolean, createdAt: any, updatedAt: any, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string }, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }>, activePromotion?: { __typename?: 'BusinessPromotion', id: string, name: string, description?: string | null, type: PromotionType, discountValue?: number | null } | null }> };

export type GetBusinessQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetBusinessQuery = { __typename?: 'Query', business?: { __typename?: 'Business', id: string, name: string, description?: string | null, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, avgPrepTimeMinutes: number, prepTimeOverrideMinutes?: number | null, isTemporarilyClosed: boolean, temporaryClosureReason?: string | null, isOpen: boolean, createdAt: any, updatedAt: any, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string }, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> } | null };

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

export type RegisterLiveActivityTokenMutationVariables = Exact<{
  token: Scalars['String']['input'];
  activityId: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
}>;


export type RegisterLiveActivityTokenMutation = { __typename?: 'Mutation', registerLiveActivityToken: boolean };

export type TrackPushTelemetryMutationVariables = Exact<{
  input: TrackPushTelemetryInput;
}>;


export type TrackPushTelemetryMutation = { __typename?: 'Mutation', trackPushTelemetry: boolean };

export type CreateOrderMutationVariables = Exact<{
  input: CreateOrderInput;
}>;


export type CreateOrderMutation = { __typename?: 'Mutation', createOrder: { __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, businessType: BusinessType, isActive: boolean, isOpen: boolean, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, parentOrderItemId?: string | null, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }>, childItems: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }> }> }> }> } };

export type UpdateOrderStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: OrderStatus;
}>;


export type UpdateOrderStatusMutation = { __typename?: 'Mutation', updateOrderStatus: { __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, parentOrderItemId?: string | null, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }>, childItems: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }> }> }> }> } };

export type CancelOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelOrderMutation = { __typename?: 'Mutation', cancelOrder: { __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, status: OrderStatus, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, parentOrderItemId?: string | null, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }>, childItems: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }> }> }> }> } };

export type GetOrdersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetOrdersQuery = { __typename?: 'Query', orders: Array<{ __typename?: 'Order', id: string, displayId: string, userId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, parentOrderItemId?: string | null, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }>, childItems: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }> }> }> }> }> };

export type GetOrderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetOrderQuery = { __typename?: 'Query', order?: { __typename?: 'Order', id: string, displayId: string, userId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, readyAt?: any | null, outForDeliveryAt?: any | null, deliveredAt?: any | null, driverNotes?: string | null, originalPrice?: number | null, paymentCollection: OrderPaymentCollection, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, pickupLocations: Array<{ __typename?: 'Location', latitude: number, longitude: number, address: string }>, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, phoneNumber?: string | null, imageUrl?: string | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null, driverConnection?: { __typename?: 'DriverConnection', activeOrderId?: string | null, navigationPhase?: string | null, remainingEtaSeconds?: number | null, etaUpdatedAt?: any | null } | null } | null, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, createdAt: any, updatedAt: any, isOpen: boolean, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, parentOrderItemId?: string | null, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }>, childItems: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }> }> }> }>, orderPromotions?: Array<{ __typename?: 'OrderPromotion', id: string, promotionId: string, appliesTo: PromotionAppliesTo, discountAmount: number, promoCode?: string | null }> | null } | null };

export type GetOrdersByStatusQueryVariables = Exact<{
  status: OrderStatus;
}>;


export type GetOrdersByStatusQuery = { __typename?: 'Query', ordersByStatus: Array<{ __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean, location: { __typename?: 'Location', latitude: number, longitude: number, address: string }, workingHours: { __typename?: 'WorkingHours', opensAt: string, closesAt: string } }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, parentOrderItemId?: string | null, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }>, childItems: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }> }> }> }> }> };

export type GetOrderDriverQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetOrderDriverQuery = { __typename?: 'Query', order?: { __typename?: 'Order', id: string, status: OrderStatus, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, phoneNumber?: string | null, imageUrl?: string | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null, driverConnection?: { __typename?: 'DriverConnection', activeOrderId?: string | null, navigationPhase?: string | null, remainingEtaSeconds?: number | null, etaUpdatedAt?: any | null } | null } | null } | null };

export type UncompletedOrdersQueryVariables = Exact<{ [key: string]: never; }>;


export type UncompletedOrdersQuery = { __typename?: 'Query', uncompletedOrders: Array<{ __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, outForDeliveryAt?: any | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, createdAt: any, updatedAt: any, isActive: boolean, isOpen: boolean, location: { __typename?: 'Location', address: string, longitude: number, latitude: number }, workingHours: { __typename?: 'WorkingHours', closesAt: string, opensAt: string } }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, parentOrderItemId?: string | null, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }>, childItems: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }> }> }> }> }> };

export type OrderStatusUpdatedSubscriptionVariables = Exact<{
  orderId: Scalars['ID']['input'];
}>;


export type OrderStatusUpdatedSubscription = { __typename?: 'Subscription', orderStatusUpdated: { __typename?: 'Order', id: string, status: OrderStatus } };

export type UserOrdersUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserOrdersUpdatedSubscription = { __typename?: 'Subscription', userOrdersUpdated: Array<{ __typename?: 'Order', id: string, displayId: string, userId: string, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, dropOffLocation: { __typename?: 'Location', latitude: number, longitude: number, address: string }, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string, phoneNumber?: string | null, imageUrl?: string | null, driverLocationUpdatedAt?: any | null, driverLocation?: { __typename?: 'Location', latitude: number, longitude: number, address: string } | null, driverConnection?: { __typename?: 'DriverConnection', activeOrderId?: string | null, navigationPhase?: string | null, remainingEtaSeconds?: number | null, etaUpdatedAt?: any | null } | null } | null, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, createdAt: any, updatedAt: any, isActive: boolean, isOpen: boolean, location: { __typename?: 'Location', address: string, longitude: number, latitude: number }, workingHours: { __typename?: 'WorkingHours', closesAt: string, opensAt: string } }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, parentOrderItemId?: string | null, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }>, childItems: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, selectedOptions: Array<{ __typename?: 'OrderItemOption', id: string, optionGroupId: string, optionGroupName: string, optionId: string, optionName: string, priceAtOrder: number }> }> }> }> }> };

export type OrderDriverLiveTrackingSubscriptionVariables = Exact<{
  orderId: Scalars['ID']['input'];
}>;


export type OrderDriverLiveTrackingSubscription = { __typename?: 'Subscription', orderDriverLiveTracking: { __typename?: 'OrderDriverLiveTracking', orderId: string, driverId: string, latitude: number, longitude: number, navigationPhase?: string | null, remainingEtaSeconds?: number | null, etaUpdatedAt: any } };

export type GetProductsQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type GetProductsQuery = { __typename?: 'Query', products: Array<{ __typename?: 'ProductCard', id: string, name: string, imageUrl?: string | null, basePrice: number, isOffer: boolean, hasOptionGroups: boolean, variants: Array<{ __typename?: 'Product', id: string, name: string, imageUrl?: string | null, price: number, markupPrice?: number | null, nightMarkedupPrice?: number | null, isOnSale: boolean, salePrice?: number | null, isAvailable: boolean }>, product?: { __typename?: 'Product', id: string, businessId: string, categoryId: string, subcategoryId?: string | null, name: string, description?: string | null, imageUrl?: string | null, price: number, markupPrice?: number | null, nightMarkedupPrice?: number | null, isOnSale: boolean, salePrice?: number | null, isAvailable: boolean, sortOrder: number, isOffer: boolean, createdAt: string, updatedAt: string } | null }> };

export type GetProductQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetProductQuery = { __typename?: 'Query', product?: { __typename?: 'Product', id: string, businessId: string, categoryId: string, subcategoryId?: string | null, name: string, description?: string | null, imageUrl?: string | null, price: number, markupPrice?: number | null, nightMarkedupPrice?: number | null, isOnSale: boolean, salePrice?: number | null, isAvailable: boolean, sortOrder: number, isOffer: boolean, variantGroupId?: string | null, createdAt: string, updatedAt: string, variants: Array<{ __typename?: 'Product', id: string, name: string, price: number, markupPrice?: number | null, nightMarkedupPrice?: number | null, isOnSale: boolean, salePrice?: number | null, isAvailable: boolean, imageUrl?: string | null, description?: string | null }>, optionGroups: Array<{ __typename?: 'OptionGroup', id: string, name: string, minSelections: number, maxSelections: number, displayOrder: number, options: Array<{ __typename?: 'Option', id: string, name: string, extraPrice: number, linkedProductId?: string | null, displayOrder: number, linkedProduct?: { __typename?: 'Product', id: string, name: string, imageUrl?: string | null, price: number, markupPrice?: number | null, nightMarkedupPrice?: number | null, optionGroups: Array<{ __typename?: 'OptionGroup', id: string, name: string, minSelections: number, maxSelections: number, displayOrder: number, options: Array<{ __typename?: 'Option', id: string, name: string, extraPrice: number, displayOrder: number }> }> } | null }> }> } | null };

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

export type GetApplicablePromotionsQueryVariables = Exact<{
  cart: CartContextInput;
  manualCode?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetApplicablePromotionsQuery = { __typename?: 'Query', getApplicablePromotions: Array<{ __typename?: 'ApplicablePromotion', id: string, name: string, code?: string | null, type: PromotionType, target: PromotionTarget, appliedAmount: number, freeDelivery: boolean, priority: number }> };

export type GetPromotionThresholdsQueryVariables = Exact<{
  cart: CartContextInput;
}>;


export type GetPromotionThresholdsQuery = { __typename?: 'Query', getPromotionThresholds: Array<{ __typename?: 'PromotionThreshold', id: string, name: string, code?: string | null, spendThreshold: number, eligibleBusinessIds?: Array<string> | null, priority: number, isActive: boolean }> };

export type GetActiveGlobalPromotionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetActiveGlobalPromotionsQuery = { __typename?: 'Query', getActiveGlobalPromotions: Array<{ __typename?: 'Promotion', id: string, name: string, description?: string | null, type: PromotionType, target: PromotionTarget, discountValue?: number | null, spendThreshold?: number | null, isActive: boolean }> };

export type GetMyReferralStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyReferralStatsQuery = { __typename?: 'Query', myReferralStats: { __typename?: 'ReferralStats', totalReferrals: number, completedReferrals: number, pendingReferrals: number, totalRewardsEarned: number, referralCode: string, referrals: Array<{ __typename?: 'Referral', id: string, status: ReferralStatus, rewardGiven: boolean, rewardAmount?: number | null, completedAt?: any | null, createdAt: any, referredUser?: { __typename?: 'User', firstName: string, lastName: string } | null }> } };

export type GenerateReferralCodeMutationVariables = Exact<{ [key: string]: never; }>;


export type GenerateReferralCodeMutation = { __typename?: 'Mutation', generateReferralCode: string };

export type GetServiceZonesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetServiceZonesQuery = { __typename?: 'Query', deliveryZones: Array<{ __typename?: 'DeliveryZone', id: string, name: string, isActive: boolean, polygon: Array<{ __typename?: 'PolygonPoint', lat: number, lng: number }> }> };

export type GetStoreStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetStoreStatusQuery = { __typename?: 'Query', getStoreStatus: { __typename?: 'StoreStatus', isStoreClosed: boolean, closedMessage?: string | null, bannerEnabled: boolean, bannerMessage?: string | null, bannerType: BannerType } };

export type StoreStatusUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type StoreStatusUpdatedSubscription = { __typename?: 'Subscription', storeStatusUpdated: { __typename?: 'StoreStatus', isStoreClosed: boolean, closedMessage?: string | null, bannerEnabled: boolean, bannerMessage?: string | null, bannerType: BannerType } };


export const GetMyAddressesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyAddresses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myAddresses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"addressName"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetMyAddressesQuery, GetMyAddressesQueryVariables>;
export const AddUserAddressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddUserAddress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddUserAddressInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addUserAddress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"addressName"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}}]}}]}}]} as unknown as DocumentNode<AddUserAddressMutation, AddUserAddressMutationVariables>;
export const UpdateUserAddressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserAddress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserAddressInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserAddress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"addressName"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}}]}}]}}]} as unknown as DocumentNode<UpdateUserAddressMutation, UpdateUserAddressMutationVariables>;
export const DeleteUserAddressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUserAddress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUserAddress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteUserAddressMutation, DeleteUserAddressMutationVariables>;
export const SetDefaultAddressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetDefaultAddress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setDefaultAddress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<SetDefaultAddressMutation, SetDefaultAddressMutationVariables>;
export const AdminGetBusinessesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminGetBusinesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<AdminGetBusinessesQuery, AdminGetBusinessesQueryVariables>;
export const AdminGetBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminGetBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AdminGetBusinessQuery, AdminGetBusinessQueryVariables>;
export const AdminGetDriversDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminGetDrivers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"drivers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"commissionPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"maxActiveOrders"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"onlinePreference"}},{"kind":"Field","name":{"kind":"Name","value":"connectionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lastHeartbeatAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastLocationUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"disconnectedAt"}}]}}]}}]}}]} as unknown as DocumentNode<AdminGetDriversQuery, AdminGetDriversQueryVariables>;
export const AdminUpdateDriverSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateDriverSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"commissionPercentage"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"maxActiveOrders"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUpdateDriverSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}},{"kind":"Argument","name":{"kind":"Name","value":"commissionPercentage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"commissionPercentage"}}},{"kind":"Argument","name":{"kind":"Name","value":"maxActiveOrders"},"value":{"kind":"Variable","name":{"kind":"Name","value":"maxActiveOrders"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commissionPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"maxActiveOrders"}}]}}]}}]} as unknown as DocumentNode<AdminUpdateDriverSettingsMutation, AdminUpdateDriverSettingsMutationVariables>;
export const AdminSetDriverOnlineStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminSetDriverOnlineStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isOnline"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDriverOnlineStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"isOnline"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isOnline"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isOnline"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]} as unknown as DocumentNode<AdminSetDriverOnlineStatusMutation, AdminSetDriverOnlineStatusMutationVariables>;
export const AdminDriversUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"AdminDriversUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"driversUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"onlinePreference"}},{"kind":"Field","name":{"kind":"Name","value":"connectionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lastHeartbeatAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastLocationUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"disconnectedAt"}}]}}]}}]}}]} as unknown as DocumentNode<AdminDriversUpdatedSubscription, AdminDriversUpdatedSubscriptionVariables>;
export const AdminGetStoreStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminGetStoreStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getStoreStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isStoreClosed"}},{"kind":"Field","name":{"kind":"Name","value":"closedMessage"}}]}}]}}]} as unknown as DocumentNode<AdminGetStoreStatusQuery, AdminGetStoreStatusQueryVariables>;
export const AdminUpdateStoreStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateStoreStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateStoreStatusInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateStoreStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isStoreClosed"}},{"kind":"Field","name":{"kind":"Name","value":"closedMessage"}}]}}]}}]} as unknown as DocumentNode<AdminUpdateStoreStatusMutation, AdminUpdateStoreStatusMutationVariables>;
export const AdminGetNotificationCampaignsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminGetNotificationCampaigns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notificationCampaigns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"sentCount"}},{"kind":"Field","name":{"kind":"Name","value":"failedCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}}]}}]}}]} as unknown as DocumentNode<AdminGetNotificationCampaignsQuery, AdminGetNotificationCampaignsQueryVariables>;
export const AdminSendCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminSendCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sentCount"}},{"kind":"Field","name":{"kind":"Name","value":"failedCount"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}}]}}]}}]} as unknown as DocumentNode<AdminSendCampaignMutation, AdminSendCampaignMutationVariables>;
export const AdminCreateCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminCreateCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCampaignInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AdminCreateCampaignMutation, AdminCreateCampaignMutationVariables>;
export const AdminGetOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminGetOrders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}}]}}]}}]}}]}}]} as unknown as DocumentNode<AdminGetOrdersQuery, AdminGetOrdersQueryVariables>;
export const AdminGetOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminGetOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}}]}}]}}]}}]}}]} as unknown as DocumentNode<AdminGetOrderQuery, AdminGetOrderQueryVariables>;
export const AdminUpdateOrderStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateOrderStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOrderStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AdminUpdateOrderStatusMutation, AdminUpdateOrderStatusMutationVariables>;
export const AdminStartPreparingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminStartPreparing"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startPreparing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"preparationMinutes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}}]}}]}}]} as unknown as DocumentNode<AdminStartPreparingMutation, AdminStartPreparingMutationVariables>;
export const AdminUpdatePreparationTimeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdatePreparationTime"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePreparationTime"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"preparationMinutes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}}]}}]}}]} as unknown as DocumentNode<AdminUpdatePreparationTimeMutation, AdminUpdatePreparationTimeMutationVariables>;
export const AdminCancelOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminCancelOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AdminCancelOrderMutation, AdminCancelOrderMutationVariables>;
export const AdminAssignDriverToOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminAssignDriverToOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignDriverToOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"driverId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"driverId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AdminAssignDriverToOrderMutation, AdminAssignDriverToOrderMutationVariables>;
export const AdminAllOrdersUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"AdminAllOrdersUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allOrdersUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}}]}}]}}]}}]}}]} as unknown as DocumentNode<AdminAllOrdersUpdatedSubscription, AdminAllOrdersUpdatedSubscriptionVariables>;
export const AdminGetSettlementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminGetSettlements"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SettlementType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SettlementStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settlements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"paidAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AdminGetSettlementsQuery, AdminGetSettlementsQueryVariables>;
export const AdminMarkSettlementAsPaidDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminMarkSettlementAsPaid"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settlementId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markSettlementAsPaid"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"settlementId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settlementId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"paidAt"}}]}}]}}]} as unknown as DocumentNode<AdminMarkSettlementAsPaidMutation, AdminMarkSettlementAsPaidMutationVariables>;
export const AdminGetUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminGetUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"adminNote"}},{"kind":"Field","name":{"kind":"Name","value":"flagColor"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<AdminGetUsersQuery, AdminGetUsersQueryVariables>;
export const AdminUserBehaviorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminUserBehavior"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userBehavior"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"totalOrders"}},{"kind":"Field","name":{"kind":"Name","value":"deliveredOrders"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledOrders"}},{"kind":"Field","name":{"kind":"Name","value":"totalSpend"}},{"kind":"Field","name":{"kind":"Name","value":"avgOrderValue"}},{"kind":"Field","name":{"kind":"Name","value":"firstOrderAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastOrderAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastDeliveredAt"}}]}}]}}]} as unknown as DocumentNode<AdminUserBehaviorQuery, AdminUserBehaviorQueryVariables>;
export const AdminUpdateUserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateUserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"flagColor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}},{"kind":"Argument","name":{"kind":"Name","value":"flagColor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"flagColor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"adminNote"}},{"kind":"Field","name":{"kind":"Name","value":"flagColor"}}]}}]}}]} as unknown as DocumentNode<AdminUpdateUserNoteMutation, AdminUpdateUserNoteMutationVariables>;
export const DeleteMyAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteMyAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteMyAccount"}}]}}]} as unknown as DocumentNode<DeleteMyAccountMutation, DeleteMyAccountMutationVariables>;
export const InitiateSignupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InitiateSignup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InitiateSignupInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"initiateSignup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"signupStep"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<InitiateSignupMutation, InitiateSignupMutationVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"signupStep"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"preferredLanguage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"signupStep"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneVerified"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"preferredLanguage"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const ResendEmailVerificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResendEmailVerification"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resendEmailVerification"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"currentStep"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<ResendEmailVerificationMutation, ResendEmailVerificationMutationVariables>;
export const SetMyPreferredLanguageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetMyPreferredLanguage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AppLanguage"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setMyPreferredLanguage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preferredLanguage"}}]}}]}}]} as unknown as DocumentNode<SetMyPreferredLanguageMutation, SetMyPreferredLanguageMutationVariables>;
export const SubmitPhoneNumberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubmitPhoneNumber"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubmitPhoneNumberInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"submitPhoneNumber"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"currentStep"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SubmitPhoneNumberMutation, SubmitPhoneNumberMutationVariables>;
export const VerifyEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"VerifyEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"currentStep"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<VerifyEmailMutation, VerifyEmailMutationVariables>;
export const VerifyPhoneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyPhone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"VerifyPhoneInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyPhone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"currentStep"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<VerifyPhoneMutation, VerifyPhoneMutationVariables>;
export const GetBannersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBanners"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"activeOnly"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getBanners"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"activeOnly"},"value":{"kind":"Variable","name":{"kind":"Name","value":"activeOnly"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subtitle"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linkType"}},{"kind":"Field","name":{"kind":"Name","value":"linkTarget"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<GetBannersQuery, GetBannersQueryVariables>;
export const GetBusinessesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"isTemporarilyClosed"}},{"kind":"Field","name":{"kind":"Name","value":"temporaryClosureReason"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"activePromotion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"discountValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetBusinessesQuery, GetBusinessesQueryVariables>;
export const GetBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"prepTimeOverrideMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"isTemporarilyClosed"}},{"kind":"Field","name":{"kind":"Name","value":"temporaryClosureReason"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetBusinessQuery, GetBusinessQueryVariables>;
export const CalculateDeliveryPriceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CalculateDeliveryPrice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dropoffLat"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dropoffLng"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"calculateDeliveryPrice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"dropoffLat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dropoffLat"}}},{"kind":"Argument","name":{"kind":"Name","value":"dropoffLng"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dropoffLng"}}},{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"distanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"zoneApplied"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryFee"}}]}}]}}]}}]} as unknown as DocumentNode<CalculateDeliveryPriceQuery, CalculateDeliveryPriceQueryVariables>;
export const DeliveryPricingConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DeliveryPricingConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deliveryPricingConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"polygon"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lat"}},{"kind":"Field","name":{"kind":"Name","value":"lng"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deliveryFee"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"minDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"maxDistanceKm"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}}]}}]}}]}}]} as unknown as DocumentNode<DeliveryPricingConfigQuery, DeliveryPricingConfigQueryVariables>;
export const RegisterDeviceTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RegisterDeviceToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterDeviceTokenInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registerDeviceToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<RegisterDeviceTokenMutation, RegisterDeviceTokenMutationVariables>;
export const UnregisterDeviceTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnregisterDeviceToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unregisterDeviceToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}]}]}}]} as unknown as DocumentNode<UnregisterDeviceTokenMutation, UnregisterDeviceTokenMutationVariables>;
export const RegisterLiveActivityTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RegisterLiveActivityToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"activityId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registerLiveActivityToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}},{"kind":"Argument","name":{"kind":"Name","value":"activityId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"activityId"}}},{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}}]}]}}]} as unknown as DocumentNode<RegisterLiveActivityTokenMutation, RegisterLiveActivityTokenMutationVariables>;
export const TrackPushTelemetryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TrackPushTelemetry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TrackPushTelemetryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trackPushTelemetry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<TrackPushTelemetryMutation, TrackPushTelemetryMutationVariables>;
export const CreateOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateOrderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"parentOrderItemId"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateOrderMutation, CreateOrderMutationVariables>;
export const UpdateOrderStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateOrderStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOrderStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"parentOrderItemId"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UpdateOrderStatusMutation, UpdateOrderStatusMutationVariables>;
export const CancelOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"parentOrderItemId"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<CancelOrderMutation, CancelOrderMutationVariables>;
export const GetOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrders"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orders"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"parentOrderItemId"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrdersQuery, GetOrdersQueryVariables>;
export const GetOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"readyAt"}},{"kind":"Field","name":{"kind":"Name","value":"outForDeliveryAt"}},{"kind":"Field","name":{"kind":"Name","value":"deliveredAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverNotes"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pickupLocations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activeOrderId"}},{"kind":"Field","name":{"kind":"Name","value":"navigationPhase"}},{"kind":"Field","name":{"kind":"Name","value":"remainingEtaSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"etaUpdatedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"parentOrderItemId"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"originalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"paymentCollection"}},{"kind":"Field","name":{"kind":"Name","value":"orderPromotions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"promotionId"}},{"kind":"Field","name":{"kind":"Name","value":"appliesTo"}},{"kind":"Field","name":{"kind":"Name","value":"discountAmount"}},{"kind":"Field","name":{"kind":"Name","value":"promoCode"}}]}}]}}]}}]} as unknown as DocumentNode<GetOrderQuery, GetOrderQueryVariables>;
export const GetOrdersByStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrdersByStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ordersByStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"parentOrderItemId"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrdersByStatusQuery, GetOrdersByStatusQueryVariables>;
export const GetOrderDriverDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrderDriver"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activeOrderId"}},{"kind":"Field","name":{"kind":"Name","value":"navigationPhase"}},{"kind":"Field","name":{"kind":"Name","value":"remainingEtaSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"etaUpdatedAt"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrderDriverQuery, GetOrderDriverQueryVariables>;
export const UncompletedOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UncompletedOrders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uncompletedOrders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"outForDeliveryAt"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"closesAt"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"parentOrderItemId"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UncompletedOrdersQuery, UncompletedOrdersQueryVariables>;
export const OrderStatusUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OrderStatusUpdated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orderStatusUpdated"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<OrderStatusUpdatedSubscription, OrderStatusUpdatedSubscriptionVariables>;
export const UserOrdersUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserOrdersUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userOrdersUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"driverLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverLocationUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"driverConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activeOrderId"}},{"kind":"Field","name":{"kind":"Name","value":"navigationPhase"}},{"kind":"Field","name":{"kind":"Name","value":"remainingEtaSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"etaUpdatedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workingHours"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"closesAt"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"parentOrderItemId"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionId"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UserOrdersUpdatedSubscription, UserOrdersUpdatedSubscriptionVariables>;
export const OrderDriverLiveTrackingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OrderDriverLiveTracking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orderDriverLiveTracking"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"driverId"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"navigationPhase"}},{"kind":"Field","name":{"kind":"Name","value":"remainingEtaSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"etaUpdatedAt"}}]}}]}}]} as unknown as DocumentNode<OrderDriverLiveTrackingSubscription, OrderDriverLiveTrackingSubscriptionVariables>;
export const GetProductsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProducts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"basePrice"}},{"kind":"Field","name":{"kind":"Name","value":"isOffer"}},{"kind":"Field","name":{"kind":"Name","value":"hasOptionGroups"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"markupPrice"}},{"kind":"Field","name":{"kind":"Name","value":"nightMarkedupPrice"}},{"kind":"Field","name":{"kind":"Name","value":"isOnSale"}},{"kind":"Field","name":{"kind":"Name","value":"salePrice"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}}]}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"subcategoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"markupPrice"}},{"kind":"Field","name":{"kind":"Name","value":"nightMarkedupPrice"}},{"kind":"Field","name":{"kind":"Name","value":"isOnSale"}},{"kind":"Field","name":{"kind":"Name","value":"salePrice"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isOffer"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetProductsQuery, GetProductsQueryVariables>;
export const GetProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"product"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"subcategoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"markupPrice"}},{"kind":"Field","name":{"kind":"Name","value":"nightMarkedupPrice"}},{"kind":"Field","name":{"kind":"Name","value":"isOnSale"}},{"kind":"Field","name":{"kind":"Name","value":"salePrice"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isOffer"}},{"kind":"Field","name":{"kind":"Name","value":"variantGroupId"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"markupPrice"}},{"kind":"Field","name":{"kind":"Name","value":"nightMarkedupPrice"}},{"kind":"Field","name":{"kind":"Name","value":"isOnSale"}},{"kind":"Field","name":{"kind":"Name","value":"salePrice"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"optionGroups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"minSelections"}},{"kind":"Field","name":{"kind":"Name","value":"maxSelections"}},{"kind":"Field","name":{"kind":"Name","value":"displayOrder"}},{"kind":"Field","name":{"kind":"Name","value":"options"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"extraPrice"}},{"kind":"Field","name":{"kind":"Name","value":"linkedProductId"}},{"kind":"Field","name":{"kind":"Name","value":"displayOrder"}},{"kind":"Field","name":{"kind":"Name","value":"linkedProduct"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"markupPrice"}},{"kind":"Field","name":{"kind":"Name","value":"nightMarkedupPrice"}},{"kind":"Field","name":{"kind":"Name","value":"optionGroups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"minSelections"}},{"kind":"Field","name":{"kind":"Name","value":"maxSelections"}},{"kind":"Field","name":{"kind":"Name","value":"displayOrder"}},{"kind":"Field","name":{"kind":"Name","value":"options"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"extraPrice"}},{"kind":"Field","name":{"kind":"Name","value":"displayOrder"}}]}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetProductQuery, GetProductQueryVariables>;
export const ProductCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ProductCategoriesQuery, ProductCategoriesQueryVariables>;
export const ProductSubcategoriesByBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductSubcategoriesByBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productSubcategoriesByBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ProductSubcategoriesByBusinessQuery, ProductSubcategoriesByBusinessQueryVariables>;
export const ValidatePromotionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ValidatePromotions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cart"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CartContextInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"manualCode"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"validatePromotions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cart"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cart"}}},{"kind":"Argument","name":{"kind":"Name","value":"manualCode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"manualCode"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalDiscount"}},{"kind":"Field","name":{"kind":"Name","value":"freeDeliveryApplied"}},{"kind":"Field","name":{"kind":"Name","value":"finalSubtotal"}},{"kind":"Field","name":{"kind":"Name","value":"finalDeliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"finalTotal"}},{"kind":"Field","name":{"kind":"Name","value":"promotions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAmount"}},{"kind":"Field","name":{"kind":"Name","value":"freeDelivery"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}}]}}]}}]}}]} as unknown as DocumentNode<ValidatePromotionsQuery, ValidatePromotionsQueryVariables>;
export const GetApplicablePromotionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetApplicablePromotions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cart"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CartContextInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"manualCode"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getApplicablePromotions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cart"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cart"}}},{"kind":"Argument","name":{"kind":"Name","value":"manualCode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"manualCode"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAmount"}},{"kind":"Field","name":{"kind":"Name","value":"freeDelivery"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}}]}}]}}]} as unknown as DocumentNode<GetApplicablePromotionsQuery, GetApplicablePromotionsQueryVariables>;
export const GetPromotionThresholdsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPromotionThresholds"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cart"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CartContextInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPromotionThresholds"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cart"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cart"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"spendThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"eligibleBusinessIds"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<GetPromotionThresholdsQuery, GetPromotionThresholdsQueryVariables>;
export const GetActiveGlobalPromotionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetActiveGlobalPromotions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getActiveGlobalPromotions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"discountValue"}},{"kind":"Field","name":{"kind":"Name","value":"spendThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<GetActiveGlobalPromotionsQuery, GetActiveGlobalPromotionsQueryVariables>;
export const GetMyReferralStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyReferralStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myReferralStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalReferrals"}},{"kind":"Field","name":{"kind":"Name","value":"completedReferrals"}},{"kind":"Field","name":{"kind":"Name","value":"pendingReferrals"}},{"kind":"Field","name":{"kind":"Name","value":"totalRewardsEarned"}},{"kind":"Field","name":{"kind":"Name","value":"referralCode"}},{"kind":"Field","name":{"kind":"Name","value":"referrals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"rewardGiven"}},{"kind":"Field","name":{"kind":"Name","value":"rewardAmount"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"referredUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetMyReferralStatsQuery, GetMyReferralStatsQueryVariables>;
export const GenerateReferralCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateReferralCode"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateReferralCode"}}]}}]} as unknown as DocumentNode<GenerateReferralCodeMutation, GenerateReferralCodeMutationVariables>;
export const GetServiceZonesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetServiceZones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deliveryZones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"polygon"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lat"}},{"kind":"Field","name":{"kind":"Name","value":"lng"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<GetServiceZonesQuery, GetServiceZonesQueryVariables>;
export const GetStoreStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetStoreStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getStoreStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isStoreClosed"}},{"kind":"Field","name":{"kind":"Name","value":"closedMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"bannerMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerType"}}]}}]}}]} as unknown as DocumentNode<GetStoreStatusQuery, GetStoreStatusQueryVariables>;
export const StoreStatusUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"StoreStatusUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storeStatusUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isStoreClosed"}},{"kind":"Field","name":{"kind":"Name","value":"closedMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"bannerMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerType"}}]}}]}}]} as unknown as DocumentNode<StoreStatusUpdatedSubscription, StoreStatusUpdatedSubscriptionVariables>;