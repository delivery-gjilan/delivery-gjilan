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
  OrderItemRemoved = 'ORDER_ITEM_REMOVED',
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

/** Signal sent from a driver to all listening admins */
export type AdminPttSignal = {
  __typename?: 'AdminPttSignal';
  action: DriverPttSignalAction;
  channelName: Scalars['String']['output'];
  driverId: Scalars['ID']['output'];
  timestamp: Scalars['DateTime']['output'];
};

export type AdoptCatalogProductInput = {
  businessId: Scalars['ID']['input'];
  categoryId: Scalars['ID']['input'];
  price: Scalars['Float']['input'];
  sourceProductId: Scalars['ID']['input'];
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

export enum ApprovalReason {
  FirstOrder = 'FIRST_ORDER',
  HighValue = 'HIGH_VALUE',
  OutOfZone = 'OUT_OF_ZONE'
}

export type AssignPromotionToUserInput = {
  audienceGroupIds?: InputMaybe<Array<Scalars['ID']['input']>>;
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

export enum BannerDisplayContext {
  All = 'ALL',
  Business = 'BUSINESS',
  Cart = 'CART',
  Category = 'CATEGORY',
  Home = 'HOME',
  Product = 'PRODUCT'
}

export enum BannerMediaType {
  Gif = 'GIF',
  Image = 'IMAGE',
  Video = 'VIDEO'
}

export enum BannerType {
  Info = 'INFO',
  Success = 'SUCCESS',
  Warning = 'WARNING'
}

export type BulkSetInventoryInput = {
  businessId: Scalars['ID']['input'];
  items: Array<BulkSetInventoryItem>;
};

export type BulkSetInventoryItem = {
  costPrice?: InputMaybe<Scalars['Float']['input']>;
  lowStockThreshold?: InputMaybe<Scalars['Int']['input']>;
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
};

export type Business = {
  __typename?: 'Business';
  activePromotion?: Maybe<BusinessPromotion>;
  activePromotionsDisplay: Array<BusinessPromotionDisplay>;
  avgPrepTimeMinutes: Scalars['Int']['output'];
  businessType: BusinessType;
  category?: Maybe<Scalars['String']['output']>;
  commissionPercentage: Scalars['Float']['output'];
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  directDispatchEnabled: Scalars['Boolean']['output'];
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
  ratingAverage: Scalars['Float']['output'];
  ratingCount: Scalars['Int']['output'];
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

export type BusinessOrderFinancials = {
  __typename?: 'BusinessOrderFinancials';
  amountOwedByBusiness: Scalars['Float']['output'];
  amountOwedToBusiness: Scalars['Float']['output'];
  businessNetEarnings: Scalars['Float']['output'];
  businessPrice: Scalars['Float']['output'];
  customerPaid: Scalars['Float']['output'];
  markupAmount: Scalars['Float']['output'];
  orderId: Scalars['ID']['output'];
  paymentCollection: OrderPaymentCollection;
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
  code?: Maybe<Scalars['String']['output']>;
  creatorType: PromotionCreatorType;
  description?: Maybe<Scalars['String']['output']>;
  discountValue?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  spendThreshold?: Maybe<Scalars['Float']['output']>;
  type: PromotionType;
};

export type BusinessPromotionDisplay = {
  __typename?: 'BusinessPromotionDisplay';
  applyMethod: PromotionApplyMethod;
  code?: Maybe<Scalars['String']['output']>;
  creatorType: PromotionCreatorType;
  description?: Maybe<Scalars['String']['output']>;
  discountValue?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  priority: Scalars['Int']['output'];
  requiresCode: Scalars['Boolean']['output'];
  spendThreshold?: Maybe<Scalars['Float']['output']>;
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
  category?: InputMaybe<Scalars['String']['input']>;
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

export type CreateDirectDispatchOrderInput = {
  /** Optional notes for the driver. */
  driverNotes?: InputMaybe<Scalars['String']['input']>;
  /** Delivery address for the recipient. */
  dropOffLocation: LocationInput;
  /** Optional name of the recipient. */
  recipientName?: InputMaybe<Scalars['String']['input']>;
  /** Phone number of the recipient. */
  recipientPhone: Scalars['String']['input'];
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
  driverTip?: InputMaybe<Scalars['Float']['input']>;
  dropOffLocation: LocationInput;
  items: Array<CreateOrderItemInput>;
  paymentCollection?: InputMaybe<OrderPaymentCollection>;
  priorityRequested?: InputMaybe<Scalars['Boolean']['input']>;
  prioritySurcharge?: InputMaybe<Scalars['Float']['input']>;
  promotionId?: InputMaybe<Scalars['ID']['input']>;
  promotionIds?: InputMaybe<Array<Scalars['ID']['input']>>;
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

export type CreatePromotionAudienceGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  userIds: Array<Scalars['ID']['input']>;
};

export type CreatePromotionInput = {
  activeWeekdays?: InputMaybe<Array<Scalars['Int']['input']>>;
  code?: InputMaybe<Scalars['String']['input']>;
  creatorId?: InputMaybe<Scalars['ID']['input']>;
  creatorType: PromotionCreatorType;
  dailyEndTime?: InputMaybe<Scalars['String']['input']>;
  dailyStartTime?: InputMaybe<Scalars['String']['input']>;
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
  newUserWindowDays?: InputMaybe<Scalars['Int']['input']>;
  priority: Scalars['Int']['input'];
  scheduleTimezone?: InputMaybe<Scalars['String']['input']>;
  scheduleType?: InputMaybe<PromotionScheduleType>;
  spendThreshold?: InputMaybe<Scalars['Float']['input']>;
  startsAt?: InputMaybe<Scalars['String']['input']>;
  target: PromotionTarget;
  targetAudienceGroupIds?: InputMaybe<Array<Scalars['ID']['input']>>;
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

export type DirectDispatchAvailability = {
  __typename?: 'DirectDispatchAvailability';
  /** Whether the business can create a direct dispatch order right now. */
  available: Scalars['Boolean']['output'];
  /** Number of free drivers available for dispatch. */
  freeDriverCount: Scalars['Int']['output'];
  /** Human-readable reason if not available. */
  reason?: Maybe<Scalars['String']['output']>;
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

export type DriverOrderFinancials = {
  __typename?: 'DriverOrderFinancials';
  amountToCollectFromCustomer: Scalars['Float']['output'];
  amountToRemitToPlatform: Scalars['Float']['output'];
  driverNetEarnings: Scalars['Float']['output'];
  driverTip: Scalars['Float']['output'];
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

/**
 * Vehicle type for drivers:
 * - GAS: Internal combustion engine vehicle
 * - ELECTRIC: Electric vehicle (e-bike, e-scooter, EV)
 */
export enum DriverVehicleType {
  Electric = 'ELECTRIC',
  Gas = 'GAS'
}

/** Single data point in the platform earnings trend. */
export type EarningsTrendPoint = {
  __typename?: 'EarningsTrendPoint';
  /** Number of settlements on this date. */
  count: Scalars['Int']['output'];
  /** Date bucket (YYYY-MM-DD). */
  date: Scalars['String']['output'];
  /** Net earnings (receivable - payable). */
  net: Scalars['Float']['output'];
  /** Total payable amount on this date. */
  payable: Scalars['Float']['output'];
  /** Total receivable amount on this date. */
  receivable: Scalars['Float']['output'];
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

export enum InventoryCoverageStatus {
  FullyOwned = 'FULLY_OWNED',
  MarketOnly = 'MARKET_ONLY',
  PartiallyOwned = 'PARTIALLY_OWNED'
}

export type InventoryEarnings = {
  __typename?: 'InventoryEarnings';
  averageMargin: Scalars['Float']['output'];
  orderCount: Scalars['Int']['output'];
  products: Array<InventoryEarningsProduct>;
  totalCost: Scalars['Float']['output'];
  totalProfit: Scalars['Float']['output'];
  totalRevenue: Scalars['Float']['output'];
  totalUnitsSold: Scalars['Int']['output'];
};

export type InventoryEarningsProduct = {
  __typename?: 'InventoryEarningsProduct';
  cost: Scalars['Float']['output'];
  margin: Scalars['Float']['output'];
  productId: Scalars['ID']['output'];
  productImageUrl?: Maybe<Scalars['String']['output']>;
  productName: Scalars['String']['output'];
  profit: Scalars['Float']['output'];
  revenue: Scalars['Float']['output'];
  unitsSold: Scalars['Int']['output'];
};

export type InventoryItem = {
  __typename?: 'InventoryItem';
  categoryName?: Maybe<Scalars['String']['output']>;
  costPrice?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  isLowStock: Scalars['Boolean']['output'];
  lowStockThreshold?: Maybe<Scalars['Int']['output']>;
  productBasePrice: Scalars['Float']['output'];
  productId: Scalars['ID']['output'];
  productImageUrl?: Maybe<Scalars['String']['output']>;
  productMarkupPrice?: Maybe<Scalars['Float']['output']>;
  productName: Scalars['String']['output'];
  productNightPrice?: Maybe<Scalars['Float']['output']>;
  quantity: Scalars['Int']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type InventorySummary = {
  __typename?: 'InventorySummary';
  lowStockCount: Scalars['Int']['output'];
  outOfStockCount: Scalars['Int']['output'];
  totalStockValue: Scalars['Int']['output'];
  totalTrackedProducts: Scalars['Int']['output'];
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
  adoptCatalogProduct: Product;
  approveOrder: Order;
  assignDriverToOrder: Order;
  assignPromotionToUsers: Array<UserPromotion>;
  backfillSettlementsForDeliveredOrders: Scalars['Int']['output'];
  banUser: User;
  bulkSetInventory: Array<InventoryItem>;
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
  createDirectDispatchOrder: Order;
  createOption: Option;
  createOptionGroup: OptionGroup;
  createOrder: Order;
  createProduct: Product;
  createProductCategory: ProductCategory;
  createProductSubcategory: ProductSubcategory;
  createProductVariantGroup: ProductVariantGroup;
  createPromotion: Promotion;
  createPromotionAudienceGroup: PromotionAudienceGroup;
  /** Admin creates a settlement request, notifying the business or driver via push. */
  createSettlementRequest: SettlementRequest;
  createSettlementRule: SettlementRule;
  createTestOrder: Order;
  createUser: AuthResponse;
  deductOrderStock: OrderCoverage;
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
  deletePromotionAudienceGroup: Scalars['Boolean']['output'];
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
  removeInventoryItem: Scalars['Boolean']['output'];
  removeOrderItem: Order;
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
  setInventoryQuantity: InventoryItem;
  setMyEmailOptOut: User;
  setMyPreferredLanguage: User;
  setOrderAdminNote: Order;
  setUserPermissions: User;
  /** Settle all unsettled settlements for a business. Supports partial payment. */
  settleWithBusiness: SettleResult;
  /** Settle unsettled settlements for a driver. Supports partial payment. */
  settleWithDriver: SettleResult;
  startPreparing: Order;
  submitOrderReview: OrderReview;
  submitPhoneNumber: SignupStepResponse;
  trackPushTelemetry: Scalars['Boolean']['output'];
  unadoptCatalogProduct: Scalars['Boolean']['output'];
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
  updatePromotionAudienceGroup: PromotionAudienceGroup;
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
  vehicleType?: InputMaybe<DriverVehicleType>;
};


export type MutationAdoptCatalogProductArgs = {
  input: AdoptCatalogProductInput;
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


export type MutationBanUserArgs = {
  banned: Scalars['Boolean']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationBulkSetInventoryArgs = {
  input: BulkSetInventoryInput;
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


export type MutationCreateDirectDispatchOrderArgs = {
  input: CreateDirectDispatchOrderInput;
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


export type MutationCreatePromotionAudienceGroupArgs = {
  input: CreatePromotionAudienceGroupInput;
};


export type MutationCreateSettlementRequestArgs = {
  amount: Scalars['Float']['input'];
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateSettlementRuleArgs = {
  input: CreateSettlementRuleInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationDeductOrderStockArgs = {
  orderId: Scalars['ID']['input'];
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


export type MutationDeletePromotionAudienceGroupArgs = {
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


export type MutationDriverSendPttSignalArgs = {
  action: DriverPttSignalAction;
  channelName: Scalars['String']['input'];
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


export type MutationIssueRecoveryPromotionArgs = {
  input: IssueRecoveryPromotionInput;
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


export type MutationRemoveInventoryItemArgs = {
  businessId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
};


export type MutationRemoveOrderItemArgs = {
  orderId: Scalars['ID']['input'];
  orderItemId: Scalars['ID']['input'];
  quantity?: InputMaybe<Scalars['Int']['input']>;
  reason: Scalars['String']['input'];
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


export type MutationRequestPasswordResetArgs = {
  email: Scalars['String']['input'];
};


export type MutationResetPasswordArgs = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationRespondToSettlementRequestArgs = {
  action: SettlementRequestAction;
  reason?: InputMaybe<Scalars['String']['input']>;
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
  promotionId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSendDriverMessageArgs = {
  alertType: MessageAlertType;
  body: Scalars['String']['input'];
  driverId: Scalars['ID']['input'];
};


export type MutationSendPushNotificationArgs = {
  input: SendPushNotificationInput;
};


export type MutationSetBusinessFeaturedArgs = {
  id: Scalars['ID']['input'];
  isFeatured: Scalars['Boolean']['input'];
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
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


export type MutationSetInventoryQuantityArgs = {
  input: SetInventoryQuantityInput;
};


export type MutationSetMyEmailOptOutArgs = {
  optOut: Scalars['Boolean']['input'];
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
  amount?: InputMaybe<Scalars['Float']['input']>;
  driverId: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  paymentReference?: InputMaybe<Scalars['String']['input']>;
};


export type MutationStartPreparingArgs = {
  id: Scalars['ID']['input'];
  preparationMinutes: Scalars['Int']['input'];
};


export type MutationSubmitOrderReviewArgs = {
  comment?: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
  quickFeedback?: InputMaybe<Array<Scalars['String']['input']>>;
  rating: Scalars['Int']['input'];
};


export type MutationSubmitPhoneNumberArgs = {
  input: SubmitPhoneNumberInput;
};


export type MutationTrackPushTelemetryArgs = {
  input: TrackPushTelemetryInput;
};


export type MutationUnadoptCatalogProductArgs = {
  id: Scalars['ID']['input'];
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


export type MutationUpdateMyProfileArgs = {
  input: UpdateMyProfileInput;
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


export type MutationUpdatePromotionAudienceGroupArgs = {
  input: UpdatePromotionAudienceGroupInput;
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
  channel: OrderChannel;
  deliveredAt?: Maybe<Scalars['Date']['output']>;
  deliveryPrice: Scalars['Float']['output'];
  displayId: Scalars['String']['output'];
  driver?: Maybe<User>;
  driverArrivedAtPickup?: Maybe<Scalars['Date']['output']>;
  driverAssignedAt?: Maybe<Scalars['Date']['output']>;
  driverNotes?: Maybe<Scalars['String']['output']>;
  driverTip: Scalars['Float']['output'];
  dropOffLocation: Location;
  estimatedReadyAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  /** Total base price of items fulfilled from operator inventory. Null when inventory mode is off or no stock was used. */
  inventoryPrice?: Maybe<Scalars['Float']['output']>;
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
  recipientName?: Maybe<Scalars['String']['output']>;
  recipientPhone?: Maybe<Scalars['String']['output']>;
  review?: Maybe<OrderReview>;
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
  removedItems: Array<RemovedOrderItem>;
};

export enum OrderChannel {
  DirectDispatch = 'DIRECT_DISPATCH',
  Platform = 'PLATFORM'
}

export type OrderConnection = {
  __typename?: 'OrderConnection';
  hasMore: Scalars['Boolean']['output'];
  orders: Array<Order>;
  totalCount: Scalars['Int']['output'];
};

export type OrderCoverage = {
  __typename?: 'OrderCoverage';
  allFromMarket: Scalars['Boolean']['output'];
  allFromStock: Scalars['Boolean']['output'];
  deducted: Scalars['Boolean']['output'];
  fullyOwnedCount: Scalars['Int']['output'];
  items: Array<OrderCoverageItem>;
  marketOnlyCount: Scalars['Int']['output'];
  orderId: Scalars['ID']['output'];
  partiallyOwnedCount: Scalars['Int']['output'];
  totalItems: Scalars['Int']['output'];
};

export type OrderCoverageItem = {
  __typename?: 'OrderCoverageItem';
  deducted: Scalars['Boolean']['output'];
  fromMarket: Scalars['Int']['output'];
  fromStock: Scalars['Int']['output'];
  orderedQty: Scalars['Int']['output'];
  productId: Scalars['ID']['output'];
  productImageUrl?: Maybe<Scalars['String']['output']>;
  productName: Scalars['String']['output'];
  removedQty: Scalars['Int']['output'];
  status: InventoryCoverageStatus;
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
  /** How many units of this item came from operator's personal inventory (0 = all from market). */
  inventoryQuantity: Scalars['Int']['output'];
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

export type OrderReview = {
  __typename?: 'OrderReview';
  businessId: Scalars['ID']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  orderId: Scalars['ID']['output'];
  quickFeedback: Array<Scalars['String']['output']>;
  rating: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<OrderReviewUser>;
  userId: Scalars['ID']['output'];
};

export type OrderReviewUser = {
  __typename?: 'OrderReviewUser';
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
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
  sourceProductId?: Maybe<Scalars['ID']['output']>;
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
  orderCount: Scalars['Int']['output'];
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
  activeWeekdays?: Maybe<Array<Scalars['Int']['output']>>;
  assignedUsers?: Maybe<Array<UserPromotion>>;
  code?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  creatorId?: Maybe<Scalars['ID']['output']>;
  creatorType: PromotionCreatorType;
  currentGlobalUsage: Scalars['Int']['output'];
  dailyEndTime?: Maybe<Scalars['String']['output']>;
  dailyStartTime?: Maybe<Scalars['String']['output']>;
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
  newUserWindowDays?: Maybe<Scalars['Int']['output']>;
  orderId?: Maybe<Scalars['ID']['output']>;
  priority: Scalars['Int']['output'];
  scheduleTimezone?: Maybe<Scalars['String']['output']>;
  scheduleType: PromotionScheduleType;
  spendThreshold?: Maybe<Scalars['Float']['output']>;
  startsAt?: Maybe<Scalars['String']['output']>;
  target: PromotionTarget;
  thresholdReward?: Maybe<Scalars['String']['output']>;
  totalRevenue: Scalars['Float']['output'];
  totalUsageCount: Scalars['Int']['output'];
  type: PromotionType;
};

export type PromotionAnalyticsDailyPoint = {
  __typename?: 'PromotionAnalyticsDailyPoint';
  businessPaid: Scalars['Float']['output'];
  date: Scalars['String']['output'];
  platformPaid: Scalars['Float']['output'];
  totalDeducted: Scalars['Float']['output'];
  totalDeliveryDeducted: Scalars['Float']['output'];
  totalDiscountDeducted: Scalars['Float']['output'];
  uniqueUsers: Scalars['Int']['output'];
  usageCount: Scalars['Int']['output'];
};

export type PromotionAnalyticsListItem = {
  __typename?: 'PromotionAnalyticsListItem';
  averageOrderValue: Scalars['Float']['output'];
  businessPaid: Scalars['Float']['output'];
  creatorName?: Maybe<Scalars['String']['output']>;
  freeDeliveryUsageCount: Scalars['Int']['output'];
  platformPaid: Scalars['Float']['output'];
  promotion: Promotion;
  totalDeducted: Scalars['Float']['output'];
  totalDeliveryDeducted: Scalars['Float']['output'];
  totalDiscountDeducted: Scalars['Float']['output'];
  totalUsageCount: Scalars['Int']['output'];
  uniqueUsers: Scalars['Int']['output'];
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

export enum PromotionApplyMethod {
  Auto = 'AUTO',
  CodeRequired = 'CODE_REQUIRED'
}

export type PromotionAudienceGroup = {
  __typename?: 'PromotionAudienceGroup';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  memberCount: Scalars['Int']['output'];
  members: Array<User>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export enum PromotionCreatorType {
  Business = 'BUSINESS',
  Platform = 'PLATFORM'
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

export enum PromotionScheduleType {
  Always = 'ALWAYS',
  DateRange = 'DATE_RANGE',
  Recurring = 'RECURRING'
}

export enum PromotionTarget {
  AllUsers = 'ALL_USERS',
  Conditional = 'CONDITIONAL',
  FirstOrder = 'FIRST_ORDER',
  NewUsers = 'NEW_USERS',
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

export type PromotionsAnalyticsResult = {
  __typename?: 'PromotionsAnalyticsResult';
  dailyPoints: Array<PromotionAnalyticsDailyPoint>;
  items: Array<PromotionAnalyticsListItem>;
  summary: PromotionsAnalyticsSummary;
};

export type PromotionsAnalyticsSummary = {
  __typename?: 'PromotionsAnalyticsSummary';
  averageOrderValue: Scalars['Float']['output'];
  businessPaid: Scalars['Float']['output'];
  platformPaid: Scalars['Float']['output'];
  totalDeducted: Scalars['Float']['output'];
  totalDeliveryDeducted: Scalars['Float']['output'];
  totalDiscountDeducted: Scalars['Float']['output'];
  totalUsageCount: Scalars['Int']['output'];
  uniqueUsers: Scalars['Int']['output'];
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
  adminOrderReviews: Array<OrderReview>;
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
  businessOrderFinancials?: Maybe<BusinessOrderFinancials>;
  businessOrderReviews: Array<OrderReview>;
  businessPerformanceStats: Array<BusinessPerformanceStat>;
  businesses: Array<Business>;
  calculateDeliveryPrice: DeliveryPriceResult;
  cancelledOrders: Array<Order>;
  catalogProducts: Array<Product>;
  deliveryPricingConfig: DeliveryPricingConfig;
  deliveryPricingTiers: Array<DeliveryPricingTier>;
  deliveryZones: Array<DeliveryZone>;
  deviceTokens: Array<DeviceToken>;
  directDispatchAvailability: DirectDispatchAvailability;
  driverBalance: SettlementSummary;
  /** Driver cash summary with settlement breakdown. Auto-scoped to current driver. */
  driverCashSummary: DriverCashSummary;
  driverKPIs: Array<DriverKpi>;
  /** Admin: list of all driver threads with unread counts */
  driverMessageThreads: Array<DriverMessageThread>;
  /** Admin: full conversation with a specific driver */
  driverMessages: Array<DriverMessage>;
  driverOrderFinancials?: Maybe<DriverOrderFinancials>;
  drivers: Array<User>;
  /** Daily receivable earnings trend for the platform. */
  earningsTrend: Array<EarningsTrendPoint>;
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
  getPromotionAudienceGroups: Array<PromotionAudienceGroup>;
  getPromotionThresholds: Array<PromotionThreshold>;
  getPromotionUsage: Array<PromotionUsage>;
  getPromotionsAnalytics: PromotionsAnalyticsResult;
  getRecoveryPromotions: Array<Promotion>;
  getStoreStatus: StoreStatus;
  getUserPromoMetadata?: Maybe<UserPromoMetadata>;
  getUserPromotions: Array<UserPromotion>;
  inventoryEarnings: InventoryEarnings;
  inventorySummary: InventorySummary;
  me?: Maybe<User>;
  myAddresses: Array<UserAddress>;
  myBehavior?: Maybe<UserBehavior>;
  /** Business user: my messages */
  myBusinessMessages: Array<BusinessMessage>;
  /** Driver: my messages */
  myDriverMessages: Array<DriverMessage>;
  /** Get live metrics for the authenticated driver */
  myDriverMetrics: DriverDailyMetrics;
  myInventory: Array<InventoryItem>;
  notificationCampaign?: Maybe<NotificationCampaign>;
  notificationCampaigns: Array<NotificationCampaign>;
  offers: Array<Product>;
  operationalKPIs: OperationalKpIs;
  order?: Maybe<Order>;
  orderCoverage?: Maybe<OrderCoverage>;
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


export type QueryAdminOrderReviewsArgs = {
  businessId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  rating?: InputMaybe<Scalars['Int']['input']>;
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


export type QueryBusinessOrderFinancialsArgs = {
  businessId: Scalars['ID']['input'];
  orderId: Scalars['ID']['input'];
};


export type QueryBusinessOrderReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBusinessPerformanceStatsArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
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


export type QueryDriverCashSummaryArgs = {
  endDate?: InputMaybe<Scalars['Date']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
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


export type QueryDriverOrderFinancialsArgs = {
  orderId: Scalars['ID']['input'];
};


export type QueryEarningsTrendArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate: Scalars['Date']['input'];
  startDate: Scalars['Date']['input'];
  type?: InputMaybe<SettlementType>;
};


export type QueryGetActiveBannersArgs = {
  displayContext?: InputMaybe<BannerDisplayContext>;
};


export type QueryGetAgoraRtcCredentialsArgs = {
  channelName: Scalars['String']['input'];
  role: AgoraRtcRole;
};


export type QueryGetAllPromotionsArgs = {
  includeRecovery?: InputMaybe<Scalars['Boolean']['input']>;
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
  filter?: InputMaybe<GetBannersFilter>;
};


export type QueryGetPromotionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetPromotionAnalyticsArgs = {
  promotionId: Scalars['ID']['input'];
};


export type QueryGetPromotionAudienceGroupsArgs = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetPromotionThresholdsArgs = {
  cart: CartContextInput;
};


export type QueryGetPromotionUsageArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  promotionId: Scalars['ID']['input'];
};


export type QueryGetPromotionsAnalyticsArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  includeRecovery?: InputMaybe<Scalars['Boolean']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
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


export type QueryInventoryEarningsArgs = {
  businessId: Scalars['ID']['input'];
  endDate?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryInventorySummaryArgs = {
  businessId: Scalars['ID']['input'];
};


export type QueryMyBusinessMessagesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyDriverMessagesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyInventoryArgs = {
  businessId: Scalars['ID']['input'];
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


export type QueryOrderCoverageArgs = {
  orderId: Scalars['ID']['input'];
};


export type QueryOrdersArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  statuses?: InputMaybe<Array<OrderStatus>>;
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


export type QuerySettlementBreakdownArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  driverId?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  isSettled?: InputMaybe<Scalars['Boolean']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  type?: InputMaybe<SettlementType>;
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
  driverId?: InputMaybe<Scalars['ID']['input']>;
  entityType?: InputMaybe<SettlementType>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<SettlementRequestStatus>;
};


export type QuerySettlementRuleArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySettlementRulesArgs = {
  filter?: InputMaybe<SettlementRuleFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySettlementRulesCountArgs = {
  filter?: InputMaybe<SettlementRuleFilterInput>;
};


export type QuerySettlementSummaryArgs = {
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


export type QuerySettlementsArgs = {
  businessId?: InputMaybe<Scalars['ID']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
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

export type RegisterDeviceTokenInput = {
  appType: DeviceAppType;
  deviceId: Scalars['String']['input'];
  platform: DevicePlatform;
  token: Scalars['String']['input'];
};

export type RemovedOrderItem = {
  __typename?: 'RemovedOrderItem';
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  productId: Scalars['ID']['output'];
  reason: Scalars['String']['output'];
  removedAt?: Maybe<Scalars['Date']['output']>;
  /** Original quantity before removal */
  removedQuantity: Scalars['Int']['output'];
  unitPrice: Scalars['Float']['output'];
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

export type SetInventoryQuantityInput = {
  businessId: Scalars['ID']['input'];
  costPrice?: InputMaybe<Scalars['Float']['input']>;
  lowStockThreshold?: InputMaybe<Scalars['Int']['input']>;
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
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
  reason?: Maybe<Scalars['String']['output']>;
  rule?: Maybe<SettlementRule>;
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

export enum SettlementRequestAction {
  Accept = 'ACCEPT',
  Reject = 'REJECT'
}

export enum SettlementRequestStatus {
  Accepted = 'ACCEPTED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
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
  businessGracePeriodMinutes: Scalars['Int']['output'];
  closedMessage?: Maybe<Scalars['String']['output']>;
  directDispatchDriverReserve: Scalars['Int']['output'];
  directDispatchEnabled: Scalars['Boolean']['output'];
  dispatchModeEnabled: Scalars['Boolean']['output'];
  earlyDispatchLeadMinutes: Scalars['Int']['output'];
  /** Distance (km) beyond which gas vehicles are dispatched first. 0 = disabled. */
  farOrderThresholdKm: Scalars['Float']['output'];
  /** Seconds gas drivers get head-start before electric drivers are notified for far orders. */
  gasPriorityWindowSeconds: Scalars['Int']['output'];
  googleMapsNavEnabled: Scalars['Boolean']['output'];
  inventoryModeEnabled: Scalars['Boolean']['output'];
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
  category?: InputMaybe<Scalars['String']['input']>;
  commissionPercentage?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  directDispatchEnabled?: InputMaybe<Scalars['Boolean']['input']>;
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

export type UpdatePromotionAudienceGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  userIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdatePromotionInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
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
  businessGracePeriodMinutes?: InputMaybe<Scalars['Int']['input']>;
  closedMessage?: InputMaybe<Scalars['String']['input']>;
  directDispatchDriverReserve?: InputMaybe<Scalars['Int']['input']>;
  directDispatchEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  dispatchModeEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  earlyDispatchLeadMinutes?: InputMaybe<Scalars['Int']['input']>;
  farOrderThresholdKm?: InputMaybe<Scalars['Float']['input']>;
  gasPriorityWindowSeconds?: InputMaybe<Scalars['Int']['input']>;
  googleMapsNavEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  inventoryModeEnabled?: InputMaybe<Scalars['Boolean']['input']>;
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
  createdAt: Scalars['DateTime']['output'];
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
  isBanned: Scalars['Boolean']['output'];
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
  vehicleType?: Maybe<DriverVehicleType>;
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

export type GetMeBusinessQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMeBusinessQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, permissions: Array<UserPermission>, businessId?: string | null, business?: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean } | null } | null };

export type BusinessLoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type BusinessLoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthResponse', token: string, refreshToken?: string | null, message: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: UserRole, permissions: Array<UserPermission>, businessId?: string | null, business?: { __typename?: 'Business', id: string, name: string, imageUrl?: string | null, businessType: BusinessType, isActive: boolean } | null } } };

export type ChangeMyPasswordMutationVariables = Exact<{
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
}>;


export type ChangeMyPasswordMutation = { __typename?: 'Mutation', changeMyPassword: boolean };

export type SetMyPreferredLanguageMutationVariables = Exact<{
  language: AppLanguage;
}>;


export type SetMyPreferredLanguageMutation = { __typename?: 'Mutation', setMyPreferredLanguage: { __typename?: 'User', id: string, preferredLanguage: AppLanguage } };

export type DeleteMyAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteMyAccountMutation = { __typename?: 'Mutation', deleteMyAccount: boolean };

export type GetBusinessScheduleQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type GetBusinessScheduleQuery = { __typename?: 'Query', business?: { __typename?: 'Business', id: string, schedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> } | null };

export type SetBusinessScheduleMutationVariables = Exact<{
  businessId: Scalars['ID']['input'];
  schedule: Array<BusinessDayHoursInput> | BusinessDayHoursInput;
}>;


export type SetBusinessScheduleMutation = { __typename?: 'Mutation', setBusinessSchedule: Array<{ __typename?: 'BusinessDayHours', id: string, dayOfWeek: number, opensAt: string, closesAt: string }> };

export type GetBusinessOperationsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetBusinessOperationsQuery = { __typename?: 'Query', business?: { __typename?: 'Business', id: string, avgPrepTimeMinutes: number, isTemporarilyClosed: boolean, temporaryClosureReason?: string | null, isOpen: boolean, directDispatchEnabled: boolean } | null };

export type UpdateBusinessOperationsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateBusinessInput;
}>;


export type UpdateBusinessOperationsMutation = { __typename?: 'Mutation', updateBusiness: { __typename?: 'Business', id: string, avgPrepTimeMinutes: number, isTemporarilyClosed: boolean, temporaryClosureReason?: string | null, isOpen: boolean } };

export type BusinessDeviceHeartbeatMutationVariables = Exact<{
  input: BusinessDeviceHeartbeatInput;
}>;


export type BusinessDeviceHeartbeatMutation = { __typename?: 'Mutation', businessDeviceHeartbeat: boolean };

export type BusinessDeviceOrderSignalMutationVariables = Exact<{
  deviceId: Scalars['String']['input'];
  orderId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type BusinessDeviceOrderSignalMutation = { __typename?: 'Mutation', businessDeviceOrderSignal: boolean };

export type MyBusinessMessagesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyBusinessMessagesQuery = { __typename?: 'Query', myBusinessMessages: Array<{ __typename?: 'BusinessMessage', id: string, adminId: string, businessUserId: string, senderRole: string, body: string, alertType: MessageAlertType, readAt?: any | null, createdAt: any }> };

export type BusinessMessageReceivedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type BusinessMessageReceivedSubscription = { __typename?: 'Subscription', businessMessageReceived: { __typename?: 'BusinessMessage', id: string, adminId: string, businessUserId: string, senderRole: string, body: string, alertType: MessageAlertType, readAt?: any | null, createdAt: any } };

export type ReplyToBusinessMessageMutationVariables = Exact<{
  adminId: Scalars['ID']['input'];
  body: Scalars['String']['input'];
}>;


export type ReplyToBusinessMessageMutation = { __typename?: 'Mutation', replyToBusinessMessage: { __typename?: 'BusinessMessage', id: string, adminId: string, businessUserId: string, senderRole: string, body: string, alertType: MessageAlertType, readAt?: any | null, createdAt: any } };

export type MarkBusinessMessagesReadBusinessMutationVariables = Exact<{
  otherUserId: Scalars['ID']['input'];
}>;


export type MarkBusinessMessagesReadBusinessMutation = { __typename?: 'Mutation', markBusinessMessagesRead: boolean };

export type RegisterDeviceTokenMutationVariables = Exact<{
  input: RegisterDeviceTokenInput;
}>;


export type RegisterDeviceTokenMutation = { __typename?: 'Mutation', registerDeviceToken: boolean };

export type UnregisterDeviceTokenMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type UnregisterDeviceTokenMutation = { __typename?: 'Mutation', unregisterDeviceToken: boolean };

export type TrackPushTelemetryMutationVariables = Exact<{
  input: TrackPushTelemetryInput;
}>;


export type TrackPushTelemetryMutation = { __typename?: 'Mutation', trackPushTelemetry: boolean };

export type GetBusinessOrdersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBusinessOrdersQuery = { __typename?: 'Query', orders: { __typename?: 'OrderConnection', totalCount: number, orders: Array<{ __typename?: 'Order', id: string, displayId: string, userId: string, channel: OrderChannel, recipientPhone?: string | null, recipientName?: string | null, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, readyAt?: any | null, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string } | null, dropOffLocation: { __typename?: 'Location', address: string, latitude: number, longitude: number }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, notes?: string | null }> }> }> } };

export type GetBusinessOrderReviewsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetBusinessOrderReviewsQuery = { __typename?: 'Query', businessOrderReviews: Array<{ __typename?: 'OrderReview', id: string, orderId: string, rating: number, comment?: string | null, quickFeedback: Array<string>, createdAt: any, user?: { __typename?: 'OrderReviewUser', id: string, firstName: string, lastName: string, phoneNumber?: string | null } | null }> };

export type UpdateOrderStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: OrderStatus;
}>;


export type UpdateOrderStatusMutation = { __typename?: 'Mutation', updateOrderStatus: { __typename?: 'Order', id: string, status: OrderStatus, updatedAt: any } };

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

export type AllOrdersUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type AllOrdersUpdatedSubscription = { __typename?: 'Subscription', allOrdersUpdated: Array<{ __typename?: 'Order', id: string, displayId: string, userId: string, channel: OrderChannel, recipientPhone?: string | null, recipientName?: string | null, orderPrice: number, deliveryPrice: number, totalPrice: number, orderDate: any, updatedAt: any, status: OrderStatus, preparationMinutes?: number | null, estimatedReadyAt?: any | null, preparingAt?: any | null, readyAt?: any | null, user?: { __typename?: 'User', id: string, firstName: string, lastName: string, phoneNumber?: string | null } | null, driver?: { __typename?: 'User', id: string, firstName: string, lastName: string } | null, dropOffLocation: { __typename?: 'Location', address: string, latitude: number, longitude: number }, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, notes?: string | null }> }> }> };

export type RemoveOrderItemMutationVariables = Exact<{
  orderId: Scalars['ID']['input'];
  orderItemId: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
  quantity?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RemoveOrderItemMutation = { __typename?: 'Mutation', removeOrderItem: { __typename?: 'Order', id: string, orderPrice: number, deliveryPrice: number, totalPrice: number, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string }, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, name: string, imageUrl?: string | null, quantity: number, unitPrice: number, notes?: string | null }> }> } };

export type DirectDispatchAvailabilityQueryVariables = Exact<{ [key: string]: never; }>;


export type DirectDispatchAvailabilityQuery = { __typename?: 'Query', directDispatchAvailability: { __typename?: 'DirectDispatchAvailability', available: boolean, reason?: string | null, freeDriverCount: number } };

export type CreateDirectDispatchOrderMutationVariables = Exact<{
  input: CreateDirectDispatchOrderInput;
}>;


export type CreateDirectDispatchOrderMutation = { __typename?: 'Mutation', createDirectDispatchOrder: { __typename?: 'Order', id: string, displayId: string, status: OrderStatus, channel: OrderChannel, recipientPhone?: string | null, recipientName?: string | null, driverNotes?: string | null, dropOffLocation: { __typename?: 'Location', address: string, latitude: number, longitude: number } } };

export type GetBusinessProductsQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type GetBusinessProductsQuery = { __typename?: 'Query', products: Array<{ __typename?: 'ProductCard', id: string, name: string, imageUrl?: string | null, basePrice: number, isOffer: boolean, product?: { __typename?: 'Product', id: string, businessId: string, categoryId: string, subcategoryId?: string | null, name: string, description?: string | null, imageUrl?: string | null, price: number, isOnSale: boolean, saleDiscountPercentage?: number | null, isAvailable: boolean, sortOrder: number, createdAt: string, updatedAt: string } | null, variants: Array<{ __typename?: 'Product', id: string, categoryId: string }> }>, productCategories: Array<{ __typename?: 'ProductCategory', id: string, businessId: string, name: string, isActive: boolean }> };

export type CreateProductMutationVariables = Exact<{
  input: CreateProductInput;
}>;


export type CreateProductMutation = { __typename?: 'Mutation', createProduct: { __typename?: 'Product', id: string, name: string, description?: string | null, imageUrl?: string | null, price: number, isAvailable: boolean } };

export type UpdateProductMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
}>;


export type UpdateProductMutation = { __typename?: 'Mutation', updateProduct: { __typename?: 'Product', id: string, name: string, description?: string | null, imageUrl?: string | null, price: number, isOnSale: boolean, saleDiscountPercentage?: number | null, isAvailable: boolean } };

export type DeleteProductMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteProductMutation = { __typename?: 'Mutation', deleteProduct: boolean };

export type CreateCategoryMutationVariables = Exact<{
  input: CreateProductCategoryInput;
}>;


export type CreateCategoryMutation = { __typename?: 'Mutation', createProductCategory: { __typename?: 'ProductCategory', id: string, businessId: string, name: string, isActive: boolean } };

export type GetMyBusinessSettlementsQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
  status?: InputMaybe<SettlementStatus>;
  direction?: InputMaybe<SettlementDirection>;
  category?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetMyBusinessSettlementsQuery = { __typename?: 'Query', settlements: Array<{ __typename?: 'Settlement', id: string, amount: number, currency: string, status: SettlementStatus, direction: SettlementDirection, reason?: string | null, paidAt?: any | null, paymentReference?: string | null, paymentMethod?: string | null, createdAt: any, rule?: { __typename?: 'SettlementRule', id: string, name: string, type: SettlementRuleType, direction: SettlementDirection, promotion?: { __typename?: 'Promotion', id: string } | null } | null, order?: { __typename?: 'Order', id: string, displayId: string, orderPrice: number, deliveryPrice: number, originalPrice?: number | null, totalPrice: number, orderDate: any, status: OrderStatus, orderPromotions?: Array<{ __typename?: 'OrderPromotion', id: string, appliesTo: PromotionAppliesTo, discountAmount: number }> | null, businesses: Array<{ __typename?: 'OrderBusiness', business: { __typename?: 'Business', id: string, name: string }, items: Array<{ __typename?: 'OrderItem', id: string, name: string, quantity: number, unitPrice: number, notes?: string | null, selectedOptions: Array<{ __typename?: 'OrderItemOption', optionGroupName: string, optionName: string, priceAtOrder: number }>, childItems: Array<{ __typename?: 'OrderItem', id: string, name: string, quantity: number, unitPrice: number }> }> }> } | null }> };

export type GetMyBusinessSettlementSummaryQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
  startDate?: InputMaybe<Scalars['Date']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
}>;


export type GetMyBusinessSettlementSummaryQuery = { __typename?: 'Query', settlementSummary: { __typename?: 'SettlementSummary', totalAmount: number, totalPending: number, totalPaid: number, totalReceivable: number, totalPayable: number, count: number, pendingCount: number } };

export type GetLastBusinessPaidSettlementQueryVariables = Exact<{
  businessId: Scalars['ID']['input'];
}>;


export type GetLastBusinessPaidSettlementQuery = { __typename?: 'Query', settlements: Array<{ __typename?: 'Settlement', id: string, paidAt?: any | null, createdAt: any }> };

export type GetMySettlementRequestsQueryVariables = Exact<{
  businessId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<SettlementRequestStatus>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetMySettlementRequestsQuery = { __typename?: 'Query', settlementRequests: Array<{ __typename?: 'SettlementRequest', id: string, amount: number, note?: string | null, status: SettlementRequestStatus, reason?: string | null, createdAt: any, respondedAt?: any | null, settlementPayment?: { __typename?: 'SettlementPayment', id: string, amount: number, direction?: SettlementPaymentDirection | null, createdAt: any } | null }> };

export type RespondToSettlementRequestMutationVariables = Exact<{
  requestId: Scalars['ID']['input'];
  action: SettlementRequestAction;
  reason?: InputMaybe<Scalars['String']['input']>;
}>;


export type RespondToSettlementRequestMutation = { __typename?: 'Mutation', respondToSettlementRequest: { __typename?: 'SettlementRequest', id: string, status: SettlementRequestStatus, respondedAt?: any | null, reason?: string | null } };

export type GetBusinessSettlementBreakdownQueryVariables = Exact<{
  businessId?: InputMaybe<Scalars['ID']['input']>;
  isSettled?: InputMaybe<Scalars['Boolean']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
}>;


export type GetBusinessSettlementBreakdownQuery = { __typename?: 'Query', settlementBreakdown: Array<{ __typename?: 'SettlementBreakdownItem', category: string, label: string, totalAmount: number, count: number, direction: SettlementDirection }> };

export type GetStoreStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetStoreStatusQuery = { __typename?: 'Query', getStoreStatus: { __typename?: 'StoreStatus', isStoreClosed: boolean, closedMessage?: string | null, bannerEnabled: boolean, bannerMessage?: string | null, bannerType: BannerType, directDispatchEnabled: boolean } };


export const GetMeBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMeBusiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}},{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]}}]} as unknown as DocumentNode<GetMeBusinessQuery, GetMeBusinessQueryVariables>;
export const BusinessLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BusinessLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}},{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"businessType"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<BusinessLoginMutation, BusinessLoginMutationVariables>;
export const ChangeMyPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeMyPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeMyPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"currentPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}}}]}]}}]} as unknown as DocumentNode<ChangeMyPasswordMutation, ChangeMyPasswordMutationVariables>;
export const SetMyPreferredLanguageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetMyPreferredLanguage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AppLanguage"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setMyPreferredLanguage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preferredLanguage"}}]}}]}}]} as unknown as DocumentNode<SetMyPreferredLanguageMutation, SetMyPreferredLanguageMutationVariables>;
export const DeleteMyAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteMyAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteMyAccount"}}]}}]} as unknown as DocumentNode<DeleteMyAccountMutation, DeleteMyAccountMutationVariables>;
export const GetBusinessScheduleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinessSchedule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetBusinessScheduleQuery, GetBusinessScheduleQueryVariables>;
export const SetBusinessScheduleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetBusinessSchedule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BusinessDayHoursInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setBusinessSchedule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"schedule"},"value":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfWeek"}},{"kind":"Field","name":{"kind":"Name","value":"opensAt"}},{"kind":"Field","name":{"kind":"Name","value":"closesAt"}}]}}]}}]} as unknown as DocumentNode<SetBusinessScheduleMutation, SetBusinessScheduleMutationVariables>;
export const GetBusinessOperationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinessOperations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"isTemporarilyClosed"}},{"kind":"Field","name":{"kind":"Name","value":"temporaryClosureReason"}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}},{"kind":"Field","name":{"kind":"Name","value":"directDispatchEnabled"}}]}}]}}]} as unknown as DocumentNode<GetBusinessOperationsQuery, GetBusinessOperationsQueryVariables>;
export const UpdateBusinessOperationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBusinessOperations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateBusinessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBusiness"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"avgPrepTimeMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"isTemporarilyClosed"}},{"kind":"Field","name":{"kind":"Name","value":"temporaryClosureReason"}},{"kind":"Field","name":{"kind":"Name","value":"isOpen"}}]}}]}}]} as unknown as DocumentNode<UpdateBusinessOperationsMutation, UpdateBusinessOperationsMutationVariables>;
export const BusinessDeviceHeartbeatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BusinessDeviceHeartbeat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BusinessDeviceHeartbeatInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businessDeviceHeartbeat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<BusinessDeviceHeartbeatMutation, BusinessDeviceHeartbeatMutationVariables>;
export const BusinessDeviceOrderSignalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BusinessDeviceOrderSignal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businessDeviceOrderSignal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"deviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}}]}]}}]} as unknown as DocumentNode<BusinessDeviceOrderSignalMutation, BusinessDeviceOrderSignalMutationVariables>;
export const MyBusinessMessagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyBusinessMessages"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myBusinessMessages"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"adminId"}},{"kind":"Field","name":{"kind":"Name","value":"businessUserId"}},{"kind":"Field","name":{"kind":"Name","value":"senderRole"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"alertType"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<MyBusinessMessagesQuery, MyBusinessMessagesQueryVariables>;
export const BusinessMessageReceivedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"BusinessMessageReceived"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businessMessageReceived"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"adminId"}},{"kind":"Field","name":{"kind":"Name","value":"businessUserId"}},{"kind":"Field","name":{"kind":"Name","value":"senderRole"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"alertType"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<BusinessMessageReceivedSubscription, BusinessMessageReceivedSubscriptionVariables>;
export const ReplyToBusinessMessageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReplyToBusinessMessage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"adminId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"body"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"replyToBusinessMessage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"adminId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"adminId"}}},{"kind":"Argument","name":{"kind":"Name","value":"body"},"value":{"kind":"Variable","name":{"kind":"Name","value":"body"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"adminId"}},{"kind":"Field","name":{"kind":"Name","value":"businessUserId"}},{"kind":"Field","name":{"kind":"Name","value":"senderRole"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"alertType"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<ReplyToBusinessMessageMutation, ReplyToBusinessMessageMutationVariables>;
export const MarkBusinessMessagesReadBusinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkBusinessMessagesReadBusiness"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"otherUserId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markBusinessMessagesRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"otherUserId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"otherUserId"}}}]}]}}]} as unknown as DocumentNode<MarkBusinessMessagesReadBusinessMutation, MarkBusinessMessagesReadBusinessMutationVariables>;
export const RegisterDeviceTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RegisterDeviceToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterDeviceTokenInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registerDeviceToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<RegisterDeviceTokenMutation, RegisterDeviceTokenMutationVariables>;
export const UnregisterDeviceTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnregisterDeviceToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unregisterDeviceToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}]}]}}]} as unknown as DocumentNode<UnregisterDeviceTokenMutation, UnregisterDeviceTokenMutationVariables>;
export const TrackPushTelemetryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TrackPushTelemetry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TrackPushTelemetryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trackPushTelemetry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<TrackPushTelemetryMutation, TrackPushTelemetryMutationVariables>;
export const GetBusinessOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinessOrders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"recipientPhone"}},{"kind":"Field","name":{"kind":"Name","value":"recipientName"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"readyAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetBusinessOrdersQuery, GetBusinessOrdersQueryVariables>;
export const GetBusinessOrderReviewsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinessOrderReviews"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businessOrderReviews"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"rating"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"quickFeedback"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}}]}}]}}]} as unknown as DocumentNode<GetBusinessOrderReviewsQuery, GetBusinessOrderReviewsQueryVariables>;
export const UpdateOrderStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateOrderStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOrderStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateOrderStatusMutation, UpdateOrderStatusMutationVariables>;
export const StartPreparingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartPreparing"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startPreparing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"preparationMinutes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}}]}}]}}]} as unknown as DocumentNode<StartPreparingMutation, StartPreparingMutationVariables>;
export const UpdatePreparationTimeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePreparationTime"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePreparationTime"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"preparationMinutes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"preparationMinutes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}}]}}]}}]} as unknown as DocumentNode<UpdatePreparationTimeMutation, UpdatePreparationTimeMutationVariables>;
export const AllOrdersUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"AllOrdersUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allOrdersUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"recipientPhone"}},{"kind":"Field","name":{"kind":"Name","value":"recipientName"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"preparationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedReadyAt"}},{"kind":"Field","name":{"kind":"Name","value":"preparingAt"}},{"kind":"Field","name":{"kind":"Name","value":"readyAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]}}]} as unknown as DocumentNode<AllOrdersUpdatedSubscription, AllOrdersUpdatedSubscriptionVariables>;
export const RemoveOrderItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveOrderItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderItemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reason"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeOrderItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}},{"kind":"Argument","name":{"kind":"Name","value":"orderItemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderItemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"reason"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reason"}}},{"kind":"Argument","name":{"kind":"Name","value":"quantity"},"value":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]}}]} as unknown as DocumentNode<RemoveOrderItemMutation, RemoveOrderItemMutationVariables>;
export const DirectDispatchAvailabilityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DirectDispatchAvailability"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"directDispatchAvailability"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"available"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"freeDriverCount"}}]}}]}}]} as unknown as DocumentNode<DirectDispatchAvailabilityQuery, DirectDispatchAvailabilityQueryVariables>;
export const CreateDirectDispatchOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateDirectDispatchOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateDirectDispatchOrderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createDirectDispatchOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"recipientPhone"}},{"kind":"Field","name":{"kind":"Name","value":"recipientName"}},{"kind":"Field","name":{"kind":"Name","value":"dropOffLocation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}}]}},{"kind":"Field","name":{"kind":"Name","value":"driverNotes"}}]}}]}}]} as unknown as DocumentNode<CreateDirectDispatchOrderMutation, CreateDirectDispatchOrderMutationVariables>;
export const GetBusinessProductsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinessProducts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"basePrice"}},{"kind":"Field","name":{"kind":"Name","value":"isOffer"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}},{"kind":"Field","name":{"kind":"Name","value":"subcategoryId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"isOnSale"}},{"kind":"Field","name":{"kind":"Name","value":"saleDiscountPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"categoryId"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"productCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<GetBusinessProductsQuery, GetBusinessProductsQueryVariables>;
export const CreateProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}}]}}]}}]} as unknown as DocumentNode<CreateProductMutation, CreateProductMutationVariables>;
export const UpdateProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"isOnSale"}},{"kind":"Field","name":{"kind":"Name","value":"saleDiscountPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"isAvailable"}}]}}]}}]} as unknown as DocumentNode<UpdateProductMutation, UpdateProductMutationVariables>;
export const DeleteProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteProductMutation, DeleteProductMutationVariables>;
export const CreateCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProductCategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProductCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"businessId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<CreateCategoryMutation, CreateCategoryMutationVariables>;
export const GetMyBusinessSettlementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyBusinessSettlements"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SettlementStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"direction"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SettlementDirection"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"category"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settlements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"EnumValue","value":"BUSINESS"}},{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"direction"},"value":{"kind":"Variable","name":{"kind":"Name","value":"direction"}}},{"kind":"Argument","name":{"kind":"Name","value":"category"},"value":{"kind":"Variable","name":{"kind":"Name","value":"category"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"direction"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"paidAt"}},{"kind":"Field","name":{"kind":"Name","value":"paymentReference"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethod"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"rule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"direction"}},{"kind":"Field","name":{"kind":"Name","value":"promotion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"order"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayId"}},{"kind":"Field","name":{"kind":"Name","value":"orderPrice"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryPrice"}},{"kind":"Field","name":{"kind":"Name","value":"originalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"totalPrice"}},{"kind":"Field","name":{"kind":"Name","value":"orderDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"orderPromotions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"appliesTo"}},{"kind":"Field","name":{"kind":"Name","value":"discountAmount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"businesses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"business"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"selectedOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"optionGroupName"}},{"kind":"Field","name":{"kind":"Name","value":"optionName"}},{"kind":"Field","name":{"kind":"Name","value":"priceAtOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetMyBusinessSettlementsQuery, GetMyBusinessSettlementsQueryVariables>;
export const GetMyBusinessSettlementSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyBusinessSettlementSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settlementSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"EnumValue","value":"BUSINESS"}},{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"totalPending"}},{"kind":"Field","name":{"kind":"Name","value":"totalPaid"}},{"kind":"Field","name":{"kind":"Name","value":"totalReceivable"}},{"kind":"Field","name":{"kind":"Name","value":"totalPayable"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCount"}}]}}]}}]} as unknown as DocumentNode<GetMyBusinessSettlementSummaryQuery, GetMyBusinessSettlementSummaryQueryVariables>;
export const GetLastBusinessPaidSettlementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLastBusinessPaidSettlement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settlements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"EnumValue","value":"BUSINESS"}},{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"EnumValue","value":"PAID"}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"1"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"paidAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetLastBusinessPaidSettlementQuery, GetLastBusinessPaidSettlementQueryVariables>;
export const GetMySettlementRequestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMySettlementRequests"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SettlementRequestStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settlementRequests"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"respondedAt"}},{"kind":"Field","name":{"kind":"Name","value":"settlementPayment"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"direction"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetMySettlementRequestsQuery, GetMySettlementRequestsQueryVariables>;
export const RespondToSettlementRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RespondToSettlementRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requestId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"action"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SettlementRequestAction"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reason"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"respondToSettlementRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"requestId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requestId"}}},{"kind":"Argument","name":{"kind":"Name","value":"action"},"value":{"kind":"Variable","name":{"kind":"Name","value":"action"}}},{"kind":"Argument","name":{"kind":"Name","value":"reason"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reason"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"respondedAt"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}}]}}]}}]} as unknown as DocumentNode<RespondToSettlementRequestMutation, RespondToSettlementRequestMutationVariables>;
export const GetBusinessSettlementBreakdownDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBusinessSettlementBreakdown"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isSettled"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settlementBreakdown"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"EnumValue","value":"BUSINESS"}},{"kind":"Argument","name":{"kind":"Name","value":"businessId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessId"}}},{"kind":"Argument","name":{"kind":"Name","value":"isSettled"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isSettled"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"endDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"direction"}}]}}]}}]} as unknown as DocumentNode<GetBusinessSettlementBreakdownQuery, GetBusinessSettlementBreakdownQueryVariables>;
export const GetStoreStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetStoreStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getStoreStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isStoreClosed"}},{"kind":"Field","name":{"kind":"Name","value":"closedMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"bannerMessage"}},{"kind":"Field","name":{"kind":"Name","value":"bannerType"}},{"kind":"Field","name":{"kind":"Name","value":"directDispatchEnabled"}}]}}]}}]} as unknown as DocumentNode<GetStoreStatusQuery, GetStoreStatusQueryVariables>;