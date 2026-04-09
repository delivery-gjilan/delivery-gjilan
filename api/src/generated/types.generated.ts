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

/** Signal sent from a driver to all listening admins */
export type AdminPttSignal = {
  __typename?: 'AdminPttSignal';
  action: DriverPttSignalAction;
  channelName: Scalars['String']['output'];
  driverId: Scalars['ID']['output'];
  timestamp: Scalars['DateTime']['output'];
};

export type AgoraRtcCredentials = {
  __typename?: 'AgoraRtcCredentials';
  appId: Scalars['String']['output'];
  channelName: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  token: Scalars['String']['output'];
  uid: Scalars['Int']['output'];
};

export type AgoraRtcRole =
  | 'PUBLISHER'
  | 'SUBSCRIBER';

export type AppLanguage =
  | 'AL'
  | 'EN';

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

export type ApprovalReason =
  | 'FIRST_ORDER'
  | 'HIGH_VALUE'
  | 'OUT_OF_ZONE';

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
  business?: Maybe<Business>;
  businessId?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  displayContext: BannerDisplayContext;
  endsAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  imageUrl: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  linkTarget?: Maybe<Scalars['String']['output']>;
  linkType?: Maybe<Scalars['String']['output']>;
  mediaType: BannerMediaType;
  product?: Maybe<Product>;
  productId?: Maybe<Scalars['ID']['output']>;
  promotion?: Maybe<Promotion>;
  promotionId?: Maybe<Scalars['ID']['output']>;
  sortOrder: Scalars['Int']['output'];
  startsAt?: Maybe<Scalars['DateTime']['output']>;
  subtitle?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type BannerDisplayContext =
  | 'ALL'
  | 'BUSINESS'
  | 'CART'
  | 'CATEGORY'
  | 'HOME'
  | 'PRODUCT';

export type BannerMediaType =
  | 'GIF'
  | 'IMAGE'
  | 'VIDEO';

export type BannerType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING';

