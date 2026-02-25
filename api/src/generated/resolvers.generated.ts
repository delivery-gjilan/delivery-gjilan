/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { auditLog as Query_auditLog } from './../models/AuditLog/resolvers/Query/auditLog';
import    { auditLogs as Query_auditLogs } from './../models/AuditLog/resolvers/Query/auditLogs';
import    { business as Query_business } from './../models/Business/resolvers/Query/business';
import    { businessBalance as Query_businessBalance } from './../models/Settlement/resolvers/Query/businessBalance';
import    { businesses as Query_businesses } from './../models/Business/resolvers/Query/businesses';
import    { calculateDeliveryPrice as Query_calculateDeliveryPrice } from './../models/DeliveryPricing/resolvers/Query/calculateDeliveryPrice';
import    { deliveryPricingTiers as Query_deliveryPricingTiers } from './../models/DeliveryPricing/resolvers/Query/deliveryPricingTiers';
import    { deliveryZones as Query_deliveryZones } from './../models/DeliveryZone/resolvers/Query/deliveryZones';
import    { driverBalance as Query_driverBalance } from './../models/Settlement/resolvers/Query/driverBalance';
import    { drivers as Query_drivers } from './../models/User/resolvers/Query/drivers';
import    { getAllPromotions as Query_getAllPromotions } from './../models/Promotion/resolvers/Query/getAllPromotions';
import    { getApplicablePromotions as Query_getApplicablePromotions } from './../models/Promotion/resolvers/Query/getApplicablePromotions';
import    { getPromotion as Query_getPromotion } from './../models/Promotion/resolvers/Query/getPromotion';
import    { getPromotionAnalytics as Query_getPromotionAnalytics } from './../models/Promotion/resolvers/Query/getPromotionAnalytics';
import    { getPromotionThresholds as Query_getPromotionThresholds } from './../models/Promotion/resolvers/Query/getPromotionThresholds';
import    { getPromotionUsage as Query_getPromotionUsage } from './../models/Promotion/resolvers/Query/getPromotionUsage';
import    { getStoreStatus as Query_getStoreStatus } from './../models/General/resolvers/Query/getStoreStatus';
import    { getUserPromoMetadata as Query_getUserPromoMetadata } from './../models/Promotion/resolvers/Query/getUserPromoMetadata';
import    { getUserPromotions as Query_getUserPromotions } from './../models/Promotion/resolvers/Query/getUserPromotions';
import    { getUserWallet as Query_getUserWallet } from './../models/Promotion/resolvers/Query/getUserWallet';
import    { getWalletTransactions as Query_getWalletTransactions } from './../models/Promotion/resolvers/Query/getWalletTransactions';
import    { me as Query_me } from './../models/User/resolvers/Query/me';
import    { myAddresses as Query_myAddresses } from './../models/UserAddress/resolvers/Query/myAddresses';
import    { myBehavior as Query_myBehavior } from './../models/User/resolvers/Query/myBehavior';
import    { myDriverMetrics as Query_myDriverMetrics } from './../models/Driver/resolvers/Query/myDriverMetrics';
import    { myReferralStats as Query_myReferralStats } from './../models/User/resolvers/Query/myReferralStats';
import    { notificationCampaign as Query_notificationCampaign } from './../models/Notification/resolvers/Query/notificationCampaign';
import    { notificationCampaigns as Query_notificationCampaigns } from './../models/Notification/resolvers/Query/notificationCampaigns';
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
import    { settlementSummary as Query_settlementSummary } from './../models/Settlement/resolvers/Query/settlementSummary';
import    { settlements as Query_settlements } from './../models/Settlement/resolvers/Query/settlements';
import    { uncompletedOrders as Query_uncompletedOrders } from './../models/Order/resolvers/Query/uncompletedOrders';
import    { userBehavior as Query_userBehavior } from './../models/User/resolvers/Query/userBehavior';
import    { users as Query_users } from './../models/User/resolvers/Query/users';
import    { validatePromotions as Query_validatePromotions } from './../models/Promotion/resolvers/Query/validatePromotions';
import    { addUserAddress as Mutation_addUserAddress } from './../models/UserAddress/resolvers/Mutation/addUserAddress';
import    { addWalletCredit as Mutation_addWalletCredit } from './../models/Promotion/resolvers/Mutation/addWalletCredit';
import    { adminSetDriverConnectionStatus as Mutation_adminSetDriverConnectionStatus } from './../models/Driver/resolvers/Mutation/adminSetDriverConnectionStatus';
import    { adminUpdateDriverLocation as Mutation_adminUpdateDriverLocation } from './../models/User/resolvers/Mutation/adminUpdateDriverLocation';
import    { adminUpdateDriverSettings as Mutation_adminUpdateDriverSettings } from './../models/Driver/resolvers/Mutation/adminUpdateDriverSettings';
import    { assignDriverToOrder as Mutation_assignDriverToOrder } from './../models/Order/resolvers/Mutation/assignDriverToOrder';
import    { assignPromotionToUsers as Mutation_assignPromotionToUsers } from './../models/Promotion/resolvers/Mutation/assignPromotionToUsers';
import    { backfillSettlementsForDeliveredOrders as Mutation_backfillSettlementsForDeliveredOrders } from './../models/Settlement/resolvers/Mutation/backfillSettlementsForDeliveredOrders';
import    { cancelOrder as Mutation_cancelOrder } from './../models/Order/resolvers/Mutation/cancelOrder';
import    { createBusiness as Mutation_createBusiness } from './../models/Business/resolvers/Mutation/createBusiness';
import    { createCampaign as Mutation_createCampaign } from './../models/Notification/resolvers/Mutation/createCampaign';
import    { createDeliveryPricingTier as Mutation_createDeliveryPricingTier } from './../models/DeliveryPricing/resolvers/Mutation/createDeliveryPricingTier';
import    { createDeliveryZone as Mutation_createDeliveryZone } from './../models/DeliveryZone/resolvers/Mutation/createDeliveryZone';
import    { createOrder as Mutation_createOrder } from './../models/Order/resolvers/Mutation/createOrder';
import    { createProduct as Mutation_createProduct } from './../models/Product/resolvers/Mutation/createProduct';
import    { createProductCategory as Mutation_createProductCategory } from './../models/ProductCategory/resolvers/Mutation/createProductCategory';
import    { createProductSubcategory as Mutation_createProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/createProductSubcategory';
import    { createPromotion as Mutation_createPromotion } from './../models/Promotion/resolvers/Mutation/createPromotion';
import    { createTestOrder as Mutation_createTestOrder } from './../models/Order/resolvers/Mutation/createTestOrder';
import    { createUser as Mutation_createUser } from './../models/User/resolvers/Mutation/createUser';
import    { deductWalletCredit as Mutation_deductWalletCredit } from './../models/Promotion/resolvers/Mutation/deductWalletCredit';
import    { deleteBusiness as Mutation_deleteBusiness } from './../models/Business/resolvers/Mutation/deleteBusiness';
import    { deleteCampaign as Mutation_deleteCampaign } from './../models/Notification/resolvers/Mutation/deleteCampaign';
import    { deleteDeliveryPricingTier as Mutation_deleteDeliveryPricingTier } from './../models/DeliveryPricing/resolvers/Mutation/deleteDeliveryPricingTier';
import    { deleteDeliveryZone as Mutation_deleteDeliveryZone } from './../models/DeliveryZone/resolvers/Mutation/deleteDeliveryZone';
import    { deleteProduct as Mutation_deleteProduct } from './../models/Product/resolvers/Mutation/deleteProduct';
import    { deleteProductCategory as Mutation_deleteProductCategory } from './../models/ProductCategory/resolvers/Mutation/deleteProductCategory';
import    { deleteProductSubcategory as Mutation_deleteProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/deleteProductSubcategory';
import    { deletePromotion as Mutation_deletePromotion } from './../models/Promotion/resolvers/Mutation/deletePromotion';
import    { deleteUser as Mutation_deleteUser } from './../models/User/resolvers/Mutation/deleteUser';
import    { deleteUserAddress as Mutation_deleteUserAddress } from './../models/UserAddress/resolvers/Mutation/deleteUserAddress';
import    { driverHeartbeat as Mutation_driverHeartbeat } from './../models/Driver/resolvers/Mutation/driverHeartbeat';
import    { generateReferralCode as Mutation_generateReferralCode } from './../models/User/resolvers/Mutation/generateReferralCode';
import    { initiateSignup as Mutation_initiateSignup } from './../models/User/resolvers/Mutation/initiateSignup';
import    { login as Mutation_login } from './../models/User/resolvers/Mutation/login';
import    { markFirstOrderUsed as Mutation_markFirstOrderUsed } from './../models/Promotion/resolvers/Mutation/markFirstOrderUsed';
import    { markSettlementAsPaid as Mutation_markSettlementAsPaid } from './../models/Settlement/resolvers/Mutation/markSettlementAsPaid';
import    { markSettlementAsPartiallyPaid as Mutation_markSettlementAsPartiallyPaid } from './../models/Settlement/resolvers/Mutation/markSettlementAsPartiallyPaid';
import    { markSettlementsAsPaid as Mutation_markSettlementsAsPaid } from './../models/Settlement/resolvers/Mutation/markSettlementsAsPaid';
import    { registerDeviceToken as Mutation_registerDeviceToken } from './../models/Notification/resolvers/Mutation/registerDeviceToken';
import    { removeUserFromPromotion as Mutation_removeUserFromPromotion } from './../models/Promotion/resolvers/Mutation/removeUserFromPromotion';
import    { resendEmailVerification as Mutation_resendEmailVerification } from './../models/User/resolvers/Mutation/resendEmailVerification';
import    { sendCampaign as Mutation_sendCampaign } from './../models/Notification/resolvers/Mutation/sendCampaign';
import    { sendPushNotification as Mutation_sendPushNotification } from './../models/Notification/resolvers/Mutation/sendPushNotification';
import    { setBusinessSchedule as Mutation_setBusinessSchedule } from './../models/Business/resolvers/Mutation/setBusinessSchedule';
import    { setDefaultAddress as Mutation_setDefaultAddress } from './../models/UserAddress/resolvers/Mutation/setDefaultAddress';
import    { setDeliveryPricingTiers as Mutation_setDeliveryPricingTiers } from './../models/DeliveryPricing/resolvers/Mutation/setDeliveryPricingTiers';
import    { setUserPermissions as Mutation_setUserPermissions } from './../models/User/resolvers/Mutation/setUserPermissions';
import    { startPreparing as Mutation_startPreparing } from './../models/Order/resolvers/Mutation/startPreparing';
import    { submitPhoneNumber as Mutation_submitPhoneNumber } from './../models/User/resolvers/Mutation/submitPhoneNumber';
import    { unregisterDeviceToken as Mutation_unregisterDeviceToken } from './../models/Notification/resolvers/Mutation/unregisterDeviceToken';
import    { unsettleSettlement as Mutation_unsettleSettlement } from './../models/Settlement/resolvers/Mutation/unsettleSettlement';
import    { updateBusiness as Mutation_updateBusiness } from './../models/Business/resolvers/Mutation/updateBusiness';
import    { updateCommissionPercentage as Mutation_updateCommissionPercentage } from './../models/Settlement/resolvers/Mutation/updateCommissionPercentage';
import    { updateDeliveryPricingTier as Mutation_updateDeliveryPricingTier } from './../models/DeliveryPricing/resolvers/Mutation/updateDeliveryPricingTier';
import    { updateDeliveryZone as Mutation_updateDeliveryZone } from './../models/DeliveryZone/resolvers/Mutation/updateDeliveryZone';
import    { updateDriverLocation as Mutation_updateDriverLocation } from './../models/User/resolvers/Mutation/updateDriverLocation';
import    { updateDriverOnlineStatus as Mutation_updateDriverOnlineStatus } from './../models/User/resolvers/Mutation/updateDriverOnlineStatus';
import    { updateOrderStatus as Mutation_updateOrderStatus } from './../models/Order/resolvers/Mutation/updateOrderStatus';
import    { updatePreparationTime as Mutation_updatePreparationTime } from './../models/Order/resolvers/Mutation/updatePreparationTime';
import    { updateProduct as Mutation_updateProduct } from './../models/Product/resolvers/Mutation/updateProduct';
import    { updateProductCategory as Mutation_updateProductCategory } from './../models/ProductCategory/resolvers/Mutation/updateProductCategory';
import    { updateProductSubcategory as Mutation_updateProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/updateProductSubcategory';
import    { updateProductsOrder as Mutation_updateProductsOrder } from './../models/Product/resolvers/Mutation/updateProductsOrder';
import    { updatePromotion as Mutation_updatePromotion } from './../models/Promotion/resolvers/Mutation/updatePromotion';
import    { updateStoreStatus as Mutation_updateStoreStatus } from './../models/General/resolvers/Mutation/updateStoreStatus';
import    { updateUser as Mutation_updateUser } from './../models/User/resolvers/Mutation/updateUser';
import    { updateUserAddress as Mutation_updateUserAddress } from './../models/UserAddress/resolvers/Mutation/updateUserAddress';
import    { updateUserNote as Mutation_updateUserNote } from './../models/User/resolvers/Mutation/updateUserNote';
import    { verifyEmail as Mutation_verifyEmail } from './../models/User/resolvers/Mutation/verifyEmail';
import    { verifyPhone as Mutation_verifyPhone } from './../models/User/resolvers/Mutation/verifyPhone';
import    { allOrdersUpdated as Subscription_allOrdersUpdated } from './../models/Order/resolvers/Subscription/allOrdersUpdated';
import    { auditLogCreated as Subscription_auditLogCreated } from './../models/AuditLog/resolvers/Subscription/auditLogCreated';
import    { driverConnectionStatusChanged as Subscription_driverConnectionStatusChanged } from './../models/Driver/resolvers/Subscription/driverConnectionStatusChanged';
import    { driversUpdated as Subscription_driversUpdated } from './../models/User/resolvers/Subscription/driversUpdated';
import    { orderStatusUpdated as Subscription_orderStatusUpdated } from './../models/Order/resolvers/Subscription/orderStatusUpdated';
import    { settlementCreated as Subscription_settlementCreated } from './../models/Settlement/resolvers/Subscription/settlementCreated';
import    { settlementStatusChanged as Subscription_settlementStatusChanged } from './../models/Settlement/resolvers/Subscription/settlementStatusChanged';
import    { userOrdersUpdated as Subscription_userOrdersUpdated } from './../models/Order/resolvers/Subscription/userOrdersUpdated';
import    { ApplicablePromotion } from './../models/Promotion/resolvers/ApplicablePromotion';
import    { AudiencePreview } from './../models/Notification/resolvers/AudiencePreview';
import    { AuditLog } from './../models/AuditLog/resolvers/AuditLog';
import    { AuditLogConnection } from './../models/AuditLog/resolvers/AuditLogConnection';
import    { AuthResponse } from './../models/User/resolvers/AuthResponse';
import    { Business } from './../models/Business/resolvers/Business';
import    { BusinessDayHours } from './../models/General/resolvers/BusinessDayHours';
import    { DeliveryPriceResult } from './../models/DeliveryPricing/resolvers/DeliveryPriceResult';
import    { DeliveryPricingTier } from './../models/DeliveryPricing/resolvers/DeliveryPricingTier';
import    { DeliveryZone } from './../models/DeliveryZone/resolvers/DeliveryZone';
import    { DeliveryZoneMatch } from './../models/DeliveryZone/resolvers/DeliveryZoneMatch';
import    { DeviceToken } from './../models/Notification/resolvers/DeviceToken';
import    { DriverConnection } from './../models/Driver/resolvers/DriverConnection';
import    { DriverDailyMetrics } from './../models/Driver/resolvers/DriverDailyMetrics';
import    { DriverHeartbeatResult } from './../models/Driver/resolvers/DriverHeartbeatResult';
import    { Location } from './../models/General/resolvers/Location';
import    { Notification } from './../models/Notification/resolvers/Notification';
import    { NotificationCampaign } from './../models/Notification/resolvers/NotificationCampaign';
import    { Order } from './../models/Order/resolvers/Order';
import    { OrderBusiness } from './../models/Order/resolvers/OrderBusiness';
import    { OrderItem } from './../models/Order/resolvers/OrderItem';
import    { OrderPromotion } from './../models/Order/resolvers/OrderPromotion';
import    { PolygonPoint } from './../models/DeliveryZone/resolvers/PolygonPoint';
import    { Product } from './../models/Product/resolvers/Product';
import    { ProductCategory } from './../models/ProductCategory/resolvers/ProductCategory';
import    { ProductSubcategory } from './../models/ProductSubcategory/resolvers/ProductSubcategory';
import    { Promotion } from './../models/Promotion/resolvers/Promotion';
import    { PromotionAnalyticsResult } from './../models/Promotion/resolvers/PromotionAnalyticsResult';
import    { PromotionResult } from './../models/Promotion/resolvers/PromotionResult';
import    { PromotionThreshold } from './../models/Promotion/resolvers/PromotionThreshold';
import    { PromotionUsage } from './../models/Promotion/resolvers/PromotionUsage';
import    { Referral } from './../models/User/resolvers/Referral';
import    { ReferralStats } from './../models/User/resolvers/ReferralStats';
import    { SendNotificationResult } from './../models/Notification/resolvers/SendNotificationResult';
import    { Settlement } from './../models/Settlement/resolvers/Settlement';
import    { SettlementSummary } from './../models/Settlement/resolvers/SettlementSummary';
import    { SignupStepResponse } from './../models/User/resolvers/SignupStepResponse';
import    { StoreStatus } from './../models/General/resolvers/StoreStatus';
import    { User as User_User } from './../models/User/resolvers/User';
import    { User as Driver_User } from './../models/Driver/resolvers/User';
import    { UserAddress } from './../models/UserAddress/resolvers/UserAddress';
import    { UserBehavior } from './../models/User/resolvers/UserBehavior';
import    { UserPromoMetadata } from './../models/Promotion/resolvers/UserPromoMetadata';
import    { UserPromotion } from './../models/Promotion/resolvers/UserPromotion';
import    { UserWallet } from './../models/Promotion/resolvers/UserWallet';
import    { WalletTransaction } from './../models/Promotion/resolvers/WalletTransaction';
import    { WorkingHours } from './../models/General/resolvers/WorkingHours';
import    { DateResolver,DateTimeResolver,JSONResolver } from 'graphql-scalars';
    export const resolvers: Resolvers = {
      Query: { auditLog: Query_auditLog,auditLogs: Query_auditLogs,business: Query_business,businessBalance: Query_businessBalance,businesses: Query_businesses,calculateDeliveryPrice: Query_calculateDeliveryPrice,deliveryPricingTiers: Query_deliveryPricingTiers,deliveryZones: Query_deliveryZones,driverBalance: Query_driverBalance,drivers: Query_drivers,getAllPromotions: Query_getAllPromotions,getApplicablePromotions: Query_getApplicablePromotions,getPromotion: Query_getPromotion,getPromotionAnalytics: Query_getPromotionAnalytics,getPromotionThresholds: Query_getPromotionThresholds,getPromotionUsage: Query_getPromotionUsage,getStoreStatus: Query_getStoreStatus,getUserPromoMetadata: Query_getUserPromoMetadata,getUserPromotions: Query_getUserPromotions,getUserWallet: Query_getUserWallet,getWalletTransactions: Query_getWalletTransactions,me: Query_me,myAddresses: Query_myAddresses,myBehavior: Query_myBehavior,myDriverMetrics: Query_myDriverMetrics,myReferralStats: Query_myReferralStats,notificationCampaign: Query_notificationCampaign,notificationCampaigns: Query_notificationCampaigns,order: Query_order,orders: Query_orders,ordersByStatus: Query_ordersByStatus,previewCampaignAudience: Query_previewCampaignAudience,product: Query_product,productCategories: Query_productCategories,productCategory: Query_productCategory,productSubcategories: Query_productSubcategories,productSubcategoriesByBusiness: Query_productSubcategoriesByBusiness,products: Query_products,settlementSummary: Query_settlementSummary,settlements: Query_settlements,uncompletedOrders: Query_uncompletedOrders,userBehavior: Query_userBehavior,users: Query_users,validatePromotions: Query_validatePromotions },
      Mutation: { addUserAddress: Mutation_addUserAddress,addWalletCredit: Mutation_addWalletCredit,adminSetDriverConnectionStatus: Mutation_adminSetDriverConnectionStatus,adminUpdateDriverLocation: Mutation_adminUpdateDriverLocation,adminUpdateDriverSettings: Mutation_adminUpdateDriverSettings,assignDriverToOrder: Mutation_assignDriverToOrder,assignPromotionToUsers: Mutation_assignPromotionToUsers,backfillSettlementsForDeliveredOrders: Mutation_backfillSettlementsForDeliveredOrders,cancelOrder: Mutation_cancelOrder,createBusiness: Mutation_createBusiness,createCampaign: Mutation_createCampaign,createDeliveryPricingTier: Mutation_createDeliveryPricingTier,createDeliveryZone: Mutation_createDeliveryZone,createOrder: Mutation_createOrder,createProduct: Mutation_createProduct,createProductCategory: Mutation_createProductCategory,createProductSubcategory: Mutation_createProductSubcategory,createPromotion: Mutation_createPromotion,createTestOrder: Mutation_createTestOrder,createUser: Mutation_createUser,deductWalletCredit: Mutation_deductWalletCredit,deleteBusiness: Mutation_deleteBusiness,deleteCampaign: Mutation_deleteCampaign,deleteDeliveryPricingTier: Mutation_deleteDeliveryPricingTier,deleteDeliveryZone: Mutation_deleteDeliveryZone,deleteProduct: Mutation_deleteProduct,deleteProductCategory: Mutation_deleteProductCategory,deleteProductSubcategory: Mutation_deleteProductSubcategory,deletePromotion: Mutation_deletePromotion,deleteUser: Mutation_deleteUser,deleteUserAddress: Mutation_deleteUserAddress,driverHeartbeat: Mutation_driverHeartbeat,generateReferralCode: Mutation_generateReferralCode,initiateSignup: Mutation_initiateSignup,login: Mutation_login,markFirstOrderUsed: Mutation_markFirstOrderUsed,markSettlementAsPaid: Mutation_markSettlementAsPaid,markSettlementAsPartiallyPaid: Mutation_markSettlementAsPartiallyPaid,markSettlementsAsPaid: Mutation_markSettlementsAsPaid,registerDeviceToken: Mutation_registerDeviceToken,removeUserFromPromotion: Mutation_removeUserFromPromotion,resendEmailVerification: Mutation_resendEmailVerification,sendCampaign: Mutation_sendCampaign,sendPushNotification: Mutation_sendPushNotification,setBusinessSchedule: Mutation_setBusinessSchedule,setDefaultAddress: Mutation_setDefaultAddress,setDeliveryPricingTiers: Mutation_setDeliveryPricingTiers,setUserPermissions: Mutation_setUserPermissions,startPreparing: Mutation_startPreparing,submitPhoneNumber: Mutation_submitPhoneNumber,unregisterDeviceToken: Mutation_unregisterDeviceToken,unsettleSettlement: Mutation_unsettleSettlement,updateBusiness: Mutation_updateBusiness,updateCommissionPercentage: Mutation_updateCommissionPercentage,updateDeliveryPricingTier: Mutation_updateDeliveryPricingTier,updateDeliveryZone: Mutation_updateDeliveryZone,updateDriverLocation: Mutation_updateDriverLocation,updateDriverOnlineStatus: Mutation_updateDriverOnlineStatus,updateOrderStatus: Mutation_updateOrderStatus,updatePreparationTime: Mutation_updatePreparationTime,updateProduct: Mutation_updateProduct,updateProductCategory: Mutation_updateProductCategory,updateProductSubcategory: Mutation_updateProductSubcategory,updateProductsOrder: Mutation_updateProductsOrder,updatePromotion: Mutation_updatePromotion,updateStoreStatus: Mutation_updateStoreStatus,updateUser: Mutation_updateUser,updateUserAddress: Mutation_updateUserAddress,updateUserNote: Mutation_updateUserNote,verifyEmail: Mutation_verifyEmail,verifyPhone: Mutation_verifyPhone },
      Subscription: { allOrdersUpdated: Subscription_allOrdersUpdated,auditLogCreated: Subscription_auditLogCreated,driverConnectionStatusChanged: Subscription_driverConnectionStatusChanged,driversUpdated: Subscription_driversUpdated,orderStatusUpdated: Subscription_orderStatusUpdated,settlementCreated: Subscription_settlementCreated,settlementStatusChanged: Subscription_settlementStatusChanged,userOrdersUpdated: Subscription_userOrdersUpdated },
      ApplicablePromotion: ApplicablePromotion,
AudiencePreview: AudiencePreview,
AuditLog: AuditLog,
AuditLogConnection: AuditLogConnection,
AuthResponse: AuthResponse,
Business: Business,
BusinessDayHours: BusinessDayHours,
DeliveryPriceResult: DeliveryPriceResult,
DeliveryPricingTier: DeliveryPricingTier,
DeliveryZone: DeliveryZone,
DeliveryZoneMatch: DeliveryZoneMatch,
DeviceToken: DeviceToken,
DriverConnection: DriverConnection,
DriverDailyMetrics: DriverDailyMetrics,
DriverHeartbeatResult: DriverHeartbeatResult,
Location: Location,
Notification: Notification,
NotificationCampaign: NotificationCampaign,
Order: Order,
OrderBusiness: OrderBusiness,
OrderItem: OrderItem,
OrderPromotion: OrderPromotion,
PolygonPoint: PolygonPoint,
Product: Product,
ProductCategory: ProductCategory,
ProductSubcategory: ProductSubcategory,
Promotion: Promotion,
PromotionAnalyticsResult: PromotionAnalyticsResult,
PromotionResult: PromotionResult,
PromotionThreshold: PromotionThreshold,
PromotionUsage: PromotionUsage,
Referral: Referral,
ReferralStats: ReferralStats,
SendNotificationResult: SendNotificationResult,
Settlement: Settlement,
SettlementSummary: SettlementSummary,
SignupStepResponse: SignupStepResponse,
StoreStatus: StoreStatus,
User: { ...User_User,...Driver_User },
UserAddress: UserAddress,
UserBehavior: UserBehavior,
UserPromoMetadata: UserPromoMetadata,
UserPromotion: UserPromotion,
UserWallet: UserWallet,
WalletTransaction: WalletTransaction,
WorkingHours: WorkingHours,
Date: DateResolver,
DateTime: DateTimeResolver,
JSON: JSONResolver
    }