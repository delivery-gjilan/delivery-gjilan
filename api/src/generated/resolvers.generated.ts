/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { auditLog as Query_auditLog } from './../models/AuditLog/resolvers/Query/auditLog';
import    { auditLogs as Query_auditLogs } from './../models/AuditLog/resolvers/Query/auditLogs';
import    { business as Query_business } from './../models/Business/resolvers/Query/business';
import    { businessBalance as Query_businessBalance } from './../models/Settlement/resolvers/Query/businessBalance';
import    { businessDeviceHealth as Query_businessDeviceHealth } from './../models/Notification/resolvers/Query/businessDeviceHealth';
import    { businesses as Query_businesses } from './../models/Business/resolvers/Query/businesses';
import    { calculateDeliveryPrice as Query_calculateDeliveryPrice } from './../models/DeliveryPricing/resolvers/Query/calculateDeliveryPrice';
import    { deliveryPricingConfig as Query_deliveryPricingConfig } from './../models/DeliveryPricing/resolvers/Query/deliveryPricingConfig';
import    { deliveryPricingTiers as Query_deliveryPricingTiers } from './../models/DeliveryPricing/resolvers/Query/deliveryPricingTiers';
import    { deliveryZones as Query_deliveryZones } from './../models/DeliveryZone/resolvers/Query/deliveryZones';
import    { deviceTokens as Query_deviceTokens } from './../models/Notification/resolvers/Query/deviceTokens';
import    { driverBalance as Query_driverBalance } from './../models/Settlement/resolvers/Query/driverBalance';
import    { drivers as Query_drivers } from './../models/User/resolvers/Query/drivers';
import    { getAgoraRtcCredentials as Query_getAgoraRtcCredentials } from './../models/Driver/resolvers/Query/getAgoraRtcCredentials';
import    { getAllPromotions as Query_getAllPromotions } from './../models/Promotion/resolvers/Query/getAllPromotions';
import    { getApplicablePromotions as Query_getApplicablePromotions } from './../models/Promotion/resolvers/Query/getApplicablePromotions';
import    { getBanner as Query_getBanner } from './../models/Banner/resolvers/Query/getBanner';
import    { getBanners as Query_getBanners } from './../models/Banner/resolvers/Query/getBanners';
import    { getPromotion as Query_getPromotion } from './../models/Promotion/resolvers/Query/getPromotion';
import    { getPromotionAnalytics as Query_getPromotionAnalytics } from './../models/Promotion/resolvers/Query/getPromotionAnalytics';
import    { getPromotionThresholds as Query_getPromotionThresholds } from './../models/Promotion/resolvers/Query/getPromotionThresholds';
import    { getPromotionUsage as Query_getPromotionUsage } from './../models/Promotion/resolvers/Query/getPromotionUsage';
import    { getStoreStatus as Query_getStoreStatus } from './../models/General/resolvers/Query/getStoreStatus';
import    { getUserPromoMetadata as Query_getUserPromoMetadata } from './../models/Promotion/resolvers/Query/getUserPromoMetadata';
import    { getUserPromotions as Query_getUserPromotions } from './../models/Promotion/resolvers/Query/getUserPromotions';
import    { me as Query_me } from './../models/User/resolvers/Query/me';
import    { myAddresses as Query_myAddresses } from './../models/UserAddress/resolvers/Query/myAddresses';
import    { myBehavior as Query_myBehavior } from './../models/User/resolvers/Query/myBehavior';
import    { myDriverMetrics as Query_myDriverMetrics } from './../models/Driver/resolvers/Query/myDriverMetrics';
import    { myReferralStats as Query_myReferralStats } from './../models/User/resolvers/Query/myReferralStats';
import    { notificationCampaign as Query_notificationCampaign } from './../models/Notification/resolvers/Query/notificationCampaign';
import    { notificationCampaigns as Query_notificationCampaigns } from './../models/Notification/resolvers/Query/notificationCampaigns';
import    { offers as Query_offers } from './../models/Product/resolvers/Query/offers';
import    { order as Query_order } from './../models/Order/resolvers/Query/order';
import    { orders as Query_orders } from './../models/Order/resolvers/Query/orders';
import    { ordersByStatus as Query_ordersByStatus } from './../models/Order/resolvers/Query/ordersByStatus';
import    { previewCampaignAudience as Query_previewCampaignAudience } from './../models/Notification/resolvers/Query/previewCampaignAudience';
import    { product as Query_product } from './../models/Product/resolvers/Query/product';
import    { productCategories as Query_productCategories } from './../models/ProductCategory/resolvers/Query/productCategories';
import    { productCategory as Query_productCategory } from './../models/ProductCategory/resolvers/Query/productCategory';
import    { productSubcategories as Query_productSubcategories } from './../models/ProductSubcategory/resolvers/Query/productSubcategories';
import    { productSubcategoriesByBusiness as Query_productSubcategoriesByBusiness } from './../models/ProductSubcategory/resolvers/Query/productSubcategoriesByBusiness';
import    { products as Query_products } from './../models/Product/resolvers/Query/products';
import    { pushTelemetryEvents as Query_pushTelemetryEvents } from './../models/Notification/resolvers/Query/pushTelemetryEvents';
import    { pushTelemetrySummary as Query_pushTelemetrySummary } from './../models/Notification/resolvers/Query/pushTelemetrySummary';
import    { settlementRule as Query_settlementRule } from './../models/SettlementRule/resolvers/Query/settlementRule';
import    { settlementRules as Query_settlementRules } from './../models/SettlementRule/resolvers/Query/settlementRules';
import    { settlementScenarioDefinitions as Query_settlementScenarioDefinitions } from './../models/Settlement/resolvers/Query/settlementScenarioDefinitions';
import    { settlementSummary as Query_settlementSummary } from './../models/Settlement/resolvers/Query/settlementSummary';
import    { settlements as Query_settlements } from './../models/Settlement/resolvers/Query/settlements';
import    { uncompletedOrders as Query_uncompletedOrders } from './../models/Order/resolvers/Query/uncompletedOrders';
import    { userBehavior as Query_userBehavior } from './../models/User/resolvers/Query/userBehavior';
import    { users as Query_users } from './../models/User/resolvers/Query/users';
import    { validatePromotions as Query_validatePromotions } from './../models/Promotion/resolvers/Query/validatePromotions';
import    { addUserAddress as Mutation_addUserAddress } from './../models/UserAddress/resolvers/Mutation/addUserAddress';
import    { adminSendPttSignal as Mutation_adminSendPttSignal } from './../models/Driver/resolvers/Mutation/adminSendPttSignal';
import    { adminSetDriverConnectionStatus as Mutation_adminSetDriverConnectionStatus } from './../models/Driver/resolvers/Mutation/adminSetDriverConnectionStatus';
import    { adminUpdateDriverLocation as Mutation_adminUpdateDriverLocation } from './../models/User/resolvers/Mutation/adminUpdateDriverLocation';
import    { adminUpdateDriverSettings as Mutation_adminUpdateDriverSettings } from './../models/Driver/resolvers/Mutation/adminUpdateDriverSettings';
import    { assignDriverToOrder as Mutation_assignDriverToOrder } from './../models/Order/resolvers/Mutation/assignDriverToOrder';
import    { assignPromotionToUsers as Mutation_assignPromotionToUsers } from './../models/Promotion/resolvers/Mutation/assignPromotionToUsers';
import    { backfillSettlementsForDeliveredOrders as Mutation_backfillSettlementsForDeliveredOrders } from './../models/Settlement/resolvers/Mutation/backfillSettlementsForDeliveredOrders';
import    { businessDeviceHeartbeat as Mutation_businessDeviceHeartbeat } from './../models/Notification/resolvers/Mutation/businessDeviceHeartbeat';
import    { businessDeviceOrderSignal as Mutation_businessDeviceOrderSignal } from './../models/Notification/resolvers/Mutation/businessDeviceOrderSignal';
import    { cancelOrder as Mutation_cancelOrder } from './../models/Order/resolvers/Mutation/cancelOrder';
import    { createBanner as Mutation_createBanner } from './../models/Banner/resolvers/Mutation/createBanner';
import    { createBusiness as Mutation_createBusiness } from './../models/Business/resolvers/Mutation/createBusiness';
import    { createCampaign as Mutation_createCampaign } from './../models/Notification/resolvers/Mutation/createCampaign';
import    { createDeliveryPricingTier as Mutation_createDeliveryPricingTier } from './../models/DeliveryPricing/resolvers/Mutation/createDeliveryPricingTier';
import    { createDeliveryZone as Mutation_createDeliveryZone } from './../models/DeliveryZone/resolvers/Mutation/createDeliveryZone';
import    { createOption as Mutation_createOption } from './../models/Product/resolvers/Mutation/createOption';
import    { createOptionGroup as Mutation_createOptionGroup } from './../models/Product/resolvers/Mutation/createOptionGroup';
import    { createOrder as Mutation_createOrder } from './../models/Order/resolvers/Mutation/createOrder';
import    { createProduct as Mutation_createProduct } from './../models/Product/resolvers/Mutation/createProduct';
import    { createProductCategory as Mutation_createProductCategory } from './../models/ProductCategory/resolvers/Mutation/createProductCategory';
import    { createProductSubcategory as Mutation_createProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/createProductSubcategory';
import    { createProductVariantGroup as Mutation_createProductVariantGroup } from './../models/Product/resolvers/Mutation/createProductVariantGroup';
import    { createPromotion as Mutation_createPromotion } from './../models/Promotion/resolvers/Mutation/createPromotion';
import    { createSettlementRule as Mutation_createSettlementRule } from './../models/SettlementRule/resolvers/Mutation/createSettlementRule';
import    { createTestOrder as Mutation_createTestOrder } from './../models/Order/resolvers/Mutation/createTestOrder';
import    { createUser as Mutation_createUser } from './../models/User/resolvers/Mutation/createUser';
import    { deleteBanner as Mutation_deleteBanner } from './../models/Banner/resolvers/Mutation/deleteBanner';
import    { deleteBusiness as Mutation_deleteBusiness } from './../models/Business/resolvers/Mutation/deleteBusiness';
import    { deleteCampaign as Mutation_deleteCampaign } from './../models/Notification/resolvers/Mutation/deleteCampaign';
import    { deleteDeliveryPricingTier as Mutation_deleteDeliveryPricingTier } from './../models/DeliveryPricing/resolvers/Mutation/deleteDeliveryPricingTier';
import    { deleteDeliveryZone as Mutation_deleteDeliveryZone } from './../models/DeliveryZone/resolvers/Mutation/deleteDeliveryZone';
import    { deleteMyAccount as Mutation_deleteMyAccount } from './../models/User/resolvers/Mutation/deleteMyAccount';
import    { deleteOption as Mutation_deleteOption } from './../models/Product/resolvers/Mutation/deleteOption';
import    { deleteOptionGroup as Mutation_deleteOptionGroup } from './../models/Product/resolvers/Mutation/deleteOptionGroup';
import    { deleteProduct as Mutation_deleteProduct } from './../models/Product/resolvers/Mutation/deleteProduct';
import    { deleteProductCategory as Mutation_deleteProductCategory } from './../models/ProductCategory/resolvers/Mutation/deleteProductCategory';
import    { deleteProductSubcategory as Mutation_deleteProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/deleteProductSubcategory';
import    { deleteProductVariantGroup as Mutation_deleteProductVariantGroup } from './../models/Product/resolvers/Mutation/deleteProductVariantGroup';
import    { deletePromotion as Mutation_deletePromotion } from './../models/Promotion/resolvers/Mutation/deletePromotion';
import    { deleteSettlementRule as Mutation_deleteSettlementRule } from './../models/SettlementRule/resolvers/Mutation/deleteSettlementRule';
import    { deleteUser as Mutation_deleteUser } from './../models/User/resolvers/Mutation/deleteUser';
import    { deleteUserAddress as Mutation_deleteUserAddress } from './../models/UserAddress/resolvers/Mutation/deleteUserAddress';
import    { driverHeartbeat as Mutation_driverHeartbeat } from './../models/Driver/resolvers/Mutation/driverHeartbeat';
import    { driverNotifyCustomer as Mutation_driverNotifyCustomer } from './../models/Order/resolvers/Mutation/driverNotifyCustomer';
import    { driverUpdateBatteryStatus as Mutation_driverUpdateBatteryStatus } from './../models/Driver/resolvers/Mutation/driverUpdateBatteryStatus';
import    { generateReferralCode as Mutation_generateReferralCode } from './../models/User/resolvers/Mutation/generateReferralCode';
import    { initiateSignup as Mutation_initiateSignup } from './../models/User/resolvers/Mutation/initiateSignup';
import    { login as Mutation_login } from './../models/User/resolvers/Mutation/login';
import    { logoutAllSessions as Mutation_logoutAllSessions } from './../models/User/resolvers/Mutation/logoutAllSessions';
import    { logoutCurrentSession as Mutation_logoutCurrentSession } from './../models/User/resolvers/Mutation/logoutCurrentSession';
import    { markFirstOrderUsed as Mutation_markFirstOrderUsed } from './../models/Promotion/resolvers/Mutation/markFirstOrderUsed';
import    { markSettlementAsPaid as Mutation_markSettlementAsPaid } from './../models/Settlement/resolvers/Mutation/markSettlementAsPaid';
import    { markSettlementAsPartiallyPaid as Mutation_markSettlementAsPartiallyPaid } from './../models/Settlement/resolvers/Mutation/markSettlementAsPartiallyPaid';
import    { markSettlementsAsPaid as Mutation_markSettlementsAsPaid } from './../models/Settlement/resolvers/Mutation/markSettlementsAsPaid';
import    { refreshToken as Mutation_refreshToken } from './../models/User/resolvers/Mutation/refreshToken';
import    { registerDeviceToken as Mutation_registerDeviceToken } from './../models/Notification/resolvers/Mutation/registerDeviceToken';
import    { registerLiveActivityToken as Mutation_registerLiveActivityToken } from './../models/Notification/resolvers/Mutation/registerLiveActivityToken';
import    { removeUserFromPromotion as Mutation_removeUserFromPromotion } from './../models/Promotion/resolvers/Mutation/removeUserFromPromotion';
import    { resendEmailVerification as Mutation_resendEmailVerification } from './../models/User/resolvers/Mutation/resendEmailVerification';
import    { runSettlementScenarioHarness as Mutation_runSettlementScenarioHarness } from './../models/Settlement/resolvers/Mutation/runSettlementScenarioHarness';
import    { sendCampaign as Mutation_sendCampaign } from './../models/Notification/resolvers/Mutation/sendCampaign';
import    { sendPushNotification as Mutation_sendPushNotification } from './../models/Notification/resolvers/Mutation/sendPushNotification';
import    { setBusinessSchedule as Mutation_setBusinessSchedule } from './../models/Business/resolvers/Mutation/setBusinessSchedule';
import    { setDefaultAddress as Mutation_setDefaultAddress } from './../models/UserAddress/resolvers/Mutation/setDefaultAddress';
import    { setDeliveryPricingTiers as Mutation_setDeliveryPricingTiers } from './../models/DeliveryPricing/resolvers/Mutation/setDeliveryPricingTiers';
import    { setMyPreferredLanguage as Mutation_setMyPreferredLanguage } from './../models/User/resolvers/Mutation/setMyPreferredLanguage';
import    { setUserPermissions as Mutation_setUserPermissions } from './../models/User/resolvers/Mutation/setUserPermissions';
import    { startPreparing as Mutation_startPreparing } from './../models/Order/resolvers/Mutation/startPreparing';
import    { submitPhoneNumber as Mutation_submitPhoneNumber } from './../models/User/resolvers/Mutation/submitPhoneNumber';
import    { trackPushTelemetry as Mutation_trackPushTelemetry } from './../models/Notification/resolvers/Mutation/trackPushTelemetry';
import    { unregisterDeviceToken as Mutation_unregisterDeviceToken } from './../models/Notification/resolvers/Mutation/unregisterDeviceToken';
import    { unsettleSettlement as Mutation_unsettleSettlement } from './../models/Settlement/resolvers/Mutation/unsettleSettlement';
import    { updateBanner as Mutation_updateBanner } from './../models/Banner/resolvers/Mutation/updateBanner';
import    { updateBannerOrder as Mutation_updateBannerOrder } from './../models/Banner/resolvers/Mutation/updateBannerOrder';
import    { updateBusiness as Mutation_updateBusiness } from './../models/Business/resolvers/Mutation/updateBusiness';
import    { updateDeliveryPricingTier as Mutation_updateDeliveryPricingTier } from './../models/DeliveryPricing/resolvers/Mutation/updateDeliveryPricingTier';
import    { updateDeliveryZone as Mutation_updateDeliveryZone } from './../models/DeliveryZone/resolvers/Mutation/updateDeliveryZone';
import    { updateDriverLocation as Mutation_updateDriverLocation } from './../models/User/resolvers/Mutation/updateDriverLocation';
import    { updateDriverOnlineStatus as Mutation_updateDriverOnlineStatus } from './../models/User/resolvers/Mutation/updateDriverOnlineStatus';
import    { updateOption as Mutation_updateOption } from './../models/Product/resolvers/Mutation/updateOption';
import    { updateOptionGroup as Mutation_updateOptionGroup } from './../models/Product/resolvers/Mutation/updateOptionGroup';
import    { updateOrderStatus as Mutation_updateOrderStatus } from './../models/Order/resolvers/Mutation/updateOrderStatus';
import    { updatePreparationTime as Mutation_updatePreparationTime } from './../models/Order/resolvers/Mutation/updatePreparationTime';
import    { updateProduct as Mutation_updateProduct } from './../models/Product/resolvers/Mutation/updateProduct';
import    { updateProductCategory as Mutation_updateProductCategory } from './../models/ProductCategory/resolvers/Mutation/updateProductCategory';
import    { updateProductSubcategory as Mutation_updateProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/updateProductSubcategory';
import    { updateProductsOrder as Mutation_updateProductsOrder } from './../models/Product/resolvers/Mutation/updateProductsOrder';
import    { updatePromotion as Mutation_updatePromotion } from './../models/Promotion/resolvers/Mutation/updatePromotion';
import    { updateSettlementRule as Mutation_updateSettlementRule } from './../models/SettlementRule/resolvers/Mutation/updateSettlementRule';
import    { updateStoreStatus as Mutation_updateStoreStatus } from './../models/General/resolvers/Mutation/updateStoreStatus';
import    { updateUser as Mutation_updateUser } from './../models/User/resolvers/Mutation/updateUser';
import    { updateUserAddress as Mutation_updateUserAddress } from './../models/UserAddress/resolvers/Mutation/updateUserAddress';
import    { updateUserNote as Mutation_updateUserNote } from './../models/User/resolvers/Mutation/updateUserNote';
import    { verifyEmail as Mutation_verifyEmail } from './../models/User/resolvers/Mutation/verifyEmail';
import    { verifyPhone as Mutation_verifyPhone } from './../models/User/resolvers/Mutation/verifyPhone';
import    { allOrdersUpdated as Subscription_allOrdersUpdated } from './../models/Order/resolvers/Subscription/allOrdersUpdated';
import    { auditLogCreated as Subscription_auditLogCreated } from './../models/AuditLog/resolvers/Subscription/auditLogCreated';
import    { driverConnectionStatusChanged as Subscription_driverConnectionStatusChanged } from './../models/Driver/resolvers/Subscription/driverConnectionStatusChanged';
import    { driverPttSignal as Subscription_driverPttSignal } from './../models/Driver/resolvers/Subscription/driverPttSignal';
import    { driversUpdated as Subscription_driversUpdated } from './../models/User/resolvers/Subscription/driversUpdated';
import    { orderDriverLiveTracking as Subscription_orderDriverLiveTracking } from './../models/Order/resolvers/Subscription/orderDriverLiveTracking';
import    { orderStatusUpdated as Subscription_orderStatusUpdated } from './../models/Order/resolvers/Subscription/orderStatusUpdated';
import    { settlementCreated as Subscription_settlementCreated } from './../models/Settlement/resolvers/Subscription/settlementCreated';
import    { settlementStatusChanged as Subscription_settlementStatusChanged } from './../models/Settlement/resolvers/Subscription/settlementStatusChanged';
import    { storeStatusUpdated as Subscription_storeStatusUpdated } from './../models/General/resolvers/Subscription/storeStatusUpdated';
import    { userOrdersUpdated as Subscription_userOrdersUpdated } from './../models/Order/resolvers/Subscription/userOrdersUpdated';
import    { AgoraRtcCredentials } from './../models/Driver/resolvers/AgoraRtcCredentials';
import    { ApplicablePromotion } from './../models/Promotion/resolvers/ApplicablePromotion';
import    { AudiencePreview } from './../models/Notification/resolvers/AudiencePreview';
import    { AuditLog } from './../models/AuditLog/resolvers/AuditLog';
import    { AuditLogConnection } from './../models/AuditLog/resolvers/AuditLogConnection';
import    { AuthResponse } from './../models/User/resolvers/AuthResponse';
import    { Banner } from './../models/Banner/resolvers/Banner';
import    { Business } from './../models/Business/resolvers/Business';
import    { BusinessDayHours } from './../models/General/resolvers/BusinessDayHours';
import    { BusinessDeviceHealth } from './../models/Notification/resolvers/BusinessDeviceHealth';
import    { BusinessPromotion } from './../models/Business/resolvers/BusinessPromotion';
import    { DeliveryPriceResult } from './../models/DeliveryPricing/resolvers/DeliveryPriceResult';
import    { DeliveryPricingConfig } from './../models/DeliveryPricing/resolvers/DeliveryPricingConfig';
import    { DeliveryPricingTier } from './../models/DeliveryPricing/resolvers/DeliveryPricingTier';
import    { DeliveryZone } from './../models/DeliveryZone/resolvers/DeliveryZone';
import    { DeliveryZoneMatch } from './../models/DeliveryZone/resolvers/DeliveryZoneMatch';
import    { DeviceToken } from './../models/Notification/resolvers/DeviceToken';
import    { DriverConnection } from './../models/Driver/resolvers/DriverConnection';
import    { DriverDailyMetrics } from './../models/Driver/resolvers/DriverDailyMetrics';
import    { DriverHeartbeatResult } from './../models/Driver/resolvers/DriverHeartbeatResult';
import    { DriverPttSignal } from './../models/Driver/resolvers/DriverPttSignal';
import    { Location } from './../models/General/resolvers/Location';
import    { Notification } from './../models/Notification/resolvers/Notification';
import    { NotificationCampaign } from './../models/Notification/resolvers/NotificationCampaign';
import    { Option } from './../models/Product/resolvers/Option';
import    { OptionGroup } from './../models/Product/resolvers/OptionGroup';
import    { Order } from './../models/Order/resolvers/Order';
import    { OrderBusiness } from './../models/Order/resolvers/OrderBusiness';
import    { OrderDriverLiveTracking } from './../models/Order/resolvers/OrderDriverLiveTracking';
import    { OrderItem } from './../models/Order/resolvers/OrderItem';
import    { OrderItemOption } from './../models/Order/resolvers/OrderItemOption';
import    { OrderPromotion } from './../models/Order/resolvers/OrderPromotion';
import    { PolygonPoint } from './../models/DeliveryZone/resolvers/PolygonPoint';
import    { Product } from './../models/Product/resolvers/Product';
import    { ProductCard } from './../models/Product/resolvers/ProductCard';
import    { ProductCategory } from './../models/ProductCategory/resolvers/ProductCategory';
import    { ProductSubcategory } from './../models/ProductSubcategory/resolvers/ProductSubcategory';
import    { ProductVariantGroup } from './../models/Product/resolvers/ProductVariantGroup';
import    { Promotion } from './../models/Promotion/resolvers/Promotion';
import    { PromotionAnalyticsResult } from './../models/Promotion/resolvers/PromotionAnalyticsResult';
import    { PromotionResult } from './../models/Promotion/resolvers/PromotionResult';
import    { PromotionThreshold } from './../models/Promotion/resolvers/PromotionThreshold';
import    { PromotionUsage } from './../models/Promotion/resolvers/PromotionUsage';
import    { PushTelemetryEvent } from './../models/Notification/resolvers/PushTelemetryEvent';
import    { PushTelemetrySummary } from './../models/Notification/resolvers/PushTelemetrySummary';
import    { Referral } from './../models/User/resolvers/Referral';
import    { ReferralStats } from './../models/User/resolvers/ReferralStats';
import    { SendNotificationResult } from './../models/Notification/resolvers/SendNotificationResult';
import    { Settlement } from './../models/Settlement/resolvers/Settlement';
import    { SettlementRule } from './../models/SettlementRule/resolvers/SettlementRule';
import    { SettlementScenarioDefinition } from './../models/Settlement/resolvers/SettlementScenarioDefinition';
import    { SettlementScenarioHarnessResult } from './../models/Settlement/resolvers/SettlementScenarioHarnessResult';
import    { SettlementScenarioResult } from './../models/Settlement/resolvers/SettlementScenarioResult';
import    { SettlementSummary } from './../models/Settlement/resolvers/SettlementSummary';
import    { SignupStepResponse } from './../models/User/resolvers/SignupStepResponse';
import    { StoreStatus } from './../models/General/resolvers/StoreStatus';
import    { TelemetryCount } from './../models/Notification/resolvers/TelemetryCount';
import    { TokenRefreshResponse } from './../models/User/resolvers/TokenRefreshResponse';
import    { User as User_User } from './../models/User/resolvers/User';
import    { User as Driver_User } from './../models/Driver/resolvers/User';
import    { UserAddress } from './../models/UserAddress/resolvers/UserAddress';
import    { UserBehavior } from './../models/User/resolvers/UserBehavior';
import    { UserPromoMetadata } from './../models/Promotion/resolvers/UserPromoMetadata';
import    { UserPromotion } from './../models/Promotion/resolvers/UserPromotion';
import    { WorkingHours } from './../models/General/resolvers/WorkingHours';
import    { DateResolver,DateTimeResolver,JSONResolver } from 'graphql-scalars';
    export const resolvers: Resolvers = {
      Query: { auditLog: Query_auditLog,auditLogs: Query_auditLogs,business: Query_business,businessBalance: Query_businessBalance,businessDeviceHealth: Query_businessDeviceHealth,businesses: Query_businesses,calculateDeliveryPrice: Query_calculateDeliveryPrice,deliveryPricingConfig: Query_deliveryPricingConfig,deliveryPricingTiers: Query_deliveryPricingTiers,deliveryZones: Query_deliveryZones,deviceTokens: Query_deviceTokens,driverBalance: Query_driverBalance,drivers: Query_drivers,getAgoraRtcCredentials: Query_getAgoraRtcCredentials,getAllPromotions: Query_getAllPromotions,getApplicablePromotions: Query_getApplicablePromotions,getBanner: Query_getBanner,getBanners: Query_getBanners,getPromotion: Query_getPromotion,getPromotionAnalytics: Query_getPromotionAnalytics,getPromotionThresholds: Query_getPromotionThresholds,getPromotionUsage: Query_getPromotionUsage,getStoreStatus: Query_getStoreStatus,getUserPromoMetadata: Query_getUserPromoMetadata,getUserPromotions: Query_getUserPromotions,me: Query_me,myAddresses: Query_myAddresses,myBehavior: Query_myBehavior,myDriverMetrics: Query_myDriverMetrics,myReferralStats: Query_myReferralStats,notificationCampaign: Query_notificationCampaign,notificationCampaigns: Query_notificationCampaigns,offers: Query_offers,order: Query_order,orders: Query_orders,ordersByStatus: Query_ordersByStatus,previewCampaignAudience: Query_previewCampaignAudience,product: Query_product,productCategories: Query_productCategories,productCategory: Query_productCategory,productSubcategories: Query_productSubcategories,productSubcategoriesByBusiness: Query_productSubcategoriesByBusiness,products: Query_products,pushTelemetryEvents: Query_pushTelemetryEvents,pushTelemetrySummary: Query_pushTelemetrySummary,settlementRule: Query_settlementRule,settlementRules: Query_settlementRules,settlementScenarioDefinitions: Query_settlementScenarioDefinitions,settlementSummary: Query_settlementSummary,settlements: Query_settlements,uncompletedOrders: Query_uncompletedOrders,userBehavior: Query_userBehavior,users: Query_users,validatePromotions: Query_validatePromotions },
      Mutation: { addUserAddress: Mutation_addUserAddress,adminSendPttSignal: Mutation_adminSendPttSignal,adminSetDriverConnectionStatus: Mutation_adminSetDriverConnectionStatus,adminUpdateDriverLocation: Mutation_adminUpdateDriverLocation,adminUpdateDriverSettings: Mutation_adminUpdateDriverSettings,assignDriverToOrder: Mutation_assignDriverToOrder,assignPromotionToUsers: Mutation_assignPromotionToUsers,backfillSettlementsForDeliveredOrders: Mutation_backfillSettlementsForDeliveredOrders,businessDeviceHeartbeat: Mutation_businessDeviceHeartbeat,businessDeviceOrderSignal: Mutation_businessDeviceOrderSignal,cancelOrder: Mutation_cancelOrder,createBanner: Mutation_createBanner,createBusiness: Mutation_createBusiness,createCampaign: Mutation_createCampaign,createDeliveryPricingTier: Mutation_createDeliveryPricingTier,createDeliveryZone: Mutation_createDeliveryZone,createOption: Mutation_createOption,createOptionGroup: Mutation_createOptionGroup,createOrder: Mutation_createOrder,createProduct: Mutation_createProduct,createProductCategory: Mutation_createProductCategory,createProductSubcategory: Mutation_createProductSubcategory,createProductVariantGroup: Mutation_createProductVariantGroup,createPromotion: Mutation_createPromotion,createSettlementRule: Mutation_createSettlementRule,createTestOrder: Mutation_createTestOrder,createUser: Mutation_createUser,deleteBanner: Mutation_deleteBanner,deleteBusiness: Mutation_deleteBusiness,deleteCampaign: Mutation_deleteCampaign,deleteDeliveryPricingTier: Mutation_deleteDeliveryPricingTier,deleteDeliveryZone: Mutation_deleteDeliveryZone,deleteMyAccount: Mutation_deleteMyAccount,deleteOption: Mutation_deleteOption,deleteOptionGroup: Mutation_deleteOptionGroup,deleteProduct: Mutation_deleteProduct,deleteProductCategory: Mutation_deleteProductCategory,deleteProductSubcategory: Mutation_deleteProductSubcategory,deleteProductVariantGroup: Mutation_deleteProductVariantGroup,deletePromotion: Mutation_deletePromotion,deleteSettlementRule: Mutation_deleteSettlementRule,deleteUser: Mutation_deleteUser,deleteUserAddress: Mutation_deleteUserAddress,driverHeartbeat: Mutation_driverHeartbeat,driverNotifyCustomer: Mutation_driverNotifyCustomer,driverUpdateBatteryStatus: Mutation_driverUpdateBatteryStatus,generateReferralCode: Mutation_generateReferralCode,initiateSignup: Mutation_initiateSignup,login: Mutation_login,logoutAllSessions: Mutation_logoutAllSessions,logoutCurrentSession: Mutation_logoutCurrentSession,markFirstOrderUsed: Mutation_markFirstOrderUsed,markSettlementAsPaid: Mutation_markSettlementAsPaid,markSettlementAsPartiallyPaid: Mutation_markSettlementAsPartiallyPaid,markSettlementsAsPaid: Mutation_markSettlementsAsPaid,refreshToken: Mutation_refreshToken,registerDeviceToken: Mutation_registerDeviceToken,registerLiveActivityToken: Mutation_registerLiveActivityToken,removeUserFromPromotion: Mutation_removeUserFromPromotion,resendEmailVerification: Mutation_resendEmailVerification,runSettlementScenarioHarness: Mutation_runSettlementScenarioHarness,sendCampaign: Mutation_sendCampaign,sendPushNotification: Mutation_sendPushNotification,setBusinessSchedule: Mutation_setBusinessSchedule,setDefaultAddress: Mutation_setDefaultAddress,setDeliveryPricingTiers: Mutation_setDeliveryPricingTiers,setMyPreferredLanguage: Mutation_setMyPreferredLanguage,setUserPermissions: Mutation_setUserPermissions,startPreparing: Mutation_startPreparing,submitPhoneNumber: Mutation_submitPhoneNumber,trackPushTelemetry: Mutation_trackPushTelemetry,unregisterDeviceToken: Mutation_unregisterDeviceToken,unsettleSettlement: Mutation_unsettleSettlement,updateBanner: Mutation_updateBanner,updateBannerOrder: Mutation_updateBannerOrder,updateBusiness: Mutation_updateBusiness,updateDeliveryPricingTier: Mutation_updateDeliveryPricingTier,updateDeliveryZone: Mutation_updateDeliveryZone,updateDriverLocation: Mutation_updateDriverLocation,updateDriverOnlineStatus: Mutation_updateDriverOnlineStatus,updateOption: Mutation_updateOption,updateOptionGroup: Mutation_updateOptionGroup,updateOrderStatus: Mutation_updateOrderStatus,updatePreparationTime: Mutation_updatePreparationTime,updateProduct: Mutation_updateProduct,updateProductCategory: Mutation_updateProductCategory,updateProductSubcategory: Mutation_updateProductSubcategory,updateProductsOrder: Mutation_updateProductsOrder,updatePromotion: Mutation_updatePromotion,updateSettlementRule: Mutation_updateSettlementRule,updateStoreStatus: Mutation_updateStoreStatus,updateUser: Mutation_updateUser,updateUserAddress: Mutation_updateUserAddress,updateUserNote: Mutation_updateUserNote,verifyEmail: Mutation_verifyEmail,verifyPhone: Mutation_verifyPhone },
      Subscription: { allOrdersUpdated: Subscription_allOrdersUpdated,auditLogCreated: Subscription_auditLogCreated,driverConnectionStatusChanged: Subscription_driverConnectionStatusChanged,driverPttSignal: Subscription_driverPttSignal,driversUpdated: Subscription_driversUpdated,orderDriverLiveTracking: Subscription_orderDriverLiveTracking,orderStatusUpdated: Subscription_orderStatusUpdated,settlementCreated: Subscription_settlementCreated,settlementStatusChanged: Subscription_settlementStatusChanged,storeStatusUpdated: Subscription_storeStatusUpdated,userOrdersUpdated: Subscription_userOrdersUpdated },
      AgoraRtcCredentials: AgoraRtcCredentials,
ApplicablePromotion: ApplicablePromotion,
AudiencePreview: AudiencePreview,
AuditLog: AuditLog,
AuditLogConnection: AuditLogConnection,
AuthResponse: AuthResponse,
Banner: Banner,
Business: Business,
BusinessDayHours: BusinessDayHours,
BusinessDeviceHealth: BusinessDeviceHealth,
BusinessPromotion: BusinessPromotion,
DeliveryPriceResult: DeliveryPriceResult,
DeliveryPricingConfig: DeliveryPricingConfig,
DeliveryPricingTier: DeliveryPricingTier,
DeliveryZone: DeliveryZone,
DeliveryZoneMatch: DeliveryZoneMatch,
DeviceToken: DeviceToken,
DriverConnection: DriverConnection,
DriverDailyMetrics: DriverDailyMetrics,
DriverHeartbeatResult: DriverHeartbeatResult,
DriverPttSignal: DriverPttSignal,
Location: Location,
Notification: Notification,
NotificationCampaign: NotificationCampaign,
Option: Option,
OptionGroup: OptionGroup,
Order: Order,
OrderBusiness: OrderBusiness,
OrderDriverLiveTracking: OrderDriverLiveTracking,
OrderItem: OrderItem,
OrderItemOption: OrderItemOption,
OrderPromotion: OrderPromotion,
PolygonPoint: PolygonPoint,
Product: Product,
ProductCard: ProductCard,
ProductCategory: ProductCategory,
ProductSubcategory: ProductSubcategory,
ProductVariantGroup: ProductVariantGroup,
Promotion: Promotion,
PromotionAnalyticsResult: PromotionAnalyticsResult,
PromotionResult: PromotionResult,
PromotionThreshold: PromotionThreshold,
PromotionUsage: PromotionUsage,
PushTelemetryEvent: PushTelemetryEvent,
PushTelemetrySummary: PushTelemetrySummary,
Referral: Referral,
ReferralStats: ReferralStats,
SendNotificationResult: SendNotificationResult,
Settlement: Settlement,
SettlementRule: SettlementRule,
SettlementScenarioDefinition: SettlementScenarioDefinition,
SettlementScenarioHarnessResult: SettlementScenarioHarnessResult,
SettlementScenarioResult: SettlementScenarioResult,
SettlementSummary: SettlementSummary,
SignupStepResponse: SignupStepResponse,
StoreStatus: StoreStatus,
TelemetryCount: TelemetryCount,
TokenRefreshResponse: TokenRefreshResponse,
User: { ...User_User,...Driver_User },
UserAddress: UserAddress,
UserBehavior: UserBehavior,
UserPromoMetadata: UserPromoMetadata,
UserPromotion: UserPromotion,
WorkingHours: WorkingHours,
Date: DateResolver,
DateTime: DateTimeResolver,
JSON: JSONResolver
    }