export type Business = {
  __typename?: 'Business';
  activePromotion?: Maybe<BusinessPromotion>;
  avgPrepTimeMinutes: Scalars['Int']['output'];
  businessType: BusinessType;
  commissionPercentage: Scalars['Float']['output'];
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  featuredSortOrder: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  isFeatured: Scalars['Boolean']['output'];
  isOpen: Scalars['Boolean']['output'];
  isTemporarilyClosed: Scalars['Boolean']['output'];
  location: Location;
  minOrderAmount: Scalars['Float']['output'];
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

export type BusinessDeviceOnlineStatus =
  | 'OFFLINE'
  | 'ONLINE'
  | 'STALE';

export type BusinessKPI = {
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

export type BusinessPerformanceStat = {
  __typename?: 'BusinessPerformanceStat';
  avgOrderValue: Scalars['Float']['output'];
  businessId: Scalars['ID']['output'];
  businessName: Scalars['String']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isFeatured: Scalars['Boolean']['output'];
  totalOrders: Scalars['Int']['output'];
  totalRevenue: Scalars['Float']['output'];
};

export type BusinessPromotion = {
  __typename?: 'BusinessPromotion';
  description?: Maybe<Scalars['String']['output']>;
  discountValue?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  spendThreshold?: Maybe<Scalars['Float']['output']>;
  type: PromotionType;
};

export type BusinessType =
  | 'MARKET'
  | 'PHARMACY'
  | 'RESTAURANT';

export type CampaignStatus =
  | 'DRAFT'
  | 'FAILED'
  | 'SENDING'
  | 'SENT';

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
  businessId?: InputMaybe<Scalars['ID']['input']>;
  displayContext?: InputMaybe<BannerDisplayContext>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  imageUrl: Scalars['String']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  linkTarget?: InputMaybe<Scalars['String']['input']>;
  linkType?: InputMaybe<Scalars['String']['input']>;
  mediaType?: InputMaybe<BannerMediaType>;
  productId?: InputMaybe<Scalars['ID']['input']>;
  promotionId?: InputMaybe<Scalars['ID']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  subtitle?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateBusinessInput = {
  avgPrepTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  businessType: BusinessType;
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  location: LocationInput;
  minOrderAmount?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  workingHours: WorkingHoursInput;
};

export type CreateBusinessOwnerInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  isDemoAccount?: InputMaybe<Scalars['Boolean']['input']>;
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
  imageUrl?: InputMaybe<Scalars['String']['input']>;
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
  priorityRequested?: InputMaybe<Scalars['Boolean']['input']>;
  prioritySurcharge?: InputMaybe<Scalars['Float']['input']>;
  promotionId?: InputMaybe<Scalars['ID']['input']>;
  totalPrice: Scalars['Float']['input'];
  userContextLocation?: InputMaybe<LocationInput>;
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
  price?: InputMaybe<Scalars['Float']['input']>;
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
  saleDiscountPercentage?: InputMaybe<Scalars['Float']['input']>;
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
  code?: InputMaybe<Scalars['String']['input']>;
  creatorId?: InputMaybe<Scalars['ID']['input']>;
  creatorType: PromotionCreatorType;
  description?: InputMaybe<Scalars['String']['input']>;
  discountValue?: InputMaybe<Scalars['Float']['input']>;
  driverPayoutAmount?: InputMaybe<Scalars['Float']['input']>;
  eligibleBusinessIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  endsAt?: InputMaybe<Scalars['String']['input']>;
  isActive: Scalars['Boolean']['input'];
  isRecovery?: InputMaybe<Scalars['Boolean']['input']>;
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
  maxAmount?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  promotionId?: InputMaybe<Scalars['ID']['input']>;
  type: SettlementRuleType;
};

export type CreateUserInput = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  isDemoAccount?: InputMaybe<Scalars['Boolean']['input']>;
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

export type DeviceAppType =
  | 'ADMIN'
  | 'BUSINESS'
  | 'CUSTOMER'
  | 'DRIVER';

export type DevicePlatform =
  | 'ANDROID'
  | 'IOS';

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

/** Summary of a driver's cash position and settlement breakdown. */
export type DriverCashSummary = {
  __typename?: 'DriverCashSummary';
  /** Total cash collected from delivered CASH_TO_DRIVER orders (totalPrice - businessPrice). */
  cashCollected: Scalars['Float']['output'];
  /** Net settlement balance: platformOwesYou - youOwePlatform. */
  netSettlement: Scalars['Float']['output'];
  /** Sum of unsettled PAYABLE settlements (platform owes driver). */
  platformOwesYou: Scalars['Float']['output'];
  /** Cash driver keeps after all settlements: cashCollected + netSettlement. */
  takeHome: Scalars['Float']['output'];
  /** Number of delivered orders in the period. */
  totalDeliveries: Scalars['Int']['output'];
  /** Sum of unsettled RECEIVABLE settlements (driver owes platform). */
  youOwePlatform: Scalars['Float']['output'];
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
export type DriverConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'LOST'
  | 'STALE';

export type DriverCustomerNotificationKind =
  | 'ARRIVED_WAITING'
  | 'ETA_LT_3_MIN';

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

export type DriverKPI = {
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

export type DriverOrderFinancials = {
  __typename?: 'DriverOrderFinancials';
  amountToCollectFromCustomer: Scalars['Float']['output'];
  amountToRemitToPlatform: Scalars['Float']['output'];
  driverNetEarnings: Scalars['Float']['output'];
  orderId: Scalars['ID']['output'];
  paymentCollection: OrderPaymentCollection;
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

export type DriverPttSignalAction =
  | 'MUTE'
  | 'STARTED'
  | 'STOPPED'
  | 'UNMUTE';

export type DriverRegisterInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
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

export type GetBannersFilter = {
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
  businessId?: InputMaybe<Scalars['ID']['input']>;
  displayContext?: InputMaybe<BannerDisplayContext>;
  includeScheduled?: InputMaybe<Scalars['Boolean']['input']>;
  productId?: InputMaybe<Scalars['ID']['input']>;
  promotionId?: InputMaybe<Scalars['ID']['input']>;
};

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
};

export type IssueRecoveryPromotionInput = {
  discountValue?: InputMaybe<Scalars['Float']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  orderId?: InputMaybe<Scalars['ID']['input']>;
  reason: Scalars['String']['input'];
  type: PromotionType;
  userIds: Array<Scalars['ID']['input']>;
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

export type MessageAlertType =
  | 'INFO'
  | 'URGENT'
  | 'WARNING';

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
  /** Admin creates a settlement request, notifying the business or driver via push. */
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
  /** Driver sends push-to-talk signal to all listening admins */
  driverSendPttSignal: Scalars['Boolean']['output'];
  /** Driver battery telemetry update (recommended every 5-10 minutes) */
  driverUpdateBatteryStatus: DriverConnection;
  grantFreeDelivery: Scalars['Boolean']['output'];
  initiateSignup: AuthResponse;
  issueRecoveryPromotion: Array<UserPromotion>;
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
  requestPasswordReset: Scalars['Boolean']['output'];
  resendEmailVerification: SignupStepResponse;
  resetPassword: Scalars['Boolean']['output'];
  /** Business/driver accepts or rejects a pending settlement request. */
  respondToSettlementRequest: SettlementRequest;
  runSettlementScenarioHarness: SettlementScenarioHarnessResult;
  /** Admin sends a message to a business user */
  sendBusinessMessage: BusinessMessage;
  sendCampaign: NotificationCampaign;
  /** Admin sends a message to a driver */
  sendDriverMessage: DriverMessage;
  sendPushNotification: SendNotificationResult;
  setBusinessFeatured: Business;
  setBusinessSchedule: Array<BusinessDayHours>;
  setDefaultAddress: Scalars['Boolean']['output'];
  setDeliveryPricingTiers: Array<DeliveryPricingTier>;
  setMyEmailOptOut: User;
  setMyPreferredLanguage: User;
  setOrderAdminNote: Order;
  setUserPermissions: User;
  /** Settle all unsettled settlements for a business. Supports partial payment. */
  settleWithBusiness: SettleResult;
  /** Settle unsettled settlements for a driver. Supports partial payment. */
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
  updateMyProfile: User;
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


export type MutationaddUserAddressArgs = {
  input: AddUserAddressInput;
};


export type MutationadminCancelOrderArgs = {
  id: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
  settleBusiness?: InputMaybe<Scalars['Boolean']['input']>;
  settleDriver?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationadminSendPttSignalArgs = {
  action: DriverPttSignalAction;
  channelName: Scalars['String']['input'];
  driverIds: Array<Scalars['ID']['input']>;
  muted?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationadminSetDriverConnectionStatusArgs = {
  driverId: Scalars['ID']['input'];
  status: DriverConnectionStatus;
};


export type MutationadminSetShiftDriversArgs = {
  driverIds: Array<Scalars['ID']['input']>;
};


export type MutationadminSimulateDriverHeartbeatArgs = {
  activeOrderId?: InputMaybe<Scalars['ID']['input']>;
  driverId: Scalars['ID']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  navigationPhase?: InputMaybe<Scalars['String']['input']>;
  remainingEtaSeconds?: InputMaybe<Scalars['Int']['input']>;
  setOnline?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationadminUpdateDriverLocationArgs = {
  driverId: Scalars['ID']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};


export type MutationadminUpdateDriverSettingsArgs = {
  commissionPercentage?: InputMaybe<Scalars['Float']['input']>;
  driverId: Scalars['ID']['input'];
  hasOwnVehicle?: InputMaybe<Scalars['Boolean']['input']>;
  maxActiveOrders?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationapproveOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationassignDriverToOrderArgs = {
  driverId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationassignPromotionToUsersArgs = {
  input: AssignPromotionToUserInput;
};


export type MutationbusinessDeviceHeartbeatArgs = {
  input: BusinessDeviceHeartbeatInput;
};


export type MutationbusinessDeviceOrderSignalArgs = {
  deviceId: Scalars['String']['input'];
  orderId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationcancelOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationchangeMyPasswordArgs = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};


export type MutationcreateBannerArgs = {
  input: CreateBannerInput;
};


export type MutationcreateBusinessArgs = {
  input: CreateBusinessInput;
};


export type MutationcreateBusinessWithOwnerArgs = {
  input: CreateBusinessWithOwnerInput;
};


export type MutationcreateCampaignArgs = {
  input: CreateCampaignInput;
};


export type MutationcreateDeliveryPricingTierArgs = {
  input: CreateDeliveryPricingTierInput;
};


export type MutationcreateDeliveryZoneArgs = {
  input: CreateDeliveryZoneInput;
};


export type MutationcreateOptionArgs = {
  input: CreateOptionInput;
  optionGroupId: Scalars['ID']['input'];
};


export type MutationcreateOptionGroupArgs = {
  input: CreateOptionGroupInput;
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


export type MutationcreateProductVariantGroupArgs = {
  input: CreateProductVariantGroupInput;
};


export type MutationcreatePromotionArgs = {
  input: CreatePromotionInput;
};


export type MutationcreateSettlementRequestArgs = {
  amount: Scalars['Float']['input'];
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
};


export type MutationcreateSettlementRuleArgs = {
  input: CreateSettlementRuleInput;
};


export type MutationcreateUserArgs = {
  input: CreateUserInput;
};


export type MutationdeleteBannerArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteBusinessArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteCampaignArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteDeliveryPricingTierArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteDeliveryZoneArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteOptionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteOptionGroupArgs = {
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


export type MutationdeleteProductVariantGroupArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeletePromotionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteSettlementRuleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteUserAddressArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdriverHeartbeatArgs = {
  activeOrderId?: InputMaybe<Scalars['ID']['input']>;
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  navigationPhase?: InputMaybe<Scalars['String']['input']>;
  remainingEtaSeconds?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationdriverLoginArgs = {
  input: DriverLoginInput;
};


export type MutationdriverNotifyCustomerArgs = {
  kind: DriverCustomerNotificationKind;
  orderId: Scalars['ID']['input'];
};


export type MutationdriverRegisterArgs = {
  input: DriverRegisterInput;
};


export type MutationdriverSendPttSignalArgs = {
  action: DriverPttSignalAction;
  channelName: Scalars['String']['input'];
};


export type MutationdriverUpdateBatteryStatusArgs = {
  isCharging?: InputMaybe<Scalars['Boolean']['input']>;
  level: Scalars['Int']['input'];
  optIn: Scalars['Boolean']['input'];
};


export type MutationgrantFreeDeliveryArgs = {
  orderId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationinitiateSignupArgs = {
  input: InitiateSignupInput;
};


export type MutationissueRecoveryPromotionArgs = {
  input: IssueRecoveryPromotionInput;
};


export type MutationloginArgs = {
  input: LoginInput;
};


export type MutationlogoutCurrentSessionArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationmarkBusinessMessagesReadArgs = {
  otherUserId: Scalars['ID']['input'];
};


export type MutationmarkDriverMessagesReadArgs = {
  otherUserId: Scalars['ID']['input'];
};


export type MutationmarkFirstOrderUsedArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationmarkSettlementAsPaidArgs = {
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  paymentReference?: InputMaybe<Scalars['String']['input']>;
  settlementId: Scalars['ID']['input'];
};


export type MutationmarkSettlementAsPartiallyPaidArgs = {
  amount: Scalars['Float']['input'];
  settlementId: Scalars['ID']['input'];
};


export type MutationmarkSettlementsAsPaidArgs = {
  ids: Array<Scalars['ID']['input']>;
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  paymentReference?: InputMaybe<Scalars['String']['input']>;
};


export type MutationrefreshTokenArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationregisterDeviceTokenArgs = {
  input: RegisterDeviceTokenInput;
};


export type MutationregisterLiveActivityTokenArgs = {
  activityId: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
  token: Scalars['String']['input'];
};


export type MutationremoveUserFromPromotionArgs = {
  promotionId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationreplyToBusinessMessageArgs = {
  adminId: Scalars['ID']['input'];
  body: Scalars['String']['input'];
};


export type MutationreplyToDriverMessageArgs = {
  adminId: Scalars['ID']['input'];
  body: Scalars['String']['input'];
};


export type MutationrequestPasswordResetArgs = {
  email: Scalars['String']['input'];
};


export type MutationresetPasswordArgs = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationrespondToSettlementRequestArgs = {
  action: SettlementRequestAction;
  reason?: InputMaybe<Scalars['String']['input']>;
  requestId: Scalars['ID']['input'];
};


export type MutationrunSettlementScenarioHarnessArgs = {
  scenarioIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationsendBusinessMessageArgs = {
  alertType: MessageAlertType;
  body: Scalars['String']['input'];
  businessUserId: Scalars['ID']['input'];
};


export type MutationsendCampaignArgs = {
  id: Scalars['ID']['input'];
  promotionId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationsendDriverMessageArgs = {
  alertType: MessageAlertType;
  body: Scalars['String']['input'];
  driverId: Scalars['ID']['input'];
};


export type MutationsendPushNotificationArgs = {
  input: SendPushNotificationInput;
};


export type MutationsetBusinessFeaturedArgs = {
  id: Scalars['ID']['input'];
  isFeatured: Scalars['Boolean']['input'];
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationsetBusinessScheduleArgs = {
  businessId: Scalars['ID']['input'];
  schedule: Array<BusinessDayHoursInput>;
};


export type MutationsetDefaultAddressArgs = {
  id: Scalars['ID']['input'];
};


export type MutationsetDeliveryPricingTiersArgs = {
  input: SetDeliveryPricingTiersInput;
};


export type MutationsetMyEmailOptOutArgs = {
  optOut: Scalars['Boolean']['input'];
};


export type MutationsetMyPreferredLanguageArgs = {
  language: AppLanguage;
};


export type MutationsetOrderAdminNoteArgs = {
  id: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
};


export type MutationsetUserPermissionsArgs = {
  permissions: Array<UserPermission>;
  userId: Scalars['ID']['input'];
};


export type MutationsettleWithBusinessArgs = {
  amount: Scalars['Float']['input'];
  businessId: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  paymentReference?: InputMaybe<Scalars['String']['input']>;
};


export type MutationsettleWithDriverArgs = {
  amount?: InputMaybe<Scalars['Float']['input']>;
  driverId: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  paymentReference?: InputMaybe<Scalars['String']['input']>;
};


export type MutationstartPreparingArgs = {
  id: Scalars['ID']['input'];
  preparationMinutes: Scalars['Int']['input'];
};


export type MutationsubmitPhoneNumberArgs = {
  input: SubmitPhoneNumberInput;
};


export type MutationtrackPushTelemetryArgs = {
  input: TrackPushTelemetryInput;
};


export type MutationunregisterDeviceTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationunsettleSettlementArgs = {
  settlementId: Scalars['ID']['input'];
};


export type MutationupdateBannerArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBannerInput;
};


export type MutationupdateBannerOrderArgs = {
  bannerId: Scalars['ID']['input'];
  newSortOrder: Scalars['Int']['input'];
};


export type MutationupdateBusinessArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
};


export type MutationupdateDeliveryPricingTierArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDeliveryPricingTierInput;
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


export type MutationupdateMyProfileArgs = {
  input: UpdateMyProfileInput;
};


export type MutationupdateOptionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOptionInput;
};


export type MutationupdateOptionGroupArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOptionGroupInput;
};


export type MutationupdateOrderStatusArgs = {
  id: Scalars['ID']['input'];
  status: OrderStatus;
};


export type MutationupdatePreparationTimeArgs = {
  id: Scalars['ID']['input'];
  preparationMinutes: Scalars['Int']['input'];
};


export type MutationupdateProductArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
};


export type MutationupdateProductCategoriesOrderArgs = {
  businessId: Scalars['ID']['input'];
  categories: Array<ProductCategoryOrderInput>;
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


export type MutationupdateSettlementRuleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSettlementRuleInput;
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

export type NotificationType =
  | 'ADMIN_ALERT'
  | 'ORDER_ASSIGNED'
  | 'ORDER_STATUS'
  | 'PROMOTIONAL';

export type OperationalKPIs = {
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
  imageUrl?: Maybe<Scalars['String']['output']>;
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
  approvalReasons?: Maybe<Array<ApprovalReason>>;
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
  prioritySurcharge: Scalars['Float']['output'];
  readyAt?: Maybe<Scalars['Date']['output']>;
  settlementPreview?: Maybe<OrderSettlementPreview>;
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

export type OrderConnection = {
  __typename?: 'OrderConnection';
  hasMore: Scalars['Boolean']['output'];
  orders: Array<Order>;
  totalCount: Scalars['Int']['output'];
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

export type OrderPaymentCollection =
  | 'CASH_TO_DRIVER'
  | 'PREPAID_TO_PLATFORM';

export type OrderPromotion = {
  __typename?: 'OrderPromotion';
  appliesTo: PromotionAppliesTo;
  discountAmount: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  promoCode?: Maybe<Scalars['String']['output']>;
  promotionId: Scalars['ID']['output'];
};

export type OrderSettlementLineItem = {
  __typename?: 'OrderSettlementLineItem';
  amount: Scalars['Float']['output'];
  businessId?: Maybe<Scalars['ID']['output']>;
  direction: Scalars['String']['output'];
  driverId?: Maybe<Scalars['ID']['output']>;
  reason: Scalars['String']['output'];
  ruleId?: Maybe<Scalars['ID']['output']>;
  type: Scalars['String']['output'];
};

export type OrderSettlementPreview = {
  __typename?: 'OrderSettlementPreview';
  driverAssigned: Scalars['Boolean']['output'];
  lineItems: Array<OrderSettlementLineItem>;
  netMargin: Scalars['Float']['output'];
  totalPayable: Scalars['Float']['output'];
  totalReceivable: Scalars['Float']['output'];
};

export type OrderStatus =
  | 'AWAITING_APPROVAL'
  | 'CANCELLED'
  | 'DELIVERED'
  | 'OUT_FOR_DELIVERY'
  | 'PENDING'
  | 'PREPARING'
  | 'READY';

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
  effectivePrice: Scalars['Float']['output'];
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
  saleDiscountPercentage?: Maybe<Scalars['Float']['output']>;
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
  creatorType: PromotionCreatorType;
  currentGlobalUsage: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  discountValue?: Maybe<Scalars['Float']['output']>;
  eligibleBusinesses?: Maybe<Array<Business>>;
  endsAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isRecovery: Scalars['Boolean']['output'];
  isStackable: Scalars['Boolean']['output'];
  maxDiscountCap?: Maybe<Scalars['Float']['output']>;
  maxGlobalUsage?: Maybe<Scalars['Int']['output']>;
  maxUsagePerUser?: Maybe<Scalars['Int']['output']>;
  minOrderAmount?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  orderId?: Maybe<Scalars['ID']['output']>;
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

export type PromotionCreatorType =
  | 'BUSINESS'
  | 'PLATFORM';

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
  | 'SPEND_X_FIXED'
  | 'SPEND_X_GET_FREE'
  | 'SPEND_X_PERCENT';

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

export type PushTelemetryEventType =
  | 'ACTION_TAPPED'
  | 'OPENED'
  | 'RECEIVED'
  | 'TOKEN_REFRESHED'
  | 'TOKEN_REGISTERED'
  | 'TOKEN_UNREGISTERED';

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
  businessKPIs: Array<BusinessKPI>;
  /** Admin: list of all business user threads with unread counts */
  businessMessageThreads: Array<BusinessMessageThread>;
  /** Admin: full conversation with a specific business user */
  businessMessages: Array<BusinessMessage>;
  businessPerformanceStats: Array<BusinessPerformanceStat>;
  businesses: Array<Business>;
  calculateDeliveryPrice: DeliveryPriceResult;
  cancelledOrders: Array<Order>;
  deliveryPricingConfig: DeliveryPricingConfig;
  deliveryPricingTiers: Array<DeliveryPricingTier>;
  deliveryZones: Array<DeliveryZone>;
  deviceTokens: Array<DeviceToken>;
  driverBalance: SettlementSummary;
  /** Driver cash summary with settlement breakdown. Auto-scoped to current driver. */
  driverCashSummary: DriverCashSummary;
  driverKPIs: Array<DriverKPI>;
  /** Admin: list of all driver threads with unread counts */
  driverMessageThreads: Array<DriverMessageThread>;
  /** Admin: full conversation with a specific driver */
  driverMessages: Array<DriverMessage>;
  driverOrderFinancials?: Maybe<DriverOrderFinancials>;
  drivers: Array<User>;
  featuredBusinesses: Array<Business>;
  getActiveBanners: Array<Banner>;
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
  getRecoveryPromotions: Array<Promotion>;
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
  notificationCampaign?: Maybe<NotificationCampaign>;
  notificationCampaigns: Array<NotificationCampaign>;
  offers: Array<Product>;
  operationalKPIs: OperationalKPIs;
  order?: Maybe<Order>;
  orders: OrderConnection;
  ordersByStatus: Array<Order>;
  peakHourAnalysis: PeakHourAnalysis;
  previewCampaignAudience: AudiencePreview;
  prioritySurchargeAmount: Scalars['Float']['output'];
  product?: Maybe<Product>;
  productCategories: Array<ProductCategory>;
  productCategory?: Maybe<ProductCategory>;
  productSubcategories: Array<ProductSubcategory>;
  productSubcategoriesByBusiness: Array<ProductSubcategory>;
  products: Array<ProductCard>;
  pushTelemetryEvents: Array<PushTelemetryEvent>;
  pushTelemetrySummary: PushTelemetrySummary;
  /** Grouped settlement breakdown by category. */
  settlementBreakdown: Array<SettlementBreakdownItem>;
  settlementPayment?: Maybe<SettlementPayment>;
  settlementPayments: Array<SettlementPayment>;
  settlementRequests: Array<SettlementRequest>;
  settlementRule?: Maybe<SettlementRule>;
  settlementRules: Array<SettlementRule>;
  settlementRulesCount: Scalars['Int']['output'];
  settlementScenarioDefinitions: Array<SettlementScenarioDefinition>;
  settlementSummary: SettlementSummary;
  settlements: Array<Settlement>;
  uncompletedOrders: Array<Order>;
  unsettledBalance: Scalars['Float']['output'];
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


export type QuerybusinessDeviceHealthArgs = {
  hours?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerybusinessKPIsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};


export type QuerybusinessMessagesArgs = {
  businessUserId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerybusinessPerformanceStatsArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerycalculateDeliveryPriceArgs = {
  businessId: Scalars['ID']['input'];
  dropoffLat: Scalars['Float']['input'];
  dropoffLng: Scalars['Float']['input'];
};


export type QuerycancelledOrdersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerydeviceTokensArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerydriverBalanceArgs = {
  driverId: Scalars['ID']['input'];
};


export type QuerydriverCashSummaryArgs = {
  endDate?: InputMaybe<Scalars['Date']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
};


export type QuerydriverKPIsArgs = {
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};


export type QuerydriverMessagesArgs = {
  driverId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerydriverOrderFinancialsArgs = {
  orderId: Scalars['ID']['input'];
};


export type QuerygetActiveBannersArgs = {
  displayContext?: InputMaybe<BannerDisplayContext>;
};


export type QuerygetAgoraRtcCredentialsArgs = {
  channelName: Scalars['String']['input'];
  role: AgoraRtcRole;
};


export type QuerygetAllPromotionsArgs = {
  includeRecovery?: InputMaybe<Scalars['Boolean']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QuerygetApplicablePromotionsArgs = {
  cart: CartContextInput;
  manualCode?: InputMaybe<Scalars['String']['input']>;
};


export type QuerygetBannerArgs = {
  id: Scalars['ID']['input'];
};


export type QuerygetBannersArgs = {
  filter?: InputMaybe<GetBannersFilter>;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  promotionId: Scalars['ID']['input'];
};


export type QuerygetStoreStatusArgs = {
  url?: InputMaybe<Scalars['String']['input']>;
};


export type QuerygetUserPromoMetadataArgs = {
  userId: Scalars['ID']['input'];
};


export type QuerygetUserPromotionsArgs = {
  userId: Scalars['ID']['input'];
};


export type QuerymyBusinessMessagesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerymyDriverMessagesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerynotificationCampaignArgs = {
  id: Scalars['ID']['input'];
};


export type QueryoffersArgs = {
  businessId: Scalars['ID']['input'];
};


export type QueryoperationalKPIsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};


export type QueryorderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryordersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  statuses?: InputMaybe<Array<OrderStatus>>;
};


export type QueryordersByStatusArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status: OrderStatus;
};


export type QuerypeakHourAnalysisArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};


export type QuerypreviewCampaignAudienceArgs = {
  query: Scalars['JSON']['input'];
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


export type QuerypushTelemetryEventsArgs = {
  appType?: InputMaybe<DeviceAppType>;
  eventType?: InputMaybe<PushTelemetryEventType>;
  hours?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  platform?: InputMaybe<DevicePlatform>;
};


export type QuerypushTelemetrySummaryArgs = {
  hours?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerysettlementBreakdownArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  isSettled?: InputMaybe<Scalars['Boolean']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  type?: InputMaybe<SettlementType>;
};


export type QuerysettlementPaymentArgs = {
  id: Scalars['ID']['input'];
};


export type QuerysettlementPaymentsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  entityType?: InputMaybe<SettlementType>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
};


export type QuerysettlementRequestsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  entityType?: InputMaybe<SettlementType>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<SettlementRequestStatus>;
};


export type QuerysettlementRuleArgs = {
  id: Scalars['ID']['input'];
};


export type QuerysettlementRulesArgs = {
  filter?: InputMaybe<SettlementRuleFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerysettlementRulesCountArgs = {
  filter?: InputMaybe<SettlementRuleFilterInput>;
};


export type QuerysettlementSummaryArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  direction?: InputMaybe<SettlementDirection>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  isSettled?: InputMaybe<Scalars['Boolean']['input']>;
  orderId?: InputMaybe<Scalars['ID']['input']>;
  promotionId?: InputMaybe<Scalars['ID']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  type?: InputMaybe<SettlementType>;
};


export type QuerysettlementsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  direction?: InputMaybe<SettlementDirection>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  isSettled?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderId?: InputMaybe<Scalars['ID']['input']>;
  promotionId?: InputMaybe<Scalars['ID']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  status?: InputMaybe<SettlementStatus>;
  type?: InputMaybe<SettlementType>;
};


export type QueryunsettledBalanceArgs = {
  entityId: Scalars['ID']['input'];
  entityType: SettlementType;
};


export type QueryuserBehaviorArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryusersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryvalidatePromotionsArgs = {
  cart: CartContextInput;
  manualCode?: InputMaybe<Scalars['String']['input']>;
};

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
  rule?: Maybe<SettlementRule>;
  ruleId?: Maybe<Scalars['ID']['output']>;
  settlementPayment?: Maybe<SettlementPayment>;
  sourcePayment?: Maybe<SettlementPayment>;
  status: SettlementStatus;
  type: SettlementType;
  updatedAt: Scalars['Date']['output'];
};

export type SettlementAmountType =
  | 'FIXED'
  | 'PERCENT';

/** Grouped settlement totals by category. */
export type SettlementBreakdownItem = {
  __typename?: 'SettlementBreakdownItem';
  /** Category key (e.g. PLATFORM_COMMISSION, PROMOTION_COST, MARKUP_REMITTANCE, DELIVERY_COMMISSION). */
  category: Scalars['String']['output'];
  /** Number of settlements in this category. */
  count: Scalars['Int']['output'];
  /** Direction of these settlements. */
  direction: SettlementDirection;
  /** Human-readable label for the category. */
  label: Scalars['String']['output'];
  /** Total amount for this category. */
  totalAmount: Scalars['Float']['output'];
};

export type SettlementDirection =
  | 'PAYABLE'
  | 'RECEIVABLE';

export type SettlementEntityType =
  | 'BUSINESS'
  | 'DRIVER';

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

export type SettlementPaymentDirection =
  | 'ENTITY_TO_PLATFORM'
  | 'PLATFORM_TO_ENTITY';

export type SettlementRequest = {
  __typename?: 'SettlementRequest';
  amount: Scalars['Float']['output'];
  business?: Maybe<Business>;
  createdAt: Scalars['Date']['output'];
  driver?: Maybe<User>;
  entityType: SettlementType;
  id: Scalars['ID']['output'];
  note?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  respondedAt?: Maybe<Scalars['Date']['output']>;
  respondedBy?: Maybe<User>;
  settlementPayment?: Maybe<SettlementPayment>;
  status: SettlementRequestStatus;
  updatedAt: Scalars['Date']['output'];
};

export type SettlementRequestAction =
  | 'ACCEPT'
  | 'REJECT';

export type SettlementRequestStatus =
  | 'ACCEPTED'
  | 'PENDING'
  | 'REJECTED';

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
  maxAmount?: Maybe<Scalars['Float']['output']>;
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

export type SettlementRuleScope =
  | 'BUSINESS'
  | 'BUSINESS_PROMOTION'
  | 'GLOBAL'
  | 'PROMOTION';

export type SettlementRuleType =
  | 'DELIVERY_PRICE'
  | 'ORDER_PRICE';

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

export type SettlementStatus =
  | 'CANCELLED'
  | 'DISPUTED'
  | 'OVERDUE'
  | 'PAID'
  | 'PENDING';

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

export type SettlementType =
  | 'BUSINESS'
  | 'DRIVER';

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
  /** Admin listens for push-to-talk signals from any driver */
  adminPttSignal: AdminPttSignal;
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


export type SubscriptionadminBusinessMessageReceivedArgs = {
  businessUserId: Scalars['ID']['input'];
};


export type SubscriptionadminMessageReceivedArgs = {
  driverId: Scalars['ID']['input'];
};


export type SubscriptionauditLogCreatedArgs = {
  action?: InputMaybe<ActionType>;
  actorType?: InputMaybe<ActorType>;
  entityType?: InputMaybe<EntityType>;
};


export type SubscriptiondriverConnectionStatusChangedArgs = {
  driverId: Scalars['ID']['input'];
};


export type SubscriptiondriverPttSignalArgs = {
  driverId: Scalars['ID']['input'];
};


export type SubscriptionorderDriverLiveTrackingArgs = {
  input?: InputMaybe<SubscriptionInput>;
  orderId: Scalars['ID']['input'];
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
  businessId?: InputMaybe<Scalars['ID']['input']>;
  displayContext?: InputMaybe<BannerDisplayContext>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  linkTarget?: InputMaybe<Scalars['String']['input']>;
  linkType?: InputMaybe<Scalars['String']['input']>;
  mediaType?: InputMaybe<BannerMediaType>;
  productId?: InputMaybe<Scalars['ID']['input']>;
  promotionId?: InputMaybe<Scalars['ID']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
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
  minOrderAmount?: InputMaybe<Scalars['Float']['input']>;
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

export type UpdateMyProfileInput = {
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
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
  imageUrl?: InputMaybe<Scalars['String']['input']>;
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
  isOffer?: InputMaybe<Scalars['Boolean']['input']>;
  isOnSale?: InputMaybe<Scalars['Boolean']['input']>;
  markupPrice?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  nightMarkedupPrice?: InputMaybe<Scalars['Float']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  saleDiscountPercentage?: InputMaybe<Scalars['Float']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  subcategoryId?: InputMaybe<Scalars['ID']['input']>;
  variantGroupId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateProductSubcategoryInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePromotionInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSettlementRuleInput = {
  amount?: InputMaybe<Scalars['Float']['input']>;
  amountType?: InputMaybe<SettlementAmountType>;
  appliesTo?: InputMaybe<Scalars['String']['input']>;
  direction?: InputMaybe<SettlementDirection>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  maxAmount?: InputMaybe<Scalars['Float']['input']>;
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
  isDemoAccount?: InputMaybe<Scalars['Boolean']['input']>;
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
  emailOptOut: Scalars['Boolean']['output'];
  emailVerified: Scalars['Boolean']['output'];
  firstName: Scalars['String']['output'];
  flagColor?: Maybe<Scalars['String']['output']>;
  hasOwnVehicle?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isDemoAccount: Scalars['Boolean']['output'];
  isOnline: Scalars['Boolean']['output'];
  isTrustedCustomer: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  maxActiveOrders?: Maybe<Scalars['Int']['output']>;
  permissions: Array<UserPermission>;
  phoneNumber?: Maybe<Scalars['String']['output']>;
  phoneVerified: Scalars['Boolean']['output'];
  preferredLanguage: AppLanguage;
  role: UserRole;
  signupStep: SignupStep;
  totalOrders: Scalars['Int']['output'];
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
  AdminPttSignal: ResolverTypeWrapper<Omit<AdminPttSignal, 'action'> & { action: ResolversTypes['DriverPttSignalAction'] }>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  AgoraRtcCredentials: ResolverTypeWrapper<AgoraRtcCredentials>;
  AgoraRtcRole: ResolverTypeWrapper<'PUBLISHER' | 'SUBSCRIBER'>;
  AppLanguage: ResolverTypeWrapper<'EN' | 'AL'>;
  ApplicablePromotion: ResolverTypeWrapper<Omit<ApplicablePromotion, 'target' | 'type'> & { target: ResolversTypes['PromotionTarget'], type: ResolversTypes['PromotionType'] }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ApprovalReason: ResolverTypeWrapper<'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE'>;
  AssignPromotionToUserInput: AssignPromotionToUserInput;
  AudiencePreview: ResolverTypeWrapper<Omit<AudiencePreview, 'sampleUsers'> & { sampleUsers: Array<ResolversTypes['User']> }>;
  AuditLog: ResolverTypeWrapper<Omit<AuditLog, 'action' | 'actor' | 'actorType' | 'entityType'> & { action: ResolversTypes['ActionType'], actor?: Maybe<ResolversTypes['User']>, actorType: ResolversTypes['ActorType'], entityType: ResolversTypes['EntityType'] }>;
  AuditLogConnection: ResolverTypeWrapper<Omit<AuditLogConnection, 'logs'> & { logs: Array<ResolversTypes['AuditLog']> }>;
  AuthResponse: ResolverTypeWrapper<Omit<AuthResponse, 'user'> & { user: ResolversTypes['User'] }>;
  Banner: ResolverTypeWrapper<Omit<Banner, 'business' | 'displayContext' | 'mediaType' | 'promotion'> & { business?: Maybe<ResolversTypes['Business']>, displayContext: ResolversTypes['BannerDisplayContext'], mediaType: ResolversTypes['BannerMediaType'], promotion?: Maybe<ResolversTypes['Promotion']> }>;
  BannerDisplayContext: ResolverTypeWrapper<'HOME' | 'BUSINESS' | 'CATEGORY' | 'PRODUCT' | 'CART' | 'ALL'>;
  BannerMediaType: ResolverTypeWrapper<'IMAGE' | 'GIF' | 'VIDEO'>;
  BannerType: ResolverTypeWrapper<'INFO' | 'WARNING' | 'SUCCESS'>;
  Business: ResolverTypeWrapper<Omit<Business, 'activePromotion' | 'businessType'> & { activePromotion?: Maybe<ResolversTypes['BusinessPromotion']>, businessType: ResolversTypes['BusinessType'] }>;
  BusinessDayHours: ResolverTypeWrapper<BusinessDayHours>;
  BusinessDayHoursInput: BusinessDayHoursInput;
  BusinessDeviceHealth: ResolverTypeWrapper<Omit<BusinessDeviceHealth, 'onlineStatus' | 'platform'> & { onlineStatus: ResolversTypes['BusinessDeviceOnlineStatus'], platform: ResolversTypes['DevicePlatform'] }>;
  BusinessDeviceHeartbeatInput: BusinessDeviceHeartbeatInput;
  BusinessDeviceOnlineStatus: ResolverTypeWrapper<'ONLINE' | 'STALE' | 'OFFLINE'>;
  BusinessKPI: ResolverTypeWrapper<BusinessKPI>;
  BusinessMessage: ResolverTypeWrapper<Omit<BusinessMessage, 'alertType'> & { alertType: ResolversTypes['MessageAlertType'] }>;
  BusinessMessageThread: ResolverTypeWrapper<Omit<BusinessMessageThread, 'lastMessage'> & { lastMessage?: Maybe<ResolversTypes['BusinessMessage']> }>;
  BusinessMessageUser: ResolverTypeWrapper<BusinessMessageUser>;
  BusinessPerformanceStat: ResolverTypeWrapper<BusinessPerformanceStat>;
  BusinessPromotion: ResolverTypeWrapper<Omit<BusinessPromotion, 'type'> & { type: ResolversTypes['PromotionType'] }>;
  BusinessType: ResolverTypeWrapper<'MARKET' | 'PHARMACY' | 'RESTAURANT'>;
  CampaignStatus: ResolverTypeWrapper<'DRAFT' | 'SENDING' | 'SENT' | 'FAILED'>;
  CartContextInput: CartContextInput;
  CartItemInput: CartItemInput;
  CreateBannerInput: CreateBannerInput;
  CreateBusinessInput: CreateBusinessInput;
  CreateBusinessOwnerInput: CreateBusinessOwnerInput;
  CreateBusinessWithOwnerInput: CreateBusinessWithOwnerInput;
  CreateBusinessWithOwnerPayload: ResolverTypeWrapper<Omit<CreateBusinessWithOwnerPayload, 'business' | 'owner'> & { business: ResolversTypes['Business'], owner: ResolversTypes['User'] }>;
  CreateCampaignInput: CreateCampaignInput;
  CreateDeliveryPricingTierInput: CreateDeliveryPricingTierInput;
  CreateDeliveryZoneInput: CreateDeliveryZoneInput;
  CreateOptionGroupInput: CreateOptionGroupInput;
  CreateOptionInput: CreateOptionInput;
  CreateOrderChildItemInput: CreateOrderChildItemInput;
  CreateOrderInput: CreateOrderInput;
  CreateOrderItemInput: CreateOrderItemInput;
  CreateOrderItemOptionInput: CreateOrderItemOptionInput;
  CreateProductCategoryInput: CreateProductCategoryInput;
  CreateProductInput: CreateProductInput;
  CreateProductSubcategoryInput: CreateProductSubcategoryInput;
  CreateProductVariantGroupInput: CreateProductVariantGroupInput;
  CreatePromotionInput: CreatePromotionInput;
  CreateSettlementRuleInput: CreateSettlementRuleInput;
  CreateUserInput: CreateUserInput;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DayOfWeekDistribution: ResolverTypeWrapper<DayOfWeekDistribution>;
  DayVolume: ResolverTypeWrapper<DayVolume>;
  DeliveryPriceResult: ResolverTypeWrapper<DeliveryPriceResult>;
  DeliveryPricingConfig: ResolverTypeWrapper<DeliveryPricingConfig>;
  DeliveryPricingTier: ResolverTypeWrapper<DeliveryPricingTier>;
  DeliveryZone: ResolverTypeWrapper<DeliveryZone>;
  DeliveryZoneMatch: ResolverTypeWrapper<DeliveryZoneMatch>;
  DeviceAppType: ResolverTypeWrapper<'CUSTOMER' | 'DRIVER' | 'BUSINESS' | 'ADMIN'>;
  DevicePlatform: ResolverTypeWrapper<'IOS' | 'ANDROID'>;
  DeviceToken: ResolverTypeWrapper<Omit<DeviceToken, 'appType' | 'platform'> & { appType: ResolversTypes['DeviceAppType'], platform: ResolversTypes['DevicePlatform'] }>;
  DriverAuthResult: ResolverTypeWrapper<Omit<DriverAuthResult, 'driver'> & { driver: ResolversTypes['DriverBasicInfo'] }>;
  DriverBasicInfo: ResolverTypeWrapper<Omit<DriverBasicInfo, 'connectionStatus'> & { connectionStatus: ResolversTypes['DriverConnectionStatus'] }>;
  DriverCashSummary: ResolverTypeWrapper<DriverCashSummary>;
  DriverConnection: ResolverTypeWrapper<Omit<DriverConnection, 'connectionStatus'> & { connectionStatus: ResolversTypes['DriverConnectionStatus'] }>;
  DriverConnectionStatus: ResolverTypeWrapper<'CONNECTED' | 'STALE' | 'LOST' | 'DISCONNECTED'>;
  DriverCustomerNotificationKind: ResolverTypeWrapper<'ETA_LT_3_MIN' | 'ARRIVED_WAITING'>;
  DriverDailyMetrics: ResolverTypeWrapper<Omit<DriverDailyMetrics, 'connectionStatus'> & { connectionStatus: ResolversTypes['DriverConnectionStatus'] }>;
  DriverHeartbeatResult: ResolverTypeWrapper<Omit<DriverHeartbeatResult, 'connectionStatus'> & { connectionStatus: ResolversTypes['DriverConnectionStatus'] }>;
  DriverKPI: ResolverTypeWrapper<DriverKPI>;
  DriverLoginInput: DriverLoginInput;
  DriverMessage: ResolverTypeWrapper<Omit<DriverMessage, 'alertType'> & { alertType: ResolversTypes['MessageAlertType'] }>;
  DriverMessageThread: ResolverTypeWrapper<Omit<DriverMessageThread, 'lastMessage'> & { lastMessage?: Maybe<ResolversTypes['DriverMessage']> }>;
  DriverMessageUser: ResolverTypeWrapper<DriverMessageUser>;
  DriverOrderFinancials: ResolverTypeWrapper<Omit<DriverOrderFinancials, 'paymentCollection'> & { paymentCollection: ResolversTypes['OrderPaymentCollection'] }>;
  DriverPttSignal: ResolverTypeWrapper<Omit<DriverPttSignal, 'action'> & { action: ResolversTypes['DriverPttSignalAction'] }>;
  DriverPttSignalAction: ResolverTypeWrapper<'STARTED' | 'STOPPED' | 'MUTE' | 'UNMUTE'>;
  DriverRegisterInput: DriverRegisterInput;
  EntityType: ResolverTypeWrapper<'USER' | 'BUSINESS' | 'PRODUCT' | 'ORDER' | 'SETTLEMENT' | 'DRIVER' | 'CATEGORY' | 'SUBCATEGORY' | 'DELIVERY_ZONE'>;
  GetBannersFilter: GetBannersFilter;
  HourlyDistribution: ResolverTypeWrapper<HourlyDistribution>;
  InitiateSignupInput: InitiateSignupInput;
  IssueRecoveryPromotionInput: IssueRecoveryPromotionInput;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Location: ResolverTypeWrapper<Location>;
  LocationInput: LocationInput;
  LoginInput: LoginInput;
  MessageAlertType: ResolverTypeWrapper<'INFO' | 'WARNING' | 'URGENT'>;
  Mutation: ResolverTypeWrapper<{}>;
  Notification: ResolverTypeWrapper<Omit<Notification, 'type'> & { type: ResolversTypes['NotificationType'] }>;
  NotificationCampaign: ResolverTypeWrapper<Omit<NotificationCampaign, 'sender' | 'status'> & { sender?: Maybe<ResolversTypes['User']>, status: ResolversTypes['CampaignStatus'] }>;
  NotificationType: ResolverTypeWrapper<'ORDER_STATUS' | 'ORDER_ASSIGNED' | 'PROMOTIONAL' | 'ADMIN_ALERT'>;
  OperationalKPIs: ResolverTypeWrapper<OperationalKPIs>;
  Option: ResolverTypeWrapper<Option>;
  OptionGroup: ResolverTypeWrapper<OptionGroup>;
  Order: ResolverTypeWrapper<Omit<Order, 'approvalReasons' | 'businesses' | 'driver' | 'orderPromotions' | 'paymentCollection' | 'status' | 'user'> & { approvalReasons?: Maybe<Array<ResolversTypes['ApprovalReason']>>, businesses: Array<ResolversTypes['OrderBusiness']>, driver?: Maybe<ResolversTypes['User']>, orderPromotions?: Maybe<Array<ResolversTypes['OrderPromotion']>>, paymentCollection: ResolversTypes['OrderPaymentCollection'], status: ResolversTypes['OrderStatus'], user?: Maybe<ResolversTypes['User']> }>;
  OrderBusiness: ResolverTypeWrapper<Omit<OrderBusiness, 'business'> & { business: ResolversTypes['Business'] }>;
  OrderConnection: ResolverTypeWrapper<Omit<OrderConnection, 'orders'> & { orders: Array<ResolversTypes['Order']> }>;
  OrderDriverLiveTracking: ResolverTypeWrapper<OrderDriverLiveTracking>;
  OrderItem: ResolverTypeWrapper<OrderItem>;
  OrderItemOption: ResolverTypeWrapper<OrderItemOption>;
  OrderPaymentCollection: ResolverTypeWrapper<'CASH_TO_DRIVER' | 'PREPAID_TO_PLATFORM'>;
  OrderPromotion: ResolverTypeWrapper<Omit<OrderPromotion, 'appliesTo'> & { appliesTo: ResolversTypes['PromotionAppliesTo'] }>;
  OrderSettlementLineItem: ResolverTypeWrapper<OrderSettlementLineItem>;
  OrderSettlementPreview: ResolverTypeWrapper<OrderSettlementPreview>;
  OrderStatus: ResolverTypeWrapper<'PENDING' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'AWAITING_APPROVAL'>;
  PeakHourAnalysis: ResolverTypeWrapper<PeakHourAnalysis>;
  PolygonPoint: ResolverTypeWrapper<PolygonPoint>;
  PolygonPointInput: PolygonPointInput;
  Product: ResolverTypeWrapper<Product>;
  ProductCard: ResolverTypeWrapper<ProductCard>;
  ProductCategory: ResolverTypeWrapper<ProductCategory>;
  ProductCategoryOrderInput: ProductCategoryOrderInput;
  ProductOrderInput: ProductOrderInput;
  ProductSubcategory: ResolverTypeWrapper<ProductSubcategory>;
  ProductVariantGroup: ResolverTypeWrapper<ProductVariantGroup>;
  Promotion: ResolverTypeWrapper<Omit<Promotion, 'assignedUsers' | 'creatorType' | 'eligibleBusinesses' | 'target' | 'type'> & { assignedUsers?: Maybe<Array<ResolversTypes['UserPromotion']>>, creatorType: ResolversTypes['PromotionCreatorType'], eligibleBusinesses?: Maybe<Array<ResolversTypes['Business']>>, target: ResolversTypes['PromotionTarget'], type: ResolversTypes['PromotionType'] }>;
  PromotionAnalyticsResult: ResolverTypeWrapper<Omit<PromotionAnalyticsResult, 'promotion'> & { promotion: ResolversTypes['Promotion'] }>;
  PromotionAppliesTo: ResolverTypeWrapper<'PRICE' | 'DELIVERY'>;
  PromotionCreatorType: ResolverTypeWrapper<'PLATFORM' | 'BUSINESS'>;
  PromotionResult: ResolverTypeWrapper<Omit<PromotionResult, 'promotions'> & { promotions: Array<ResolversTypes['ApplicablePromotion']> }>;
  PromotionTarget: ResolverTypeWrapper<'ALL_USERS' | 'SPECIFIC_USERS' | 'FIRST_ORDER' | 'CONDITIONAL'>;
  PromotionThreshold: ResolverTypeWrapper<PromotionThreshold>;
  PromotionType: ResolverTypeWrapper<'FIXED_AMOUNT' | 'PERCENTAGE' | 'FREE_DELIVERY' | 'SPEND_X_GET_FREE' | 'SPEND_X_PERCENT' | 'SPEND_X_FIXED'>;
  PromotionUsage: ResolverTypeWrapper<Omit<PromotionUsage, 'order' | 'promotion' | 'user'> & { order?: Maybe<ResolversTypes['Order']>, promotion?: Maybe<ResolversTypes['Promotion']>, user?: Maybe<ResolversTypes['User']> }>;
  PushTelemetryEvent: ResolverTypeWrapper<Omit<PushTelemetryEvent, 'appType' | 'eventType' | 'platform'> & { appType: ResolversTypes['DeviceAppType'], eventType: ResolversTypes['PushTelemetryEventType'], platform: ResolversTypes['DevicePlatform'] }>;
  PushTelemetryEventType: ResolverTypeWrapper<'RECEIVED' | 'OPENED' | 'ACTION_TAPPED' | 'TOKEN_REGISTERED' | 'TOKEN_REFRESHED' | 'TOKEN_UNREGISTERED'>;
  PushTelemetrySummary: ResolverTypeWrapper<PushTelemetrySummary>;
  Query: ResolverTypeWrapper<{}>;
  RegisterDeviceTokenInput: RegisterDeviceTokenInput;
  SendNotificationResult: ResolverTypeWrapper<SendNotificationResult>;
  SendPushNotificationInput: SendPushNotificationInput;
  SetDeliveryPricingTiersInput: SetDeliveryPricingTiersInput;
  SettleResult: ResolverTypeWrapper<Omit<SettleResult, 'direction' | 'payment' | 'remainderSettlement'> & { direction: ResolversTypes['SettlementPaymentDirection'], payment: ResolversTypes['SettlementPayment'], remainderSettlement?: Maybe<ResolversTypes['Settlement']> }>;
  Settlement: ResolverTypeWrapper<Omit<Settlement, 'business' | 'direction' | 'driver' | 'order' | 'rule' | 'settlementPayment' | 'sourcePayment' | 'status' | 'type'> & { business?: Maybe<ResolversTypes['Business']>, direction: ResolversTypes['SettlementDirection'], driver?: Maybe<ResolversTypes['User']>, order?: Maybe<ResolversTypes['Order']>, rule?: Maybe<ResolversTypes['SettlementRule']>, settlementPayment?: Maybe<ResolversTypes['SettlementPayment']>, sourcePayment?: Maybe<ResolversTypes['SettlementPayment']>, status: ResolversTypes['SettlementStatus'], type: ResolversTypes['SettlementType'] }>;
  SettlementAmountType: ResolverTypeWrapper<'FIXED' | 'PERCENT'>;
  SettlementBreakdownItem: ResolverTypeWrapper<Omit<SettlementBreakdownItem, 'direction'> & { direction: ResolversTypes['SettlementDirection'] }>;
  SettlementDirection: ResolverTypeWrapper<'RECEIVABLE' | 'PAYABLE'>;
  SettlementEntityType: ResolverTypeWrapper<'DRIVER' | 'BUSINESS'>;
  SettlementPayment: ResolverTypeWrapper<Omit<SettlementPayment, 'business' | 'createdBy' | 'direction' | 'driver' | 'entityType'> & { business?: Maybe<ResolversTypes['Business']>, createdBy?: Maybe<ResolversTypes['User']>, direction?: Maybe<ResolversTypes['SettlementPaymentDirection']>, driver?: Maybe<ResolversTypes['User']>, entityType: ResolversTypes['SettlementType'] }>;
  SettlementPaymentDirection: ResolverTypeWrapper<'ENTITY_TO_PLATFORM' | 'PLATFORM_TO_ENTITY'>;
  SettlementRequest: ResolverTypeWrapper<Omit<SettlementRequest, 'business' | 'driver' | 'entityType' | 'respondedBy' | 'settlementPayment' | 'status'> & { business?: Maybe<ResolversTypes['Business']>, driver?: Maybe<ResolversTypes['User']>, entityType: ResolversTypes['SettlementType'], respondedBy?: Maybe<ResolversTypes['User']>, settlementPayment?: Maybe<ResolversTypes['SettlementPayment']>, status: ResolversTypes['SettlementRequestStatus'] }>;
  SettlementRequestAction: ResolverTypeWrapper<'ACCEPT' | 'REJECT'>;
  SettlementRequestStatus: ResolverTypeWrapper<'PENDING' | 'ACCEPTED' | 'REJECTED'>;
  SettlementRule: ResolverTypeWrapper<Omit<SettlementRule, 'amountType' | 'business' | 'direction' | 'entityType' | 'promotion' | 'type'> & { amountType: ResolversTypes['SettlementAmountType'], business?: Maybe<ResolversTypes['Business']>, direction: ResolversTypes['SettlementDirection'], entityType: ResolversTypes['SettlementEntityType'], promotion?: Maybe<ResolversTypes['Promotion']>, type: ResolversTypes['SettlementRuleType'] }>;
  SettlementRuleFilterInput: SettlementRuleFilterInput;
  SettlementRuleScope: ResolverTypeWrapper<'GLOBAL' | 'BUSINESS' | 'PROMOTION' | 'BUSINESS_PROMOTION'>;
  SettlementRuleType: ResolverTypeWrapper<'ORDER_PRICE' | 'DELIVERY_PRICE'>;
  SettlementScenarioDefinition: ResolverTypeWrapper<SettlementScenarioDefinition>;
  SettlementScenarioHarnessResult: ResolverTypeWrapper<SettlementScenarioHarnessResult>;
  SettlementScenarioResult: ResolverTypeWrapper<SettlementScenarioResult>;
  SettlementStatus: ResolverTypeWrapper<'PENDING' | 'PAID' | 'OVERDUE' | 'DISPUTED' | 'CANCELLED'>;
  SettlementSummary: ResolverTypeWrapper<SettlementSummary>;
  SettlementType: ResolverTypeWrapper<'DRIVER' | 'BUSINESS'>;
  SignupStep: ResolverTypeWrapper<'INITIAL' | 'EMAIL_SENT' | 'EMAIL_VERIFIED' | 'PHONE_SENT' | 'COMPLETED'>;
  SignupStepResponse: ResolverTypeWrapper<Omit<SignupStepResponse, 'currentStep'> & { currentStep: ResolversTypes['SignupStep'] }>;
  StoreStatus: ResolverTypeWrapper<Omit<StoreStatus, 'bannerType'> & { bannerType: ResolversTypes['BannerType'] }>;
  SubmitPhoneNumberInput: SubmitPhoneNumberInput;
  Subscription: ResolverTypeWrapper<{}>;
  SubscriptionInput: SubscriptionInput;
  TelemetryCount: ResolverTypeWrapper<TelemetryCount>;
  TokenRefreshResponse: ResolverTypeWrapper<TokenRefreshResponse>;
  TrackPushTelemetryInput: TrackPushTelemetryInput;
  UpdateBannerInput: UpdateBannerInput;
  UpdateBusinessInput: UpdateBusinessInput;
  UpdateDeliveryPricingTierInput: UpdateDeliveryPricingTierInput;
  UpdateDeliveryZoneInput: UpdateDeliveryZoneInput;
  UpdateMyProfileInput: UpdateMyProfileInput;
  UpdateOptionGroupInput: UpdateOptionGroupInput;
  UpdateOptionInput: UpdateOptionInput;
  UpdateProductCategoryInput: UpdateProductCategoryInput;
  UpdateProductInput: UpdateProductInput;
  UpdateProductSubcategoryInput: UpdateProductSubcategoryInput;
  UpdatePromotionInput: UpdatePromotionInput;
  UpdateSettlementRuleInput: UpdateSettlementRuleInput;
  UpdateStoreStatusInput: UpdateStoreStatusInput;
  UpdateUserAddressInput: UpdateUserAddressInput;
  UpdateUserInput: UpdateUserInput;
  User: ResolverTypeWrapper<Omit<User, 'business' | 'driverConnection' | 'permissions' | 'preferredLanguage' | 'role' | 'signupStep'> & { business?: Maybe<ResolversTypes['Business']>, driverConnection?: Maybe<ResolversTypes['DriverConnection']>, permissions: Array<ResolversTypes['UserPermission']>, preferredLanguage: ResolversTypes['AppLanguage'], role: ResolversTypes['UserRole'], signupStep: ResolversTypes['SignupStep'] }>;
  UserAddress: ResolverTypeWrapper<UserAddress>;
  UserBehavior: ResolverTypeWrapper<UserBehavior>;
  UserPermission: ResolverTypeWrapper<'view_orders' | 'manage_orders' | 'view_products' | 'manage_products' | 'view_finances' | 'manage_settings' | 'view_analytics'>;
  UserPromoMetadata: ResolverTypeWrapper<Omit<UserPromoMetadata, 'user'> & { user?: Maybe<ResolversTypes['User']> }>;
  UserPromotion: ResolverTypeWrapper<Omit<UserPromotion, 'promotion' | 'user'> & { promotion?: Maybe<ResolversTypes['Promotion']>, user?: Maybe<ResolversTypes['User']> }>;
  UserRole: ResolverTypeWrapper<'CUSTOMER' | 'DRIVER' | 'SUPER_ADMIN' | 'ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_EMPLOYEE'>;
  VerifyEmailInput: VerifyEmailInput;
  VerifyPhoneInput: VerifyPhoneInput;
  WorkingHours: ResolverTypeWrapper<WorkingHours>;
  WorkingHoursInput: WorkingHoursInput;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AddUserAddressInput: AddUserAddressInput;
  String: Scalars['String']['output'];
  Float: Scalars['Float']['output'];
  Int: Scalars['Int']['output'];
  AdminPttSignal: AdminPttSignal;
  ID: Scalars['ID']['output'];
  AgoraRtcCredentials: AgoraRtcCredentials;
  ApplicablePromotion: ApplicablePromotion;
  Boolean: Scalars['Boolean']['output'];
  AssignPromotionToUserInput: AssignPromotionToUserInput;
  AudiencePreview: Omit<AudiencePreview, 'sampleUsers'> & { sampleUsers: Array<ResolversParentTypes['User']> };
  AuditLog: Omit<AuditLog, 'actor'> & { actor?: Maybe<ResolversParentTypes['User']> };
  AuditLogConnection: Omit<AuditLogConnection, 'logs'> & { logs: Array<ResolversParentTypes['AuditLog']> };
  AuthResponse: Omit<AuthResponse, 'user'> & { user: ResolversParentTypes['User'] };
  Banner: Omit<Banner, 'business' | 'promotion'> & { business?: Maybe<ResolversParentTypes['Business']>, promotion?: Maybe<ResolversParentTypes['Promotion']> };
  Business: Omit<Business, 'activePromotion'> & { activePromotion?: Maybe<ResolversParentTypes['BusinessPromotion']> };
  BusinessDayHours: BusinessDayHours;
  BusinessDayHoursInput: BusinessDayHoursInput;
  BusinessDeviceHealth: BusinessDeviceHealth;
  BusinessDeviceHeartbeatInput: BusinessDeviceHeartbeatInput;
  BusinessKPI: BusinessKPI;
  BusinessMessage: BusinessMessage;
  BusinessMessageThread: Omit<BusinessMessageThread, 'lastMessage'> & { lastMessage?: Maybe<ResolversParentTypes['BusinessMessage']> };
  BusinessMessageUser: BusinessMessageUser;
  BusinessPerformanceStat: BusinessPerformanceStat;
  BusinessPromotion: BusinessPromotion;
  CartContextInput: CartContextInput;
  CartItemInput: CartItemInput;
  CreateBannerInput: CreateBannerInput;
  CreateBusinessInput: CreateBusinessInput;
  CreateBusinessOwnerInput: CreateBusinessOwnerInput;
  CreateBusinessWithOwnerInput: CreateBusinessWithOwnerInput;
  CreateBusinessWithOwnerPayload: Omit<CreateBusinessWithOwnerPayload, 'business' | 'owner'> & { business: ResolversParentTypes['Business'], owner: ResolversParentTypes['User'] };
  CreateCampaignInput: CreateCampaignInput;
  CreateDeliveryPricingTierInput: CreateDeliveryPricingTierInput;
  CreateDeliveryZoneInput: CreateDeliveryZoneInput;
  CreateOptionGroupInput: CreateOptionGroupInput;
  CreateOptionInput: CreateOptionInput;
  CreateOrderChildItemInput: CreateOrderChildItemInput;
  CreateOrderInput: CreateOrderInput;
  CreateOrderItemInput: CreateOrderItemInput;
  CreateOrderItemOptionInput: CreateOrderItemOptionInput;
  CreateProductCategoryInput: CreateProductCategoryInput;
  CreateProductInput: CreateProductInput;
  CreateProductSubcategoryInput: CreateProductSubcategoryInput;
  CreateProductVariantGroupInput: CreateProductVariantGroupInput;
  CreatePromotionInput: CreatePromotionInput;
  CreateSettlementRuleInput: CreateSettlementRuleInput;
  CreateUserInput: CreateUserInput;
  Date: Scalars['Date']['output'];
  DateTime: Scalars['DateTime']['output'];
  DayOfWeekDistribution: DayOfWeekDistribution;
  DayVolume: DayVolume;
  DeliveryPriceResult: DeliveryPriceResult;
  DeliveryPricingConfig: DeliveryPricingConfig;
  DeliveryPricingTier: DeliveryPricingTier;
  DeliveryZone: DeliveryZone;
  DeliveryZoneMatch: DeliveryZoneMatch;
  DeviceToken: DeviceToken;
  DriverAuthResult: Omit<DriverAuthResult, 'driver'> & { driver: ResolversParentTypes['DriverBasicInfo'] };
  DriverBasicInfo: DriverBasicInfo;
  DriverCashSummary: DriverCashSummary;
  DriverConnection: DriverConnection;
  DriverDailyMetrics: DriverDailyMetrics;
  DriverHeartbeatResult: DriverHeartbeatResult;
  DriverKPI: DriverKPI;
  DriverLoginInput: DriverLoginInput;
  DriverMessage: DriverMessage;
  DriverMessageThread: Omit<DriverMessageThread, 'lastMessage'> & { lastMessage?: Maybe<ResolversParentTypes['DriverMessage']> };
  DriverMessageUser: DriverMessageUser;
  DriverOrderFinancials: DriverOrderFinancials;
  DriverPttSignal: DriverPttSignal;
  DriverRegisterInput: DriverRegisterInput;
  GetBannersFilter: GetBannersFilter;
  HourlyDistribution: HourlyDistribution;
  InitiateSignupInput: InitiateSignupInput;
  IssueRecoveryPromotionInput: IssueRecoveryPromotionInput;
  JSON: Scalars['JSON']['output'];
  Location: Location;
  LocationInput: LocationInput;
  LoginInput: LoginInput;
  Mutation: {};
  Notification: Notification;
  NotificationCampaign: Omit<NotificationCampaign, 'sender'> & { sender?: Maybe<ResolversParentTypes['User']> };
  OperationalKPIs: OperationalKPIs;
  Option: Option;
  OptionGroup: OptionGroup;
  Order: Omit<Order, 'businesses' | 'driver' | 'orderPromotions' | 'user'> & { businesses: Array<ResolversParentTypes['OrderBusiness']>, driver?: Maybe<ResolversParentTypes['User']>, orderPromotions?: Maybe<Array<ResolversParentTypes['OrderPromotion']>>, user?: Maybe<ResolversParentTypes['User']> };
  OrderBusiness: Omit<OrderBusiness, 'business'> & { business: ResolversParentTypes['Business'] };
  OrderConnection: Omit<OrderConnection, 'orders'> & { orders: Array<ResolversParentTypes['Order']> };
  OrderDriverLiveTracking: OrderDriverLiveTracking;
  OrderItem: OrderItem;
  OrderItemOption: OrderItemOption;
  OrderPromotion: OrderPromotion;
  OrderSettlementLineItem: OrderSettlementLineItem;
  OrderSettlementPreview: OrderSettlementPreview;
  PeakHourAnalysis: PeakHourAnalysis;
  PolygonPoint: PolygonPoint;
  PolygonPointInput: PolygonPointInput;
  Product: Product;
  ProductCard: ProductCard;
  ProductCategory: ProductCategory;
  ProductCategoryOrderInput: ProductCategoryOrderInput;
  ProductOrderInput: ProductOrderInput;
  ProductSubcategory: ProductSubcategory;
  ProductVariantGroup: ProductVariantGroup;
  Promotion: Omit<Promotion, 'assignedUsers' | 'eligibleBusinesses'> & { assignedUsers?: Maybe<Array<ResolversParentTypes['UserPromotion']>>, eligibleBusinesses?: Maybe<Array<ResolversParentTypes['Business']>> };
  PromotionAnalyticsResult: Omit<PromotionAnalyticsResult, 'promotion'> & { promotion: ResolversParentTypes['Promotion'] };
  PromotionResult: Omit<PromotionResult, 'promotions'> & { promotions: Array<ResolversParentTypes['ApplicablePromotion']> };
  PromotionThreshold: PromotionThreshold;
  PromotionUsage: Omit<PromotionUsage, 'order' | 'promotion' | 'user'> & { order?: Maybe<ResolversParentTypes['Order']>, promotion?: Maybe<ResolversParentTypes['Promotion']>, user?: Maybe<ResolversParentTypes['User']> };
  PushTelemetryEvent: PushTelemetryEvent;
  PushTelemetrySummary: PushTelemetrySummary;
  Query: {};
  RegisterDeviceTokenInput: RegisterDeviceTokenInput;
  SendNotificationResult: SendNotificationResult;
  SendPushNotificationInput: SendPushNotificationInput;
  SetDeliveryPricingTiersInput: SetDeliveryPricingTiersInput;
  SettleResult: Omit<SettleResult, 'payment' | 'remainderSettlement'> & { payment: ResolversParentTypes['SettlementPayment'], remainderSettlement?: Maybe<ResolversParentTypes['Settlement']> };
  Settlement: Omit<Settlement, 'business' | 'driver' | 'order' | 'rule' | 'settlementPayment' | 'sourcePayment'> & { business?: Maybe<ResolversParentTypes['Business']>, driver?: Maybe<ResolversParentTypes['User']>, order?: Maybe<ResolversParentTypes['Order']>, rule?: Maybe<ResolversParentTypes['SettlementRule']>, settlementPayment?: Maybe<ResolversParentTypes['SettlementPayment']>, sourcePayment?: Maybe<ResolversParentTypes['SettlementPayment']> };
  SettlementBreakdownItem: SettlementBreakdownItem;
  SettlementPayment: Omit<SettlementPayment, 'business' | 'createdBy' | 'driver'> & { business?: Maybe<ResolversParentTypes['Business']>, createdBy?: Maybe<ResolversParentTypes['User']>, driver?: Maybe<ResolversParentTypes['User']> };
  SettlementRequest: Omit<SettlementRequest, 'business' | 'driver' | 'respondedBy' | 'settlementPayment'> & { business?: Maybe<ResolversParentTypes['Business']>, driver?: Maybe<ResolversParentTypes['User']>, respondedBy?: Maybe<ResolversParentTypes['User']>, settlementPayment?: Maybe<ResolversParentTypes['SettlementPayment']> };
  SettlementRule: Omit<SettlementRule, 'business' | 'promotion'> & { business?: Maybe<ResolversParentTypes['Business']>, promotion?: Maybe<ResolversParentTypes['Promotion']> };
  SettlementRuleFilterInput: SettlementRuleFilterInput;
  SettlementScenarioDefinition: SettlementScenarioDefinition;
  SettlementScenarioHarnessResult: SettlementScenarioHarnessResult;
  SettlementScenarioResult: SettlementScenarioResult;
  SettlementSummary: SettlementSummary;
  SignupStepResponse: SignupStepResponse;
  StoreStatus: StoreStatus;
  SubmitPhoneNumberInput: SubmitPhoneNumberInput;
  Subscription: {};
  SubscriptionInput: SubscriptionInput;
  TelemetryCount: TelemetryCount;
  TokenRefreshResponse: TokenRefreshResponse;
  TrackPushTelemetryInput: TrackPushTelemetryInput;
  UpdateBannerInput: UpdateBannerInput;
  UpdateBusinessInput: UpdateBusinessInput;
  UpdateDeliveryPricingTierInput: UpdateDeliveryPricingTierInput;
  UpdateDeliveryZoneInput: UpdateDeliveryZoneInput;
  UpdateMyProfileInput: UpdateMyProfileInput;
  UpdateOptionGroupInput: UpdateOptionGroupInput;
  UpdateOptionInput: UpdateOptionInput;
  UpdateProductCategoryInput: UpdateProductCategoryInput;
  UpdateProductInput: UpdateProductInput;
  UpdateProductSubcategoryInput: UpdateProductSubcategoryInput;
  UpdatePromotionInput: UpdatePromotionInput;
  UpdateSettlementRuleInput: UpdateSettlementRuleInput;
  UpdateStoreStatusInput: UpdateStoreStatusInput;
  UpdateUserAddressInput: UpdateUserAddressInput;
  UpdateUserInput: UpdateUserInput;
  User: Omit<User, 'business' | 'driverConnection'> & { business?: Maybe<ResolversParentTypes['Business']>, driverConnection?: Maybe<ResolversParentTypes['DriverConnection']> };
  UserAddress: UserAddress;
  UserBehavior: UserBehavior;
  UserPromoMetadata: Omit<UserPromoMetadata, 'user'> & { user?: Maybe<ResolversParentTypes['User']> };
  UserPromotion: Omit<UserPromotion, 'promotion' | 'user'> & { promotion?: Maybe<ResolversParentTypes['Promotion']>, user?: Maybe<ResolversParentTypes['User']> };
  VerifyEmailInput: VerifyEmailInput;
  VerifyPhoneInput: VerifyPhoneInput;
  WorkingHours: WorkingHours;
  WorkingHoursInput: WorkingHoursInput;
};

export type skipAuthDirectiveArgs = { };

export type skipAuthDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = skipAuthDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ActionTypeResolvers = EnumResolverSignature<{ BUSINESS_APPROVED?: any, BUSINESS_CREATED?: any, BUSINESS_DELETED?: any, BUSINESS_REJECTED?: any, BUSINESS_UPDATED?: any, CATEGORY_CREATED?: any, CATEGORY_DELETED?: any, CATEGORY_UPDATED?: any, DRIVER_APPROVED?: any, DRIVER_CREATED?: any, DRIVER_REJECTED?: any, DRIVER_STATUS_CHANGED?: any, DRIVER_UPDATED?: any, ORDER_ASSIGNED?: any, ORDER_CANCELLED?: any, ORDER_CREATED?: any, ORDER_DELIVERED?: any, ORDER_STATUS_CHANGED?: any, ORDER_UPDATED?: any, PASSWORD_CHANGED?: any, PASSWORD_RESET?: any, PRODUCT_AVAILABILITY_CHANGED?: any, PRODUCT_CREATED?: any, PRODUCT_DELETED?: any, PRODUCT_PRICE_CHANGED?: any, PRODUCT_PUBLISHED?: any, PRODUCT_UNPUBLISHED?: any, PRODUCT_UPDATED?: any, SETTLEMENT_CREATED?: any, SETTLEMENT_PAID?: any, SETTLEMENT_PARTIAL_PAID?: any, SETTLEMENT_UNSETTLED?: any, SUBCATEGORY_CREATED?: any, SUBCATEGORY_DELETED?: any, SUBCATEGORY_UPDATED?: any, USER_CREATED?: any, USER_DELETED?: any, USER_LOGIN?: any, USER_LOGOUT?: any, USER_ROLE_CHANGED?: any, USER_UPDATED?: any }, ResolversTypes['ActionType']>;

export type ActorTypeResolvers = EnumResolverSignature<{ ADMIN?: any, BUSINESS?: any, CUSTOMER?: any, DRIVER?: any, SYSTEM?: any }, ResolversTypes['ActorType']>;

export type AdminPttSignalResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AdminPttSignal'] = ResolversParentTypes['AdminPttSignal']> = {
  action?: Resolver<ResolversTypes['DriverPttSignalAction'], ParentType, ContextType>;
  channelName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  driverId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AgoraRtcCredentialsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AgoraRtcCredentials'] = ResolversParentTypes['AgoraRtcCredentials']> = {
  appId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  channelName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  uid?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AgoraRtcRoleResolvers = EnumResolverSignature<{ PUBLISHER?: any, SUBSCRIBER?: any }, ResolversTypes['AgoraRtcRole']>;

export type AppLanguageResolvers = EnumResolverSignature<{ AL?: any, EN?: any }, ResolversTypes['AppLanguage']>;

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

export type ApprovalReasonResolvers = EnumResolverSignature<{ FIRST_ORDER?: any, HIGH_VALUE?: any, OUT_OF_ZONE?: any }, ResolversTypes['ApprovalReason']>;

export type AudiencePreviewResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AudiencePreview'] = ResolversParentTypes['AudiencePreview']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sampleUsers?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
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
  refreshToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BannerResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Banner'] = ResolversParentTypes['Banner']> = {
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType>;
  businessId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  displayContext?: Resolver<ResolversTypes['BannerDisplayContext'], ParentType, ContextType>;
  endsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  linkTarget?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  linkType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  mediaType?: Resolver<ResolversTypes['BannerMediaType'], ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  productId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  promotion?: Resolver<Maybe<ResolversTypes['Promotion']>, ParentType, ContextType>;
  promotionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  sortOrder?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  startsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  subtitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BannerDisplayContextResolvers = EnumResolverSignature<{ ALL?: any, BUSINESS?: any, CART?: any, CATEGORY?: any, HOME?: any, PRODUCT?: any }, ResolversTypes['BannerDisplayContext']>;

export type BannerMediaTypeResolvers = EnumResolverSignature<{ GIF?: any, IMAGE?: any, VIDEO?: any }, ResolversTypes['BannerMediaType']>;

export type BannerTypeResolvers = EnumResolverSignature<{ INFO?: any, SUCCESS?: any, WARNING?: any }, ResolversTypes['BannerType']>;

export type BusinessResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Business'] = ResolversParentTypes['Business']> = {
  activePromotion?: Resolver<Maybe<ResolversTypes['BusinessPromotion']>, ParentType, ContextType>;
  avgPrepTimeMinutes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  businessType?: Resolver<ResolversTypes['BusinessType'], ParentType, ContextType>;
  commissionPercentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  featuredSortOrder?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isFeatured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isOpen?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isTemporarilyClosed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  location?: Resolver<ResolversTypes['Location'], ParentType, ContextType>;
  minOrderAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  prepTimeOverrideMinutes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  schedule?: Resolver<Array<ResolversTypes['BusinessDayHours']>, ParentType, ContextType>;
  temporaryClosureReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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

export type BusinessDeviceHealthResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BusinessDeviceHealth'] = ResolversParentTypes['BusinessDeviceHealth']> = {
  appState?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  appVersion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  batteryLevel?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  businessId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deviceId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isCharging?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  lastHeartbeatAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  lastOrderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  lastOrderSignalAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastPushReceivedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  networkType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  onlineStatus?: Resolver<ResolversTypes['BusinessDeviceOnlineStatus'], ParentType, ContextType>;
  platform?: Resolver<ResolversTypes['DevicePlatform'], ParentType, ContextType>;
  receivingOrders?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  subscriptionAlive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessDeviceOnlineStatusResolvers = EnumResolverSignature<{ OFFLINE?: any, ONLINE?: any, STALE?: any }, ResolversTypes['BusinessDeviceOnlineStatus']>;

export type BusinessKPIResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BusinessKPI'] = ResolversParentTypes['BusinessKPI']> = {
  avgDriverWaitMin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  avgPrepTimeMin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  businessId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  businessName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  cancellationRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  completedOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fakeReadyCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fakeReadyRate?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  p90PrepTimeMin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  prematureReadyRate?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  prepOverrunRate?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  totalOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessMessageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BusinessMessage'] = ResolversParentTypes['BusinessMessage']> = {
  admin?: Resolver<Maybe<ResolversTypes['BusinessMessageUser']>, ParentType, ContextType>;
  adminId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  alertType?: Resolver<ResolversTypes['MessageAlertType'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  businessUser?: Resolver<Maybe<ResolversTypes['BusinessMessageUser']>, ParentType, ContextType>;
  businessUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  readAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  senderRole?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessMessageThreadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BusinessMessageThread'] = ResolversParentTypes['BusinessMessageThread']> = {
  businessUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  businessUserName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastMessage?: Resolver<Maybe<ResolversTypes['BusinessMessage']>, ParentType, ContextType>;
  unreadCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessMessageUserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BusinessMessageUser'] = ResolversParentTypes['BusinessMessageUser']> = {
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessPerformanceStatResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BusinessPerformanceStat'] = ResolversParentTypes['BusinessPerformanceStat']> = {
  avgOrderValue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  businessId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  businessName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isFeatured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalRevenue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessPromotionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BusinessPromotion'] = ResolversParentTypes['BusinessPromotion']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  discountValue?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  spendThreshold?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['PromotionType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusinessTypeResolvers = EnumResolverSignature<{ MARKET?: any, PHARMACY?: any, RESTAURANT?: any }, ResolversTypes['BusinessType']>;

export type CampaignStatusResolvers = EnumResolverSignature<{ DRAFT?: any, FAILED?: any, SENDING?: any, SENT?: any }, ResolversTypes['CampaignStatus']>;

export type CreateBusinessWithOwnerPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CreateBusinessWithOwnerPayload'] = ResolversParentTypes['CreateBusinessWithOwnerPayload']> = {
  business?: Resolver<ResolversTypes['Business'], ParentType, ContextType>;
  owner?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DayOfWeekDistributionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DayOfWeekDistribution'] = ResolversParentTypes['DayOfWeekDistribution']> = {
  dow?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  orderCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revenue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DayVolumeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DayVolume'] = ResolversParentTypes['DayVolume']> = {
  date?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  orderCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revenue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DeliveryPriceResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeliveryPriceResult'] = ResolversParentTypes['DeliveryPriceResult']> = {
  distanceKm?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  tierApplied?: Resolver<Maybe<ResolversTypes['DeliveryPricingTier']>, ParentType, ContextType>;
  zoneApplied?: Resolver<Maybe<ResolversTypes['DeliveryZoneMatch']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DeliveryPricingConfigResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeliveryPricingConfig'] = ResolversParentTypes['DeliveryPricingConfig']> = {
  tiers?: Resolver<Array<ResolversTypes['DeliveryPricingTier']>, ParentType, ContextType>;
  zones?: Resolver<Array<ResolversTypes['DeliveryZone']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DeliveryPricingTierResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeliveryPricingTier'] = ResolversParentTypes['DeliveryPricingTier']> = {
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  maxDistanceKm?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  minDistanceKm?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  sortOrder?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DeliveryZoneResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeliveryZone'] = ResolversParentTypes['DeliveryZone']> = {
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deliveryFee?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isServiceZone?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  polygon?: Resolver<Array<ResolversTypes['PolygonPoint']>, ParentType, ContextType>;
  sortOrder?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DeliveryZoneMatchResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeliveryZoneMatch'] = ResolversParentTypes['DeliveryZoneMatch']> = {
  deliveryFee?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DeviceAppTypeResolvers = EnumResolverSignature<{ ADMIN?: any, BUSINESS?: any, CUSTOMER?: any, DRIVER?: any }, ResolversTypes['DeviceAppType']>;

export type DevicePlatformResolvers = EnumResolverSignature<{ ANDROID?: any, IOS?: any }, ResolversTypes['DevicePlatform']>;

export type DeviceTokenResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeviceToken'] = ResolversParentTypes['DeviceToken']> = {
  appType?: Resolver<ResolversTypes['DeviceAppType'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deviceId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  platform?: Resolver<ResolversTypes['DevicePlatform'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverAuthResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverAuthResult'] = ResolversParentTypes['DriverAuthResult']> = {
  driver?: Resolver<ResolversTypes['DriverBasicInfo'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  refreshToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverBasicInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverBasicInfo'] = ResolversParentTypes['DriverBasicInfo']> = {
  connectionStatus?: Resolver<ResolversTypes['DriverConnectionStatus'], ParentType, ContextType>;
  driverLat?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  driverLng?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastHeartbeatAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  lastLocationUpdate?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  onlinePreference?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverCashSummaryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverCashSummary'] = ResolversParentTypes['DriverCashSummary']> = {
  cashCollected?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  netSettlement?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  platformOwesYou?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  takeHome?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalDeliveries?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  youOwePlatform?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverConnection'] = ResolversParentTypes['DriverConnection']> = {
  activeOrderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  batteryLevel?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  batteryOptIn?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  batteryUpdatedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  connectionStatus?: Resolver<ResolversTypes['DriverConnectionStatus'], ParentType, ContextType>;
  disconnectedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  etaUpdatedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  isCharging?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  lastHeartbeatAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  lastLocationUpdate?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  navigationPhase?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  onlinePreference?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  remainingEtaSeconds?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverConnectionStatusResolvers = EnumResolverSignature<{ CONNECTED?: any, DISCONNECTED?: any, LOST?: any, STALE?: any }, ResolversTypes['DriverConnectionStatus']>;

export type DriverCustomerNotificationKindResolvers = EnumResolverSignature<{ ARRIVED_WAITING?: any, ETA_LT_3_MIN?: any }, ResolversTypes['DriverCustomerNotificationKind']>;

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

export type DriverKPIResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverKPI'] = ResolversParentTypes['DriverKPI']> = {
  avgDeliveryTimeMin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  avgPickupTimeMin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  avgWaitAtPickupMin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  driverId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  driverName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalDeliveries?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverMessageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverMessage'] = ResolversParentTypes['DriverMessage']> = {
  admin?: Resolver<Maybe<ResolversTypes['DriverMessageUser']>, ParentType, ContextType>;
  adminId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  alertType?: Resolver<ResolversTypes['MessageAlertType'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  driver?: Resolver<Maybe<ResolversTypes['DriverMessageUser']>, ParentType, ContextType>;
  driverId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  readAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  senderRole?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverMessageThreadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverMessageThread'] = ResolversParentTypes['DriverMessageThread']> = {
  driverId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  driverName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastMessage?: Resolver<Maybe<ResolversTypes['DriverMessage']>, ParentType, ContextType>;
  unreadCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverMessageUserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverMessageUser'] = ResolversParentTypes['DriverMessageUser']> = {
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverOrderFinancialsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverOrderFinancials'] = ResolversParentTypes['DriverOrderFinancials']> = {
  amountToCollectFromCustomer?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  amountToRemitToPlatform?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  driverNetEarnings?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  paymentCollection?: Resolver<ResolversTypes['OrderPaymentCollection'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverPttSignalResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DriverPttSignal'] = ResolversParentTypes['DriverPttSignal']> = {
  action?: Resolver<ResolversTypes['DriverPttSignalAction'], ParentType, ContextType>;
  adminId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  channelName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  driverId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  muted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DriverPttSignalActionResolvers = EnumResolverSignature<{ MUTE?: any, STARTED?: any, STOPPED?: any, UNMUTE?: any }, ResolversTypes['DriverPttSignalAction']>;

export type EntityTypeResolvers = EnumResolverSignature<{ BUSINESS?: any, CATEGORY?: any, DELIVERY_ZONE?: any, DRIVER?: any, ORDER?: any, PRODUCT?: any, SETTLEMENT?: any, SUBCATEGORY?: any, USER?: any }, ResolversTypes['EntityType']>;

export type HourlyDistributionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['HourlyDistribution'] = ResolversParentTypes['HourlyDistribution']> = {
  avgDeliveryTimeMin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  hour?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  orderCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revenue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface JSONScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LocationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  latitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  longitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MessageAlertTypeResolvers = EnumResolverSignature<{ INFO?: any, URGENT?: any, WARNING?: any }, ResolversTypes['MessageAlertType']>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addUserAddress?: Resolver<ResolversTypes['UserAddress'], ParentType, ContextType, RequireFields<MutationaddUserAddressArgs, 'input'>>;
  adminCancelOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationadminCancelOrderArgs, 'id' | 'reason'>>;
  adminSendPttSignal?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationadminSendPttSignalArgs, 'action' | 'channelName' | 'driverIds'>>;
  adminSetDriverConnectionStatus?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationadminSetDriverConnectionStatusArgs, 'driverId' | 'status'>>;
  adminSetShiftDrivers?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationadminSetShiftDriversArgs, 'driverIds'>>;
  adminSimulateDriverHeartbeat?: Resolver<ResolversTypes['DriverHeartbeatResult'], ParentType, ContextType, RequireFields<MutationadminSimulateDriverHeartbeatArgs, 'driverId' | 'latitude' | 'longitude'>>;
  adminUpdateDriverLocation?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationadminUpdateDriverLocationArgs, 'driverId' | 'latitude' | 'longitude'>>;
  adminUpdateDriverSettings?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationadminUpdateDriverSettingsArgs, 'driverId'>>;
  approveOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationapproveOrderArgs, 'id'>>;
  assignDriverToOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationassignDriverToOrderArgs, 'id'>>;
  assignPromotionToUsers?: Resolver<Array<ResolversTypes['UserPromotion']>, ParentType, ContextType, RequireFields<MutationassignPromotionToUsersArgs, 'input'>>;
  backfillSettlementsForDeliveredOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  businessDeviceHeartbeat?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationbusinessDeviceHeartbeatArgs, 'input'>>;
  businessDeviceOrderSignal?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationbusinessDeviceOrderSignalArgs, 'deviceId'>>;
  cancelOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationcancelOrderArgs, 'id'>>;
  changeMyPassword?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationchangeMyPasswordArgs, 'currentPassword' | 'newPassword'>>;
  createBanner?: Resolver<ResolversTypes['Banner'], ParentType, ContextType, RequireFields<MutationcreateBannerArgs, 'input'>>;
  createBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationcreateBusinessArgs, 'input'>>;
  createBusinessWithOwner?: Resolver<ResolversTypes['CreateBusinessWithOwnerPayload'], ParentType, ContextType, RequireFields<MutationcreateBusinessWithOwnerArgs, 'input'>>;
  createCampaign?: Resolver<ResolversTypes['NotificationCampaign'], ParentType, ContextType, RequireFields<MutationcreateCampaignArgs, 'input'>>;
  createDeliveryPricingTier?: Resolver<ResolversTypes['DeliveryPricingTier'], ParentType, ContextType, RequireFields<MutationcreateDeliveryPricingTierArgs, 'input'>>;
  createDeliveryZone?: Resolver<ResolversTypes['DeliveryZone'], ParentType, ContextType, RequireFields<MutationcreateDeliveryZoneArgs, 'input'>>;
  createOption?: Resolver<ResolversTypes['Option'], ParentType, ContextType, RequireFields<MutationcreateOptionArgs, 'input' | 'optionGroupId'>>;
  createOptionGroup?: Resolver<ResolversTypes['OptionGroup'], ParentType, ContextType, RequireFields<MutationcreateOptionGroupArgs, 'input'>>;
  createOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationcreateOrderArgs, 'input'>>;
  createProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationcreateProductArgs, 'input'>>;
  createProductCategory?: Resolver<ResolversTypes['ProductCategory'], ParentType, ContextType, RequireFields<MutationcreateProductCategoryArgs, 'input'>>;
  createProductSubcategory?: Resolver<ResolversTypes['ProductSubcategory'], ParentType, ContextType, RequireFields<MutationcreateProductSubcategoryArgs, 'input'>>;
  createProductVariantGroup?: Resolver<ResolversTypes['ProductVariantGroup'], ParentType, ContextType, RequireFields<MutationcreateProductVariantGroupArgs, 'input'>>;
  createPromotion?: Resolver<ResolversTypes['Promotion'], ParentType, ContextType, RequireFields<MutationcreatePromotionArgs, 'input'>>;
  createSettlementRequest?: Resolver<ResolversTypes['SettlementRequest'], ParentType, ContextType, RequireFields<MutationcreateSettlementRequestArgs, 'amount'>>;
  createSettlementRule?: Resolver<ResolversTypes['SettlementRule'], ParentType, ContextType, RequireFields<MutationcreateSettlementRuleArgs, 'input'>>;
  createTestOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  createUser?: Resolver<ResolversTypes['AuthResponse'], ParentType, ContextType, RequireFields<MutationcreateUserArgs, 'input'>>;
  deleteBanner?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteBannerArgs, 'id'>>;
  deleteBusiness?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteBusinessArgs, 'id'>>;
  deleteCampaign?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteCampaignArgs, 'id'>>;
  deleteDeliveryPricingTier?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteDeliveryPricingTierArgs, 'id'>>;
  deleteDeliveryZone?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteDeliveryZoneArgs, 'id'>>;
  deleteMyAccount?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deleteOption?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteOptionArgs, 'id'>>;
  deleteOptionGroup?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteOptionGroupArgs, 'id'>>;
  deleteProduct?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductArgs, 'id'>>;
  deleteProductCategory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductCategoryArgs, 'id'>>;
  deleteProductSubcategory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductSubcategoryArgs, 'id'>>;
  deleteProductVariantGroup?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteProductVariantGroupArgs, 'id'>>;
  deletePromotion?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeletePromotionArgs, 'id'>>;
  deleteSettlementRule?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteSettlementRuleArgs, 'id'>>;
  deleteUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteUserArgs, 'id'>>;
  deleteUserAddress?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteUserAddressArgs, 'id'>>;
  driverHeartbeat?: Resolver<ResolversTypes['DriverHeartbeatResult'], ParentType, ContextType, RequireFields<MutationdriverHeartbeatArgs, 'latitude' | 'longitude'>>;
  driverLogin?: Resolver<ResolversTypes['DriverAuthResult'], ParentType, ContextType, RequireFields<MutationdriverLoginArgs, 'input'>>;
  driverNotifyCustomer?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdriverNotifyCustomerArgs, 'kind' | 'orderId'>>;
  driverRegister?: Resolver<ResolversTypes['DriverAuthResult'], ParentType, ContextType, RequireFields<MutationdriverRegisterArgs, 'input'>>;
  driverSendPttSignal?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdriverSendPttSignalArgs, 'action' | 'channelName'>>;
  driverUpdateBatteryStatus?: Resolver<ResolversTypes['DriverConnection'], ParentType, ContextType, RequireFields<MutationdriverUpdateBatteryStatusArgs, 'level' | 'optIn'>>;
  grantFreeDelivery?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationgrantFreeDeliveryArgs, 'orderId' | 'userId'>>;
  initiateSignup?: Resolver<ResolversTypes['AuthResponse'], ParentType, ContextType, RequireFields<MutationinitiateSignupArgs, 'input'>>;
  issueRecoveryPromotion?: Resolver<Array<ResolversTypes['UserPromotion']>, ParentType, ContextType, RequireFields<MutationissueRecoveryPromotionArgs, 'input'>>;
  login?: Resolver<ResolversTypes['AuthResponse'], ParentType, ContextType, RequireFields<MutationloginArgs, 'input'>>;
  logoutAllSessions?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  logoutCurrentSession?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationlogoutCurrentSessionArgs, 'refreshToken'>>;
  markBusinessMessagesRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationmarkBusinessMessagesReadArgs, 'otherUserId'>>;
  markDriverMessagesRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationmarkDriverMessagesReadArgs, 'otherUserId'>>;
  markFirstOrderUsed?: Resolver<ResolversTypes['UserPromoMetadata'], ParentType, ContextType, RequireFields<MutationmarkFirstOrderUsedArgs, 'userId'>>;
  markSettlementAsPaid?: Resolver<ResolversTypes['Settlement'], ParentType, ContextType, RequireFields<MutationmarkSettlementAsPaidArgs, 'settlementId'>>;
  markSettlementAsPartiallyPaid?: Resolver<ResolversTypes['Settlement'], ParentType, ContextType, RequireFields<MutationmarkSettlementAsPartiallyPaidArgs, 'amount' | 'settlementId'>>;
  markSettlementsAsPaid?: Resolver<Array<ResolversTypes['Settlement']>, ParentType, ContextType, RequireFields<MutationmarkSettlementsAsPaidArgs, 'ids'>>;
  refreshToken?: Resolver<ResolversTypes['TokenRefreshResponse'], ParentType, ContextType, RequireFields<MutationrefreshTokenArgs, 'refreshToken'>>;
  registerDeviceToken?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationregisterDeviceTokenArgs, 'input'>>;
  registerLiveActivityToken?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationregisterLiveActivityTokenArgs, 'activityId' | 'orderId' | 'token'>>;
  removeUserFromPromotion?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationremoveUserFromPromotionArgs, 'promotionId' | 'userId'>>;
  replyToBusinessMessage?: Resolver<ResolversTypes['BusinessMessage'], ParentType, ContextType, RequireFields<MutationreplyToBusinessMessageArgs, 'adminId' | 'body'>>;
  replyToDriverMessage?: Resolver<ResolversTypes['DriverMessage'], ParentType, ContextType, RequireFields<MutationreplyToDriverMessageArgs, 'adminId' | 'body'>>;
  requestPasswordReset?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationrequestPasswordResetArgs, 'email'>>;
  resendEmailVerification?: Resolver<ResolversTypes['SignupStepResponse'], ParentType, ContextType>;
  resetPassword?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationresetPasswordArgs, 'newPassword' | 'token'>>;
  respondToSettlementRequest?: Resolver<ResolversTypes['SettlementRequest'], ParentType, ContextType, RequireFields<MutationrespondToSettlementRequestArgs, 'action' | 'requestId'>>;
  runSettlementScenarioHarness?: Resolver<ResolversTypes['SettlementScenarioHarnessResult'], ParentType, ContextType, Partial<MutationrunSettlementScenarioHarnessArgs>>;
  sendBusinessMessage?: Resolver<ResolversTypes['BusinessMessage'], ParentType, ContextType, RequireFields<MutationsendBusinessMessageArgs, 'alertType' | 'body' | 'businessUserId'>>;
  sendCampaign?: Resolver<ResolversTypes['NotificationCampaign'], ParentType, ContextType, RequireFields<MutationsendCampaignArgs, 'id'>>;
  sendDriverMessage?: Resolver<ResolversTypes['DriverMessage'], ParentType, ContextType, RequireFields<MutationsendDriverMessageArgs, 'alertType' | 'body' | 'driverId'>>;
  sendPushNotification?: Resolver<ResolversTypes['SendNotificationResult'], ParentType, ContextType, RequireFields<MutationsendPushNotificationArgs, 'input'>>;
  setBusinessFeatured?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationsetBusinessFeaturedArgs, 'id' | 'isFeatured'>>;
  setBusinessSchedule?: Resolver<Array<ResolversTypes['BusinessDayHours']>, ParentType, ContextType, RequireFields<MutationsetBusinessScheduleArgs, 'businessId' | 'schedule'>>;
  setDefaultAddress?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationsetDefaultAddressArgs, 'id'>>;
  setDeliveryPricingTiers?: Resolver<Array<ResolversTypes['DeliveryPricingTier']>, ParentType, ContextType, RequireFields<MutationsetDeliveryPricingTiersArgs, 'input'>>;
  setMyEmailOptOut?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationsetMyEmailOptOutArgs, 'optOut'>>;
  setMyPreferredLanguage?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationsetMyPreferredLanguageArgs, 'language'>>;
  setOrderAdminNote?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationsetOrderAdminNoteArgs, 'id'>>;
  setUserPermissions?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationsetUserPermissionsArgs, 'permissions' | 'userId'>>;
  settleWithBusiness?: Resolver<ResolversTypes['SettleResult'], ParentType, ContextType, RequireFields<MutationsettleWithBusinessArgs, 'amount' | 'businessId'>>;
  settleWithDriver?: Resolver<ResolversTypes['SettleResult'], ParentType, ContextType, RequireFields<MutationsettleWithDriverArgs, 'driverId'>>;
  startPreparing?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationstartPreparingArgs, 'id' | 'preparationMinutes'>>;
  submitPhoneNumber?: Resolver<ResolversTypes['SignupStepResponse'], ParentType, ContextType, RequireFields<MutationsubmitPhoneNumberArgs, 'input'>>;
  trackPushTelemetry?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationtrackPushTelemetryArgs, 'input'>>;
  unregisterDeviceToken?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationunregisterDeviceTokenArgs, 'token'>>;
  unsettleSettlement?: Resolver<ResolversTypes['Settlement'], ParentType, ContextType, RequireFields<MutationunsettleSettlementArgs, 'settlementId'>>;
  updateBanner?: Resolver<ResolversTypes['Banner'], ParentType, ContextType, RequireFields<MutationupdateBannerArgs, 'id' | 'input'>>;
  updateBannerOrder?: Resolver<ResolversTypes['Banner'], ParentType, ContextType, RequireFields<MutationupdateBannerOrderArgs, 'bannerId' | 'newSortOrder'>>;
  updateBusiness?: Resolver<ResolversTypes['Business'], ParentType, ContextType, RequireFields<MutationupdateBusinessArgs, 'id' | 'input'>>;
  updateDeliveryPricingTier?: Resolver<ResolversTypes['DeliveryPricingTier'], ParentType, ContextType, RequireFields<MutationupdateDeliveryPricingTierArgs, 'id' | 'input'>>;
  updateDeliveryZone?: Resolver<ResolversTypes['DeliveryZone'], ParentType, ContextType, RequireFields<MutationupdateDeliveryZoneArgs, 'id' | 'input'>>;
  updateDriverLocation?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateDriverLocationArgs, 'latitude' | 'longitude'>>;
  updateDriverOnlineStatus?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateDriverOnlineStatusArgs, 'isOnline'>>;
  updateMyProfile?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateMyProfileArgs, 'input'>>;
  updateOption?: Resolver<ResolversTypes['Option'], ParentType, ContextType, RequireFields<MutationupdateOptionArgs, 'id' | 'input'>>;
  updateOptionGroup?: Resolver<ResolversTypes['OptionGroup'], ParentType, ContextType, RequireFields<MutationupdateOptionGroupArgs, 'id' | 'input'>>;
  updateOrderStatus?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationupdateOrderStatusArgs, 'id' | 'status'>>;
  updatePreparationTime?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationupdatePreparationTimeArgs, 'id' | 'preparationMinutes'>>;
  updateProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationupdateProductArgs, 'id' | 'input'>>;
  updateProductCategoriesOrder?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationupdateProductCategoriesOrderArgs, 'businessId' | 'categories'>>;
  updateProductCategory?: Resolver<ResolversTypes['ProductCategory'], ParentType, ContextType, RequireFields<MutationupdateProductCategoryArgs, 'id' | 'input'>>;
  updateProductSubcategory?: Resolver<ResolversTypes['ProductSubcategory'], ParentType, ContextType, RequireFields<MutationupdateProductSubcategoryArgs, 'id' | 'input'>>;
  updateProductsOrder?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationupdateProductsOrderArgs, 'businessId' | 'products'>>;
  updatePromotion?: Resolver<ResolversTypes['Promotion'], ParentType, ContextType, RequireFields<MutationupdatePromotionArgs, 'input'>>;
  updateSettlementRule?: Resolver<ResolversTypes['SettlementRule'], ParentType, ContextType, RequireFields<MutationupdateSettlementRuleArgs, 'id' | 'input'>>;
  updateStoreStatus?: Resolver<ResolversTypes['StoreStatus'], ParentType, ContextType, RequireFields<MutationupdateStoreStatusArgs, 'input'>>;
  updateUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateUserArgs, 'input'>>;
  updateUserAddress?: Resolver<ResolversTypes['UserAddress'], ParentType, ContextType, RequireFields<MutationupdateUserAddressArgs, 'input'>>;
  updateUserNote?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationupdateUserNoteArgs, 'userId'>>;
  verifyEmail?: Resolver<ResolversTypes['SignupStepResponse'], ParentType, ContextType, RequireFields<MutationverifyEmailArgs, 'input'>>;
  verifyPhone?: Resolver<ResolversTypes['SignupStepResponse'], ParentType, ContextType, RequireFields<MutationverifyPhoneArgs, 'input'>>;
};

export type NotificationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Notification'] = ResolversParentTypes['Notification']> = {
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  campaignId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  data?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sentAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['NotificationType'], ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NotificationCampaignResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NotificationCampaign'] = ResolversParentTypes['NotificationCampaign']> = {
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  bodyAl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  category?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  data?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  failedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  query?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  relevanceScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  sender?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  sentAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  sentBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  sentCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CampaignStatus'], ParentType, ContextType>;
  targetCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  timeSensitive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  titleAl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NotificationTypeResolvers = EnumResolverSignature<{ ADMIN_ALERT?: any, ORDER_ASSIGNED?: any, ORDER_STATUS?: any, PROMOTIONAL?: any }, ResolversTypes['NotificationType']>;

export type OperationalKPIsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OperationalKPIs'] = ResolversParentTypes['OperationalKPIs']> = {
  aov?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  avgDeliveryTimeMin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  avgDriverWaitAtPickupMin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  avgPrepTimeMin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  cancellationRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  cancelledOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  dailyVolume?: Resolver<Array<ResolversTypes['DayVolume']>, ParentType, ContextType>;
  fakeReadyRate?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  gmv?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  prepOverrunRate?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  totalOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Option'] = ResolversParentTypes['Option']> = {
  displayOrder?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  extraPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  linkedProduct?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  linkedProductId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  optionGroupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OptionGroupResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OptionGroup'] = ResolversParentTypes['OptionGroup']> = {
  displayOrder?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  maxSelections?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  minSelections?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  options?: Resolver<Array<ResolversTypes['Option']>, ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Order'] = ResolversParentTypes['Order']> = {
  adminNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  approvalReasons?: Resolver<Maybe<Array<ResolversTypes['ApprovalReason']>>, ParentType, ContextType>;
  businessId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  businesses?: Resolver<Array<ResolversTypes['OrderBusiness']>, ParentType, ContextType>;
  cancellationReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  cancelledAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  deliveredAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  deliveryPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  displayId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  driver?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  driverArrivedAtPickup?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  driverAssignedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  driverNotes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dropOffLocation?: Resolver<ResolversTypes['Location'], ParentType, ContextType>;
  estimatedReadyAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  locationFlagged?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  needsApproval?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  orderDate?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  orderPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  orderPromotions?: Resolver<Maybe<Array<ResolversTypes['OrderPromotion']>>, ParentType, ContextType>;
  originalPrice?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  outForDeliveryAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  paymentCollection?: Resolver<ResolversTypes['OrderPaymentCollection'], ParentType, ContextType>;
  pickupLocations?: Resolver<Array<ResolversTypes['Location']>, ParentType, ContextType>;
  preparationMinutes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  preparingAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  prioritySurcharge?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  readyAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  settlementPreview?: Resolver<Maybe<ResolversTypes['OrderSettlementPreview']>, ParentType, ContextType>;
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

export type OrderConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderConnection'] = ResolversParentTypes['OrderConnection']> = {
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  orders?: Resolver<Array<ResolversTypes['Order']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderDriverLiveTrackingResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderDriverLiveTracking'] = ResolversParentTypes['OrderDriverLiveTracking']> = {
  driverId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  etaUpdatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  latitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  longitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  navigationPhase?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  remainingEtaSeconds?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderItem'] = ResolversParentTypes['OrderItem']> = {
  childItems?: Resolver<Array<ResolversTypes['OrderItem']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentOrderItemId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  selectedOptions?: Resolver<Array<ResolversTypes['OrderItemOption']>, ParentType, ContextType>;
  unitPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderItemOptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderItemOption'] = ResolversParentTypes['OrderItemOption']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  optionGroupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  optionGroupName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  optionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  optionName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priceAtOrder?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderPaymentCollectionResolvers = EnumResolverSignature<{ CASH_TO_DRIVER?: any, PREPAID_TO_PLATFORM?: any }, ResolversTypes['OrderPaymentCollection']>;

export type OrderPromotionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderPromotion'] = ResolversParentTypes['OrderPromotion']> = {
  appliesTo?: Resolver<ResolversTypes['PromotionAppliesTo'], ParentType, ContextType>;
  discountAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  promoCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  promotionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderSettlementLineItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderSettlementLineItem'] = ResolversParentTypes['OrderSettlementLineItem']> = {
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  businessId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  driverId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  reason?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  ruleId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderSettlementPreviewResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderSettlementPreview'] = ResolversParentTypes['OrderSettlementPreview']> = {
  driverAssigned?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lineItems?: Resolver<Array<ResolversTypes['OrderSettlementLineItem']>, ParentType, ContextType>;
  netMargin?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalPayable?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalReceivable?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderStatusResolvers = EnumResolverSignature<{ AWAITING_APPROVAL?: any, CANCELLED?: any, DELIVERED?: any, OUT_FOR_DELIVERY?: any, PENDING?: any, PREPARING?: any, READY?: any }, ResolversTypes['OrderStatus']>;

export type PeakHourAnalysisResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PeakHourAnalysis'] = ResolversParentTypes['PeakHourAnalysis']> = {
  byDayOfWeek?: Resolver<Array<ResolversTypes['DayOfWeekDistribution']>, ParentType, ContextType>;
  hourly?: Resolver<Array<ResolversTypes['HourlyDistribution']>, ParentType, ContextType>;
  peakDow?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  peakHour?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PolygonPointResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PolygonPoint'] = ResolversParentTypes['PolygonPoint']> = {
  lat?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  lng?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProductResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = {
  businessId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  categoryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  effectivePrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isAvailable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isOffer?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isOnSale?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  markupPrice?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nightMarkedupPrice?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  optionGroups?: Resolver<Array<ResolversTypes['OptionGroup']>, ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  saleDiscountPercentage?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  sortOrder?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subcategoryId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  variantGroup?: Resolver<Maybe<ResolversTypes['ProductVariantGroup']>, ParentType, ContextType>;
  variantGroupId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  variants?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProductCardResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProductCard'] = ResolversParentTypes['ProductCard']> = {
  basePrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  hasOptionGroups?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isOffer?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  variants?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProductCategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProductCategory'] = ResolversParentTypes['ProductCategory']> = {
  businessId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sortOrder?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type ProductVariantGroupResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProductVariantGroup'] = ResolversParentTypes['ProductVariantGroup']> = {
  businessId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PromotionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Promotion'] = ResolversParentTypes['Promotion']> = {
  assignedUsers?: Resolver<Maybe<Array<ResolversTypes['UserPromotion']>>, ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  creatorId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  creatorType?: Resolver<ResolversTypes['PromotionCreatorType'], ParentType, ContextType>;
  currentGlobalUsage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  discountValue?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  eligibleBusinesses?: Resolver<Maybe<Array<ResolversTypes['Business']>>, ParentType, ContextType>;
  endsAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isRecovery?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isStackable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  maxDiscountCap?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  maxGlobalUsage?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  maxUsagePerUser?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  minOrderAmount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  orderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
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

export type PromotionCreatorTypeResolvers = EnumResolverSignature<{ BUSINESS?: any, PLATFORM?: any }, ResolversTypes['PromotionCreatorType']>;

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

export type PromotionTypeResolvers = EnumResolverSignature<{ FIXED_AMOUNT?: any, FREE_DELIVERY?: any, PERCENTAGE?: any, SPEND_X_FIXED?: any, SPEND_X_GET_FREE?: any, SPEND_X_PERCENT?: any }, ResolversTypes['PromotionType']>;

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

export type PushTelemetryEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PushTelemetryEvent'] = ResolversParentTypes['PushTelemetryEvent']> = {
  actionId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  appType?: Resolver<ResolversTypes['DeviceAppType'], ParentType, ContextType>;
  campaignId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deviceId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  eventType?: Resolver<ResolversTypes['PushTelemetryEventType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  notificationBody?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  notificationTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  orderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  platform?: Resolver<ResolversTypes['DevicePlatform'], ParentType, ContextType>;
  token?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PushTelemetryEventTypeResolvers = EnumResolverSignature<{ ACTION_TAPPED?: any, OPENED?: any, RECEIVED?: any, TOKEN_REFRESHED?: any, TOKEN_REGISTERED?: any, TOKEN_UNREGISTERED?: any }, ResolversTypes['PushTelemetryEventType']>;

export type PushTelemetrySummaryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PushTelemetrySummary'] = ResolversParentTypes['PushTelemetrySummary']> = {
  byAppType?: Resolver<Array<ResolversTypes['TelemetryCount']>, ParentType, ContextType>;
  byEvent?: Resolver<Array<ResolversTypes['TelemetryCount']>, ParentType, ContextType>;
  byPlatform?: Resolver<Array<ResolversTypes['TelemetryCount']>, ParentType, ContextType>;
  totalEvents?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  auditLog?: Resolver<Maybe<ResolversTypes['AuditLog']>, ParentType, ContextType, RequireFields<QueryauditLogArgs, 'id'>>;
  auditLogs?: Resolver<ResolversTypes['AuditLogConnection'], ParentType, ContextType, Partial<QueryauditLogsArgs>>;
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType, RequireFields<QuerybusinessArgs, 'id'>>;
  businessBalance?: Resolver<ResolversTypes['SettlementSummary'], ParentType, ContextType, RequireFields<QuerybusinessBalanceArgs, 'businessId'>>;
  businessDeviceHealth?: Resolver<Array<ResolversTypes['BusinessDeviceHealth']>, ParentType, ContextType, Partial<QuerybusinessDeviceHealthArgs>>;
  businessKPIs?: Resolver<Array<ResolversTypes['BusinessKPI']>, ParentType, ContextType, RequireFields<QuerybusinessKPIsArgs, 'endDate' | 'startDate'>>;
  businessMessageThreads?: Resolver<Array<ResolversTypes['BusinessMessageThread']>, ParentType, ContextType>;
  businessMessages?: Resolver<Array<ResolversTypes['BusinessMessage']>, ParentType, ContextType, RequireFields<QuerybusinessMessagesArgs, 'businessUserId'>>;
  businessPerformanceStats?: Resolver<Array<ResolversTypes['BusinessPerformanceStat']>, ParentType, ContextType, Partial<QuerybusinessPerformanceStatsArgs>>;
  businesses?: Resolver<Array<ResolversTypes['Business']>, ParentType, ContextType>;
  calculateDeliveryPrice?: Resolver<ResolversTypes['DeliveryPriceResult'], ParentType, ContextType, RequireFields<QuerycalculateDeliveryPriceArgs, 'businessId' | 'dropoffLat' | 'dropoffLng'>>;
  cancelledOrders?: Resolver<Array<ResolversTypes['Order']>, ParentType, ContextType, Partial<QuerycancelledOrdersArgs>>;
  deliveryPricingConfig?: Resolver<ResolversTypes['DeliveryPricingConfig'], ParentType, ContextType>;
  deliveryPricingTiers?: Resolver<Array<ResolversTypes['DeliveryPricingTier']>, ParentType, ContextType>;
  deliveryZones?: Resolver<Array<ResolversTypes['DeliveryZone']>, ParentType, ContextType>;
  deviceTokens?: Resolver<Array<ResolversTypes['DeviceToken']>, ParentType, ContextType, Partial<QuerydeviceTokensArgs>>;
  driverBalance?: Resolver<ResolversTypes['SettlementSummary'], ParentType, ContextType, RequireFields<QuerydriverBalanceArgs, 'driverId'>>;
  driverCashSummary?: Resolver<ResolversTypes['DriverCashSummary'], ParentType, ContextType, Partial<QuerydriverCashSummaryArgs>>;
  driverKPIs?: Resolver<Array<ResolversTypes['DriverKPI']>, ParentType, ContextType, RequireFields<QuerydriverKPIsArgs, 'endDate' | 'startDate'>>;
  driverMessageThreads?: Resolver<Array<ResolversTypes['DriverMessageThread']>, ParentType, ContextType>;
  driverMessages?: Resolver<Array<ResolversTypes['DriverMessage']>, ParentType, ContextType, RequireFields<QuerydriverMessagesArgs, 'driverId'>>;
  driverOrderFinancials?: Resolver<Maybe<ResolversTypes['DriverOrderFinancials']>, ParentType, ContextType, RequireFields<QuerydriverOrderFinancialsArgs, 'orderId'>>;
  drivers?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  featuredBusinesses?: Resolver<Array<ResolversTypes['Business']>, ParentType, ContextType>;
  getActiveBanners?: Resolver<Array<ResolversTypes['Banner']>, ParentType, ContextType, Partial<QuerygetActiveBannersArgs>>;
  getActiveGlobalPromotions?: Resolver<Array<ResolversTypes['Promotion']>, ParentType, ContextType>;
  getAgoraRtcCredentials?: Resolver<ResolversTypes['AgoraRtcCredentials'], ParentType, ContextType, RequireFields<QuerygetAgoraRtcCredentialsArgs, 'channelName' | 'role'>>;
  getAllPromotions?: Resolver<Array<ResolversTypes['Promotion']>, ParentType, ContextType, Partial<QuerygetAllPromotionsArgs>>;
  getApplicablePromotions?: Resolver<Array<ResolversTypes['ApplicablePromotion']>, ParentType, ContextType, RequireFields<QuerygetApplicablePromotionsArgs, 'cart'>>;
  getBanner?: Resolver<Maybe<ResolversTypes['Banner']>, ParentType, ContextType, RequireFields<QuerygetBannerArgs, 'id'>>;
  getBanners?: Resolver<Array<ResolversTypes['Banner']>, ParentType, ContextType, Partial<QuerygetBannersArgs>>;
  getPromotion?: Resolver<Maybe<ResolversTypes['Promotion']>, ParentType, ContextType, RequireFields<QuerygetPromotionArgs, 'id'>>;
  getPromotionAnalytics?: Resolver<ResolversTypes['PromotionAnalyticsResult'], ParentType, ContextType, RequireFields<QuerygetPromotionAnalyticsArgs, 'promotionId'>>;
  getPromotionThresholds?: Resolver<Array<ResolversTypes['PromotionThreshold']>, ParentType, ContextType, RequireFields<QuerygetPromotionThresholdsArgs, 'cart'>>;
  getPromotionUsage?: Resolver<Array<ResolversTypes['PromotionUsage']>, ParentType, ContextType, RequireFields<QuerygetPromotionUsageArgs, 'promotionId'>>;
  getRecoveryPromotions?: Resolver<Array<ResolversTypes['Promotion']>, ParentType, ContextType>;
  getStoreStatus?: Resolver<ResolversTypes['StoreStatus'], ParentType, ContextType, Partial<QuerygetStoreStatusArgs>>;
  getUserPromoMetadata?: Resolver<Maybe<ResolversTypes['UserPromoMetadata']>, ParentType, ContextType, RequireFields<QuerygetUserPromoMetadataArgs, 'userId'>>;
  getUserPromotions?: Resolver<Array<ResolversTypes['UserPromotion']>, ParentType, ContextType, RequireFields<QuerygetUserPromotionsArgs, 'userId'>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  myAddresses?: Resolver<Array<ResolversTypes['UserAddress']>, ParentType, ContextType>;
  myBehavior?: Resolver<Maybe<ResolversTypes['UserBehavior']>, ParentType, ContextType>;
  myBusinessMessages?: Resolver<Array<ResolversTypes['BusinessMessage']>, ParentType, ContextType, Partial<QuerymyBusinessMessagesArgs>>;
  myDriverMessages?: Resolver<Array<ResolversTypes['DriverMessage']>, ParentType, ContextType, Partial<QuerymyDriverMessagesArgs>>;
  myDriverMetrics?: Resolver<ResolversTypes['DriverDailyMetrics'], ParentType, ContextType>;
  notificationCampaign?: Resolver<Maybe<ResolversTypes['NotificationCampaign']>, ParentType, ContextType, RequireFields<QuerynotificationCampaignArgs, 'id'>>;
  notificationCampaigns?: Resolver<Array<ResolversTypes['NotificationCampaign']>, ParentType, ContextType>;
  offers?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryoffersArgs, 'businessId'>>;
  operationalKPIs?: Resolver<ResolversTypes['OperationalKPIs'], ParentType, ContextType, RequireFields<QueryoperationalKPIsArgs, 'endDate' | 'startDate'>>;
  order?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType, RequireFields<QueryorderArgs, 'id'>>;
  orders?: Resolver<ResolversTypes['OrderConnection'], ParentType, ContextType, Partial<QueryordersArgs>>;
  ordersByStatus?: Resolver<Array<ResolversTypes['Order']>, ParentType, ContextType, RequireFields<QueryordersByStatusArgs, 'status'>>;
  peakHourAnalysis?: Resolver<ResolversTypes['PeakHourAnalysis'], ParentType, ContextType, RequireFields<QuerypeakHourAnalysisArgs, 'endDate' | 'startDate'>>;
  previewCampaignAudience?: Resolver<ResolversTypes['AudiencePreview'], ParentType, ContextType, RequireFields<QuerypreviewCampaignAudienceArgs, 'query'>>;
  prioritySurchargeAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryproductArgs, 'id'>>;
  productCategories?: Resolver<Array<ResolversTypes['ProductCategory']>, ParentType, ContextType, RequireFields<QueryproductCategoriesArgs, 'businessId'>>;
  productCategory?: Resolver<Maybe<ResolversTypes['ProductCategory']>, ParentType, ContextType, RequireFields<QueryproductCategoryArgs, 'id'>>;
  productSubcategories?: Resolver<Array<ResolversTypes['ProductSubcategory']>, ParentType, ContextType, RequireFields<QueryproductSubcategoriesArgs, 'categoryId'>>;
  productSubcategoriesByBusiness?: Resolver<Array<ResolversTypes['ProductSubcategory']>, ParentType, ContextType, RequireFields<QueryproductSubcategoriesByBusinessArgs, 'businessId'>>;
  products?: Resolver<Array<ResolversTypes['ProductCard']>, ParentType, ContextType, RequireFields<QueryproductsArgs, 'businessId'>>;
  pushTelemetryEvents?: Resolver<Array<ResolversTypes['PushTelemetryEvent']>, ParentType, ContextType, Partial<QuerypushTelemetryEventsArgs>>;
  pushTelemetrySummary?: Resolver<ResolversTypes['PushTelemetrySummary'], ParentType, ContextType, Partial<QuerypushTelemetrySummaryArgs>>;
  settlementBreakdown?: Resolver<Array<ResolversTypes['SettlementBreakdownItem']>, ParentType, ContextType, Partial<QuerysettlementBreakdownArgs>>;
  settlementPayment?: Resolver<Maybe<ResolversTypes['SettlementPayment']>, ParentType, ContextType, RequireFields<QuerysettlementPaymentArgs, 'id'>>;
  settlementPayments?: Resolver<Array<ResolversTypes['SettlementPayment']>, ParentType, ContextType, Partial<QuerysettlementPaymentsArgs>>;
  settlementRequests?: Resolver<Array<ResolversTypes['SettlementRequest']>, ParentType, ContextType, Partial<QuerysettlementRequestsArgs>>;
  settlementRule?: Resolver<Maybe<ResolversTypes['SettlementRule']>, ParentType, ContextType, RequireFields<QuerysettlementRuleArgs, 'id'>>;
  settlementRules?: Resolver<Array<ResolversTypes['SettlementRule']>, ParentType, ContextType, Partial<QuerysettlementRulesArgs>>;
  settlementRulesCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType, Partial<QuerysettlementRulesCountArgs>>;
  settlementScenarioDefinitions?: Resolver<Array<ResolversTypes['SettlementScenarioDefinition']>, ParentType, ContextType>;
  settlementSummary?: Resolver<ResolversTypes['SettlementSummary'], ParentType, ContextType, Partial<QuerysettlementSummaryArgs>>;
  settlements?: Resolver<Array<ResolversTypes['Settlement']>, ParentType, ContextType, Partial<QuerysettlementsArgs>>;
  uncompletedOrders?: Resolver<Array<ResolversTypes['Order']>, ParentType, ContextType>;
  unsettledBalance?: Resolver<ResolversTypes['Float'], ParentType, ContextType, RequireFields<QueryunsettledBalanceArgs, 'entityId' | 'entityType'>>;
  userBehavior?: Resolver<Maybe<ResolversTypes['UserBehavior']>, ParentType, ContextType, RequireFields<QueryuserBehaviorArgs, 'userId'>>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, Partial<QueryusersArgs>>;
  validatePromotions?: Resolver<ResolversTypes['PromotionResult'], ParentType, ContextType, RequireFields<QueryvalidatePromotionsArgs, 'cart'>>;
};

export type SendNotificationResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SendNotificationResult'] = ResolversParentTypes['SendNotificationResult']> = {
  failureCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  successCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettleResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SettleResult'] = ResolversParentTypes['SettleResult']> = {
  direction?: Resolver<ResolversTypes['SettlementPaymentDirection'], ParentType, ContextType>;
  netAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  payment?: Resolver<ResolversTypes['SettlementPayment'], ParentType, ContextType>;
  remainderAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  remainderSettlement?: Resolver<Maybe<ResolversTypes['Settlement']>, ParentType, ContextType>;
  settledCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Settlement'] = ResolversParentTypes['Settlement']> = {
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['SettlementDirection'], ParentType, ContextType>;
  driver?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isSettled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType>;
  paidAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  paymentMethod?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  paymentReference?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rule?: Resolver<Maybe<ResolversTypes['SettlementRule']>, ParentType, ContextType>;
  ruleId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  settlementPayment?: Resolver<Maybe<ResolversTypes['SettlementPayment']>, ParentType, ContextType>;
  sourcePayment?: Resolver<Maybe<ResolversTypes['SettlementPayment']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['SettlementStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SettlementType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementAmountTypeResolvers = EnumResolverSignature<{ FIXED?: any, PERCENT?: any }, ResolversTypes['SettlementAmountType']>;

export type SettlementBreakdownItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SettlementBreakdownItem'] = ResolversParentTypes['SettlementBreakdownItem']> = {
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['SettlementDirection'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementDirectionResolvers = EnumResolverSignature<{ PAYABLE?: any, RECEIVABLE?: any }, ResolversTypes['SettlementDirection']>;

export type SettlementEntityTypeResolvers = EnumResolverSignature<{ BUSINESS?: any, DRIVER?: any }, ResolversTypes['SettlementEntityType']>;

export type SettlementPaymentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SettlementPayment'] = ResolversParentTypes['SettlementPayment']> = {
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  direction?: Resolver<Maybe<ResolversTypes['SettlementPaymentDirection']>, ParentType, ContextType>;
  driver?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  entityType?: Resolver<ResolversTypes['SettlementType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  paymentMethod?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  paymentReference?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  totalBalanceAtTime?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementPaymentDirectionResolvers = EnumResolverSignature<{ ENTITY_TO_PLATFORM?: any, PLATFORM_TO_ENTITY?: any }, ResolversTypes['SettlementPaymentDirection']>;

export type SettlementRequestResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SettlementRequest'] = ResolversParentTypes['SettlementRequest']> = {
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  driver?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  entityType?: Resolver<ResolversTypes['SettlementType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  respondedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  respondedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  settlementPayment?: Resolver<Maybe<ResolversTypes['SettlementPayment']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['SettlementRequestStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementRequestActionResolvers = EnumResolverSignature<{ ACCEPT?: any, REJECT?: any }, ResolversTypes['SettlementRequestAction']>;

export type SettlementRequestStatusResolvers = EnumResolverSignature<{ ACCEPTED?: any, PENDING?: any, REJECTED?: any }, ResolversTypes['SettlementRequestStatus']>;

export type SettlementRuleResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SettlementRule'] = ResolversParentTypes['SettlementRule']> = {
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  amountType?: Resolver<ResolversTypes['SettlementAmountType'], ParentType, ContextType>;
  appliesTo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  business?: Resolver<Maybe<ResolversTypes['Business']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['SettlementDirection'], ParentType, ContextType>;
  entityType?: Resolver<ResolversTypes['SettlementEntityType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  maxAmount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  promotion?: Resolver<Maybe<ResolversTypes['Promotion']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SettlementRuleType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementRuleScopeResolvers = EnumResolverSignature<{ BUSINESS?: any, BUSINESS_PROMOTION?: any, GLOBAL?: any, PROMOTION?: any }, ResolversTypes['SettlementRuleScope']>;

export type SettlementRuleTypeResolvers = EnumResolverSignature<{ DELIVERY_PRICE?: any, ORDER_PRICE?: any }, ResolversTypes['SettlementRuleType']>;

export type SettlementScenarioDefinitionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SettlementScenarioDefinition'] = ResolversParentTypes['SettlementScenarioDefinition']> = {
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementScenarioHarnessResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SettlementScenarioHarnessResult'] = ResolversParentTypes['SettlementScenarioHarnessResult']> = {
  failedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  passed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  passedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  results?: Resolver<Array<ResolversTypes['SettlementScenarioResult']>, ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementScenarioResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SettlementScenarioResult'] = ResolversParentTypes['SettlementScenarioResult']> = {
  actualCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  actualSettlements?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  expectedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expectedSettlements?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  mismatches?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  passed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  scenarioId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementStatusResolvers = EnumResolverSignature<{ CANCELLED?: any, DISPUTED?: any, OVERDUE?: any, PAID?: any, PENDING?: any }, ResolversTypes['SettlementStatus']>;

export type SettlementSummaryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SettlementSummary'] = ResolversParentTypes['SettlementSummary']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pendingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalPaid?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalPayable?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalPending?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalReceivable?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SettlementTypeResolvers = EnumResolverSignature<{ BUSINESS?: any, DRIVER?: any }, ResolversTypes['SettlementType']>;

export type SignupStepResolvers = EnumResolverSignature<{ COMPLETED?: any, EMAIL_SENT?: any, EMAIL_VERIFIED?: any, INITIAL?: any, PHONE_SENT?: any }, ResolversTypes['SignupStep']>;

export type SignupStepResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SignupStepResponse'] = ResolversParentTypes['SignupStepResponse']> = {
  currentStep?: Resolver<ResolversTypes['SignupStep'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type StoreStatusResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['StoreStatus'] = ResolversParentTypes['StoreStatus']> = {
  bannerEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  bannerMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  bannerType?: Resolver<ResolversTypes['BannerType'], ParentType, ContextType>;
  closedMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dispatchModeEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isStoreClosed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  adminBusinessMessageReceived?: SubscriptionResolver<ResolversTypes['BusinessMessage'], "adminBusinessMessageReceived", ParentType, ContextType, RequireFields<SubscriptionadminBusinessMessageReceivedArgs, 'businessUserId'>>;
  adminMessageReceived?: SubscriptionResolver<ResolversTypes['DriverMessage'], "adminMessageReceived", ParentType, ContextType, RequireFields<SubscriptionadminMessageReceivedArgs, 'driverId'>>;
  adminPttSignal?: SubscriptionResolver<ResolversTypes['AdminPttSignal'], "adminPttSignal", ParentType, ContextType>;
  allOrdersUpdated?: SubscriptionResolver<Array<ResolversTypes['Order']>, "allOrdersUpdated", ParentType, ContextType>;
  auditLogCreated?: SubscriptionResolver<ResolversTypes['AuditLog'], "auditLogCreated", ParentType, ContextType, Partial<SubscriptionauditLogCreatedArgs>>;
  businessMessageReceived?: SubscriptionResolver<ResolversTypes['BusinessMessage'], "businessMessageReceived", ParentType, ContextType>;
  driverConnectionStatusChanged?: SubscriptionResolver<ResolversTypes['DriverConnection'], "driverConnectionStatusChanged", ParentType, ContextType, RequireFields<SubscriptiondriverConnectionStatusChangedArgs, 'driverId'>>;
  driverMessageReceived?: SubscriptionResolver<ResolversTypes['DriverMessage'], "driverMessageReceived", ParentType, ContextType>;
  driverPttSignal?: SubscriptionResolver<ResolversTypes['DriverPttSignal'], "driverPttSignal", ParentType, ContextType, RequireFields<SubscriptiondriverPttSignalArgs, 'driverId'>>;
  driversUpdated?: SubscriptionResolver<Array<ResolversTypes['User']>, "driversUpdated", ParentType, ContextType>;
  orderDriverLiveTracking?: SubscriptionResolver<ResolversTypes['OrderDriverLiveTracking'], "orderDriverLiveTracking", ParentType, ContextType, RequireFields<SubscriptionorderDriverLiveTrackingArgs, 'orderId'>>;
  orderStatusUpdated?: SubscriptionResolver<ResolversTypes['Order'], "orderStatusUpdated", ParentType, ContextType, RequireFields<SubscriptionorderStatusUpdatedArgs, 'orderId'>>;
  settlementCreated?: SubscriptionResolver<ResolversTypes['Settlement'], "settlementCreated", ParentType, ContextType, Partial<SubscriptionsettlementCreatedArgs>>;
  settlementStatusChanged?: SubscriptionResolver<ResolversTypes['Settlement'], "settlementStatusChanged", ParentType, ContextType, RequireFields<SubscriptionsettlementStatusChangedArgs, 'id'>>;
  storeStatusUpdated?: SubscriptionResolver<ResolversTypes['StoreStatus'], "storeStatusUpdated", ParentType, ContextType>;
  userOrdersUpdated?: SubscriptionResolver<Array<ResolversTypes['Order']>, "userOrdersUpdated", ParentType, ContextType, Partial<SubscriptionuserOrdersUpdatedArgs>>;
};

export type TelemetryCountResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TelemetryCount'] = ResolversParentTypes['TelemetryCount']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TokenRefreshResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TokenRefreshResponse'] = ResolversParentTypes['TokenRefreshResponse']> = {
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
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
  emailOptOut?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  emailVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  flagColor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasOwnVehicle?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isDemoAccount?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isOnline?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isTrustedCustomer?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  maxActiveOrders?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['UserPermission']>, ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  preferredLanguage?: Resolver<ResolversTypes['AppLanguage'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  signupStep?: Resolver<ResolversTypes['SignupStep'], ParentType, ContextType>;
  totalOrders?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type WorkingHoursResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WorkingHours'] = ResolversParentTypes['WorkingHours']> = {
  closesAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  opensAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  ActionType?: ActionTypeResolvers;
  ActorType?: ActorTypeResolvers;
  AdminPttSignal?: AdminPttSignalResolvers<ContextType>;
  AgoraRtcCredentials?: AgoraRtcCredentialsResolvers<ContextType>;
  AgoraRtcRole?: AgoraRtcRoleResolvers;
  AppLanguage?: AppLanguageResolvers;
  ApplicablePromotion?: ApplicablePromotionResolvers<ContextType>;
  ApprovalReason?: ApprovalReasonResolvers;
  AudiencePreview?: AudiencePreviewResolvers<ContextType>;
  AuditLog?: AuditLogResolvers<ContextType>;
  AuditLogConnection?: AuditLogConnectionResolvers<ContextType>;
  AuthResponse?: AuthResponseResolvers<ContextType>;
  Banner?: BannerResolvers<ContextType>;
  BannerDisplayContext?: BannerDisplayContextResolvers;
  BannerMediaType?: BannerMediaTypeResolvers;
  BannerType?: BannerTypeResolvers;
  Business?: BusinessResolvers<ContextType>;
  BusinessDayHours?: BusinessDayHoursResolvers<ContextType>;
  BusinessDeviceHealth?: BusinessDeviceHealthResolvers<ContextType>;
  BusinessDeviceOnlineStatus?: BusinessDeviceOnlineStatusResolvers;
  BusinessKPI?: BusinessKPIResolvers<ContextType>;
  BusinessMessage?: BusinessMessageResolvers<ContextType>;
  BusinessMessageThread?: BusinessMessageThreadResolvers<ContextType>;
  BusinessMessageUser?: BusinessMessageUserResolvers<ContextType>;
  BusinessPerformanceStat?: BusinessPerformanceStatResolvers<ContextType>;
  BusinessPromotion?: BusinessPromotionResolvers<ContextType>;
  BusinessType?: BusinessTypeResolvers;
  CampaignStatus?: CampaignStatusResolvers;
  CreateBusinessWithOwnerPayload?: CreateBusinessWithOwnerPayloadResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  DayOfWeekDistribution?: DayOfWeekDistributionResolvers<ContextType>;
  DayVolume?: DayVolumeResolvers<ContextType>;
  DeliveryPriceResult?: DeliveryPriceResultResolvers<ContextType>;
  DeliveryPricingConfig?: DeliveryPricingConfigResolvers<ContextType>;
  DeliveryPricingTier?: DeliveryPricingTierResolvers<ContextType>;
  DeliveryZone?: DeliveryZoneResolvers<ContextType>;
  DeliveryZoneMatch?: DeliveryZoneMatchResolvers<ContextType>;
  DeviceAppType?: DeviceAppTypeResolvers;
  DevicePlatform?: DevicePlatformResolvers;
  DeviceToken?: DeviceTokenResolvers<ContextType>;
  DriverAuthResult?: DriverAuthResultResolvers<ContextType>;
  DriverBasicInfo?: DriverBasicInfoResolvers<ContextType>;
  DriverCashSummary?: DriverCashSummaryResolvers<ContextType>;
  DriverConnection?: DriverConnectionResolvers<ContextType>;
  DriverConnectionStatus?: DriverConnectionStatusResolvers;
  DriverCustomerNotificationKind?: DriverCustomerNotificationKindResolvers;
  DriverDailyMetrics?: DriverDailyMetricsResolvers<ContextType>;
  DriverHeartbeatResult?: DriverHeartbeatResultResolvers<ContextType>;
  DriverKPI?: DriverKPIResolvers<ContextType>;
  DriverMessage?: DriverMessageResolvers<ContextType>;
  DriverMessageThread?: DriverMessageThreadResolvers<ContextType>;
  DriverMessageUser?: DriverMessageUserResolvers<ContextType>;
  DriverOrderFinancials?: DriverOrderFinancialsResolvers<ContextType>;
  DriverPttSignal?: DriverPttSignalResolvers<ContextType>;
  DriverPttSignalAction?: DriverPttSignalActionResolvers;
  EntityType?: EntityTypeResolvers;
  HourlyDistribution?: HourlyDistributionResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Location?: LocationResolvers<ContextType>;
  MessageAlertType?: MessageAlertTypeResolvers;
  Mutation?: MutationResolvers<ContextType>;
  Notification?: NotificationResolvers<ContextType>;
  NotificationCampaign?: NotificationCampaignResolvers<ContextType>;
  NotificationType?: NotificationTypeResolvers;
  OperationalKPIs?: OperationalKPIsResolvers<ContextType>;
  Option?: OptionResolvers<ContextType>;
  OptionGroup?: OptionGroupResolvers<ContextType>;
  Order?: OrderResolvers<ContextType>;
  OrderBusiness?: OrderBusinessResolvers<ContextType>;
  OrderConnection?: OrderConnectionResolvers<ContextType>;
  OrderDriverLiveTracking?: OrderDriverLiveTrackingResolvers<ContextType>;
  OrderItem?: OrderItemResolvers<ContextType>;
  OrderItemOption?: OrderItemOptionResolvers<ContextType>;
  OrderPaymentCollection?: OrderPaymentCollectionResolvers;
  OrderPromotion?: OrderPromotionResolvers<ContextType>;
  OrderSettlementLineItem?: OrderSettlementLineItemResolvers<ContextType>;
  OrderSettlementPreview?: OrderSettlementPreviewResolvers<ContextType>;
  OrderStatus?: OrderStatusResolvers;
  PeakHourAnalysis?: PeakHourAnalysisResolvers<ContextType>;
  PolygonPoint?: PolygonPointResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductCard?: ProductCardResolvers<ContextType>;
  ProductCategory?: ProductCategoryResolvers<ContextType>;
  ProductSubcategory?: ProductSubcategoryResolvers<ContextType>;
  ProductVariantGroup?: ProductVariantGroupResolvers<ContextType>;
  Promotion?: PromotionResolvers<ContextType>;
  PromotionAnalyticsResult?: PromotionAnalyticsResultResolvers<ContextType>;
  PromotionAppliesTo?: PromotionAppliesToResolvers;
  PromotionCreatorType?: PromotionCreatorTypeResolvers;
  PromotionResult?: PromotionResultResolvers<ContextType>;
  PromotionTarget?: PromotionTargetResolvers;
  PromotionThreshold?: PromotionThresholdResolvers<ContextType>;
  PromotionType?: PromotionTypeResolvers;
  PromotionUsage?: PromotionUsageResolvers<ContextType>;
  PushTelemetryEvent?: PushTelemetryEventResolvers<ContextType>;
  PushTelemetryEventType?: PushTelemetryEventTypeResolvers;
  PushTelemetrySummary?: PushTelemetrySummaryResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  SendNotificationResult?: SendNotificationResultResolvers<ContextType>;
  SettleResult?: SettleResultResolvers<ContextType>;
  Settlement?: SettlementResolvers<ContextType>;
  SettlementAmountType?: SettlementAmountTypeResolvers;
  SettlementBreakdownItem?: SettlementBreakdownItemResolvers<ContextType>;
  SettlementDirection?: SettlementDirectionResolvers;
  SettlementEntityType?: SettlementEntityTypeResolvers;
  SettlementPayment?: SettlementPaymentResolvers<ContextType>;
  SettlementPaymentDirection?: SettlementPaymentDirectionResolvers;
  SettlementRequest?: SettlementRequestResolvers<ContextType>;
  SettlementRequestAction?: SettlementRequestActionResolvers;
  SettlementRequestStatus?: SettlementRequestStatusResolvers;
  SettlementRule?: SettlementRuleResolvers<ContextType>;
  SettlementRuleScope?: SettlementRuleScopeResolvers;
  SettlementRuleType?: SettlementRuleTypeResolvers;
  SettlementScenarioDefinition?: SettlementScenarioDefinitionResolvers<ContextType>;
  SettlementScenarioHarnessResult?: SettlementScenarioHarnessResultResolvers<ContextType>;
  SettlementScenarioResult?: SettlementScenarioResultResolvers<ContextType>;
  SettlementStatus?: SettlementStatusResolvers;
  SettlementSummary?: SettlementSummaryResolvers<ContextType>;
  SettlementType?: SettlementTypeResolvers;
  SignupStep?: SignupStepResolvers;
  SignupStepResponse?: SignupStepResponseResolvers<ContextType>;
  StoreStatus?: StoreStatusResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  TelemetryCount?: TelemetryCountResolvers<ContextType>;
  TokenRefreshResponse?: TokenRefreshResponseResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserAddress?: UserAddressResolvers<ContextType>;
  UserBehavior?: UserBehaviorResolvers<ContextType>;
  UserPermission?: UserPermissionResolvers;
  UserPromoMetadata?: UserPromoMetadataResolvers<ContextType>;
  UserPromotion?: UserPromotionResolvers<ContextType>;
  UserRole?: UserRoleResolvers;
  WorkingHours?: WorkingHoursResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = GraphQLContext> = {
  skipAuth?: skipAuthDirectiveResolver<any, any, ContextType>;
};
