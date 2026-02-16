/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { auditLog as Query_auditLog } from './../models/AuditLog/resolvers/Query/auditLog';
import    { auditLogs as Query_auditLogs } from './../models/AuditLog/resolvers/Query/auditLogs';
import    { business as Query_business } from './../models/Business/resolvers/Query/business';
import    { businessBalance as Query_businessBalance } from './../models/Settlement/resolvers/Query/businessBalance';
import    { businesses as Query_businesses } from './../models/Business/resolvers/Query/businesses';
import    { calculateDeliveryFee as Query_calculateDeliveryFee } from './../models/DeliveryZone/resolvers/Query/calculateDeliveryFee';
import    { deliveryZone as Query_deliveryZone } from './../models/DeliveryZone/resolvers/Query/deliveryZone';
import    { deliveryZones as Query_deliveryZones } from './../models/DeliveryZone/resolvers/Query/deliveryZones';
import    { driverBalance as Query_driverBalance } from './../models/Settlement/resolvers/Query/driverBalance';
import    { drivers as Query_drivers } from './../models/User/resolvers/Query/drivers';
import    { me as Query_me } from './../models/User/resolvers/Query/me';
import    { myBehavior as Query_myBehavior } from './../models/User/resolvers/Query/myBehavior';
import    { order as Query_order } from './../models/Order/resolvers/Query/order';
import    { orders as Query_orders } from './../models/Order/resolvers/Query/orders';
import    { ordersByStatus as Query_ordersByStatus } from './../models/Order/resolvers/Query/ordersByStatus';
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
import    { adminSetDriverConnectionStatus as Mutation_adminSetDriverConnectionStatus } from './../models/Driver/resolvers/Mutation/adminSetDriverConnectionStatus';
import    { adminUpdateDriverLocation as Mutation_adminUpdateDriverLocation } from './../models/User/resolvers/Mutation/adminUpdateDriverLocation';
import    { assignDriverToOrder as Mutation_assignDriverToOrder } from './../models/Order/resolvers/Mutation/assignDriverToOrder';
import    { backfillSettlementsForDeliveredOrders as Mutation_backfillSettlementsForDeliveredOrders } from './../models/Settlement/resolvers/Mutation/backfillSettlementsForDeliveredOrders';
import    { cancelOrder as Mutation_cancelOrder } from './../models/Order/resolvers/Mutation/cancelOrder';
import    { createBusiness as Mutation_createBusiness } from './../models/Business/resolvers/Mutation/createBusiness';
import    { createDeliveryZone as Mutation_createDeliveryZone } from './../models/DeliveryZone/resolvers/Mutation/createDeliveryZone';
import    { createOrder as Mutation_createOrder } from './../models/Order/resolvers/Mutation/createOrder';
import    { createProduct as Mutation_createProduct } from './../models/Product/resolvers/Mutation/createProduct';
import    { createProductCategory as Mutation_createProductCategory } from './../models/ProductCategory/resolvers/Mutation/createProductCategory';
import    { createProductSubcategory as Mutation_createProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/createProductSubcategory';
import    { createUser as Mutation_createUser } from './../models/User/resolvers/Mutation/createUser';
import    { deleteBusiness as Mutation_deleteBusiness } from './../models/Business/resolvers/Mutation/deleteBusiness';
import    { deleteDeliveryZone as Mutation_deleteDeliveryZone } from './../models/DeliveryZone/resolvers/Mutation/deleteDeliveryZone';
import    { deleteProduct as Mutation_deleteProduct } from './../models/Product/resolvers/Mutation/deleteProduct';
import    { deleteProductCategory as Mutation_deleteProductCategory } from './../models/ProductCategory/resolvers/Mutation/deleteProductCategory';
import    { deleteProductSubcategory as Mutation_deleteProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/deleteProductSubcategory';
import    { deleteUser as Mutation_deleteUser } from './../models/User/resolvers/Mutation/deleteUser';
import    { driverHeartbeat as Mutation_driverHeartbeat } from './../models/Driver/resolvers/Mutation/driverHeartbeat';
import    { initiateSignup as Mutation_initiateSignup } from './../models/User/resolvers/Mutation/initiateSignup';
import    { login as Mutation_login } from './../models/User/resolvers/Mutation/login';
import    { markSettlementAsPaid as Mutation_markSettlementAsPaid } from './../models/Settlement/resolvers/Mutation/markSettlementAsPaid';
import    { markSettlementAsPartiallyPaid as Mutation_markSettlementAsPartiallyPaid } from './../models/Settlement/resolvers/Mutation/markSettlementAsPartiallyPaid';
import    { markSettlementsAsPaid as Mutation_markSettlementsAsPaid } from './../models/Settlement/resolvers/Mutation/markSettlementsAsPaid';
import    { resendEmailVerification as Mutation_resendEmailVerification } from './../models/User/resolvers/Mutation/resendEmailVerification';
import    { submitPhoneNumber as Mutation_submitPhoneNumber } from './../models/User/resolvers/Mutation/submitPhoneNumber';
import    { unsettleSettlement as Mutation_unsettleSettlement } from './../models/Settlement/resolvers/Mutation/unsettleSettlement';
import    { updateBusiness as Mutation_updateBusiness } from './../models/Business/resolvers/Mutation/updateBusiness';
import    { updateCommissionPercentage as Mutation_updateCommissionPercentage } from './../models/Settlement/resolvers/Mutation/updateCommissionPercentage';
import    { updateDeliveryZone as Mutation_updateDeliveryZone } from './../models/DeliveryZone/resolvers/Mutation/updateDeliveryZone';
import    { updateDriverLocation as Mutation_updateDriverLocation } from './../models/User/resolvers/Mutation/updateDriverLocation';
import    { updateDriverOnlineStatus as Mutation_updateDriverOnlineStatus } from './../models/User/resolvers/Mutation/updateDriverOnlineStatus';
import    { updateOrderStatus as Mutation_updateOrderStatus } from './../models/Order/resolvers/Mutation/updateOrderStatus';
import    { updateProduct as Mutation_updateProduct } from './../models/Product/resolvers/Mutation/updateProduct';
import    { updateProductCategory as Mutation_updateProductCategory } from './../models/ProductCategory/resolvers/Mutation/updateProductCategory';
import    { updateProductSubcategory as Mutation_updateProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/updateProductSubcategory';
import    { updateProductsOrder as Mutation_updateProductsOrder } from './../models/Product/resolvers/Mutation/updateProductsOrder';
import    { updateUser as Mutation_updateUser } from './../models/User/resolvers/Mutation/updateUser';
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
import    { AuditLog } from './../models/AuditLog/resolvers/AuditLog';
import    { AuditLogConnection } from './../models/AuditLog/resolvers/AuditLogConnection';
import    { AuthResponse } from './../models/User/resolvers/AuthResponse';
import    { Business } from './../models/Business/resolvers/Business';
import    { DeliveryZone } from './../models/DeliveryZone/resolvers/DeliveryZone';
import    { DriverConnection } from './../models/Driver/resolvers/DriverConnection';
import    { DriverHeartbeatResult } from './../models/Driver/resolvers/DriverHeartbeatResult';
import    { Location } from './../models/General/resolvers/Location';
import    { Order } from './../models/Order/resolvers/Order';
import    { OrderBusiness } from './../models/Order/resolvers/OrderBusiness';
import    { OrderItem } from './../models/Order/resolvers/OrderItem';
import    { Product } from './../models/Product/resolvers/Product';
import    { ProductCategory } from './../models/ProductCategory/resolvers/ProductCategory';
import    { ProductSubcategory } from './../models/ProductSubcategory/resolvers/ProductSubcategory';
import    { Settlement } from './../models/Settlement/resolvers/Settlement';
import    { SettlementSummary } from './../models/Settlement/resolvers/SettlementSummary';
import    { SignupStepResponse } from './../models/User/resolvers/SignupStepResponse';
import    { User as User_User } from './../models/User/resolvers/User';
import    { User as Driver_User } from './../models/Driver/resolvers/User';
import    { UserBehavior } from './../models/User/resolvers/UserBehavior';
import    { WorkingHours } from './../models/General/resolvers/WorkingHours';
import    { ZoneFeeResult } from './../models/DeliveryZone/resolvers/ZoneFeeResult';
import    { DateResolver,DateTimeResolver,JSONResolver } from 'graphql-scalars';
    export const resolvers: Resolvers = {
      Query: { auditLog: Query_auditLog,auditLogs: Query_auditLogs,business: Query_business,businessBalance: Query_businessBalance,businesses: Query_businesses,calculateDeliveryFee: Query_calculateDeliveryFee,deliveryZone: Query_deliveryZone,deliveryZones: Query_deliveryZones,driverBalance: Query_driverBalance,drivers: Query_drivers,me: Query_me,myBehavior: Query_myBehavior,order: Query_order,orders: Query_orders,ordersByStatus: Query_ordersByStatus,product: Query_product,productCategories: Query_productCategories,productCategory: Query_productCategory,productSubcategories: Query_productSubcategories,productSubcategoriesByBusiness: Query_productSubcategoriesByBusiness,products: Query_products,settlementSummary: Query_settlementSummary,settlements: Query_settlements,uncompletedOrders: Query_uncompletedOrders,userBehavior: Query_userBehavior,users: Query_users },
      Mutation: { adminSetDriverConnectionStatus: Mutation_adminSetDriverConnectionStatus,adminUpdateDriverLocation: Mutation_adminUpdateDriverLocation,assignDriverToOrder: Mutation_assignDriverToOrder,backfillSettlementsForDeliveredOrders: Mutation_backfillSettlementsForDeliveredOrders,cancelOrder: Mutation_cancelOrder,createBusiness: Mutation_createBusiness,createDeliveryZone: Mutation_createDeliveryZone,createOrder: Mutation_createOrder,createProduct: Mutation_createProduct,createProductCategory: Mutation_createProductCategory,createProductSubcategory: Mutation_createProductSubcategory,createUser: Mutation_createUser,deleteBusiness: Mutation_deleteBusiness,deleteDeliveryZone: Mutation_deleteDeliveryZone,deleteProduct: Mutation_deleteProduct,deleteProductCategory: Mutation_deleteProductCategory,deleteProductSubcategory: Mutation_deleteProductSubcategory,deleteUser: Mutation_deleteUser,driverHeartbeat: Mutation_driverHeartbeat,initiateSignup: Mutation_initiateSignup,login: Mutation_login,markSettlementAsPaid: Mutation_markSettlementAsPaid,markSettlementAsPartiallyPaid: Mutation_markSettlementAsPartiallyPaid,markSettlementsAsPaid: Mutation_markSettlementsAsPaid,resendEmailVerification: Mutation_resendEmailVerification,submitPhoneNumber: Mutation_submitPhoneNumber,unsettleSettlement: Mutation_unsettleSettlement,updateBusiness: Mutation_updateBusiness,updateCommissionPercentage: Mutation_updateCommissionPercentage,updateDeliveryZone: Mutation_updateDeliveryZone,updateDriverLocation: Mutation_updateDriverLocation,updateDriverOnlineStatus: Mutation_updateDriverOnlineStatus,updateOrderStatus: Mutation_updateOrderStatus,updateProduct: Mutation_updateProduct,updateProductCategory: Mutation_updateProductCategory,updateProductSubcategory: Mutation_updateProductSubcategory,updateProductsOrder: Mutation_updateProductsOrder,updateUser: Mutation_updateUser,updateUserNote: Mutation_updateUserNote,verifyEmail: Mutation_verifyEmail,verifyPhone: Mutation_verifyPhone },
      Subscription: { allOrdersUpdated: Subscription_allOrdersUpdated,auditLogCreated: Subscription_auditLogCreated,driverConnectionStatusChanged: Subscription_driverConnectionStatusChanged,driversUpdated: Subscription_driversUpdated,orderStatusUpdated: Subscription_orderStatusUpdated,settlementCreated: Subscription_settlementCreated,settlementStatusChanged: Subscription_settlementStatusChanged,userOrdersUpdated: Subscription_userOrdersUpdated },
      AuditLog: AuditLog,
AuditLogConnection: AuditLogConnection,
AuthResponse: AuthResponse,
Business: Business,
DeliveryZone: DeliveryZone,
DriverConnection: DriverConnection,
DriverHeartbeatResult: DriverHeartbeatResult,
Location: Location,
Order: Order,
OrderBusiness: OrderBusiness,
OrderItem: OrderItem,
Product: Product,
ProductCategory: ProductCategory,
ProductSubcategory: ProductSubcategory,
Settlement: Settlement,
SettlementSummary: SettlementSummary,
SignupStepResponse: SignupStepResponse,
User: { ...User_User,...Driver_User },
UserBehavior: UserBehavior,
WorkingHours: WorkingHours,
ZoneFeeResult: ZoneFeeResult,
Date: DateResolver,
DateTime: DateTimeResolver,
JSON: JSONResolver
    }