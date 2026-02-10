/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { business as Query_business } from './../models/Business/resolvers/Query/business';
import    { businesses as Query_businesses } from './../models/Business/resolvers/Query/businesses';
import    { drivers as Query_drivers } from './../models/User/resolvers/Query/drivers';
import    { me as Query_me } from './../models/User/resolvers/Query/me';
import    { order as Query_order } from './../models/Order/resolvers/Query/order';
import    { orders as Query_orders } from './../models/Order/resolvers/Query/orders';
import    { ordersByStatus as Query_ordersByStatus } from './../models/Order/resolvers/Query/ordersByStatus';
import    { product as Query_product } from './../models/Product/resolvers/Query/product';
import    { productCategories as Query_productCategories } from './../models/ProductCategory/resolvers/Query/productCategories';
import    { productCategory as Query_productCategory } from './../models/ProductCategory/resolvers/Query/productCategory';
import    { products as Query_products } from './../models/Product/resolvers/Query/products';
import    { uncompletedOrders as Query_uncompletedOrders } from './../models/Order/resolvers/Query/uncompletedOrders';
import    { users as Query_users } from './../models/User/resolvers/Query/users';
import    { assignDriverToOrder as Mutation_assignDriverToOrder } from './../models/Order/resolvers/Mutation/assignDriverToOrder';
import    { cancelOrder as Mutation_cancelOrder } from './../models/Order/resolvers/Mutation/cancelOrder';
import    { createBusiness as Mutation_createBusiness } from './../models/Business/resolvers/Mutation/createBusiness';
import    { createOrder as Mutation_createOrder } from './../models/Order/resolvers/Mutation/createOrder';
import    { createProduct as Mutation_createProduct } from './../models/Product/resolvers/Mutation/createProduct';
import    { createProductCategory as Mutation_createProductCategory } from './../models/ProductCategory/resolvers/Mutation/createProductCategory';
import    { createUser as Mutation_createUser } from './../models/User/resolvers/Mutation/createUser';
import    { deleteBusiness as Mutation_deleteBusiness } from './../models/Business/resolvers/Mutation/deleteBusiness';
import    { deleteProduct as Mutation_deleteProduct } from './../models/Product/resolvers/Mutation/deleteProduct';
import    { deleteProductCategory as Mutation_deleteProductCategory } from './../models/ProductCategory/resolvers/Mutation/deleteProductCategory';
import    { deleteUser as Mutation_deleteUser } from './../models/User/resolvers/Mutation/deleteUser';
import    { initiateSignup as Mutation_initiateSignup } from './../models/User/resolvers/Mutation/initiateSignup';
import    { login as Mutation_login } from './../models/User/resolvers/Mutation/login';
import    { resendEmailVerification as Mutation_resendEmailVerification } from './../models/User/resolvers/Mutation/resendEmailVerification';
import    { submitPhoneNumber as Mutation_submitPhoneNumber } from './../models/User/resolvers/Mutation/submitPhoneNumber';
import    { updateBusiness as Mutation_updateBusiness } from './../models/Business/resolvers/Mutation/updateBusiness';
import    { updateDriverLocation as Mutation_updateDriverLocation } from './../models/User/resolvers/Mutation/updateDriverLocation';
import    { updateOrderStatus as Mutation_updateOrderStatus } from './../models/Order/resolvers/Mutation/updateOrderStatus';
import    { updateProduct as Mutation_updateProduct } from './../models/Product/resolvers/Mutation/updateProduct';
import    { updateProductCategory as Mutation_updateProductCategory } from './../models/ProductCategory/resolvers/Mutation/updateProductCategory';
import    { updateUser as Mutation_updateUser } from './../models/User/resolvers/Mutation/updateUser';
import    { updateUserNote as Mutation_updateUserNote } from './../models/User/resolvers/Mutation/updateUserNote';
import    { verifyEmail as Mutation_verifyEmail } from './../models/User/resolvers/Mutation/verifyEmail';
import    { verifyPhone as Mutation_verifyPhone } from './../models/User/resolvers/Mutation/verifyPhone';
import    { allOrdersUpdated as Subscription_allOrdersUpdated } from './../models/Order/resolvers/Subscription/allOrdersUpdated';
import    { orderStatusUpdated as Subscription_orderStatusUpdated } from './../models/Order/resolvers/Subscription/orderStatusUpdated';
import    { userOrdersUpdated as Subscription_userOrdersUpdated } from './../models/Order/resolvers/Subscription/userOrdersUpdated';
import    { AuthResponse } from './../models/User/resolvers/AuthResponse';
import    { Business } from './../models/Business/resolvers/Business';
import    { Location } from './../models/General/resolvers/Location';
import    { Order } from './../models/Order/resolvers/Order';
import    { OrderBusiness } from './../models/Order/resolvers/OrderBusiness';
import    { OrderItem } from './../models/Order/resolvers/OrderItem';
import    { Product } from './../models/Product/resolvers/Product';
import    { ProductCategory } from './../models/ProductCategory/resolvers/ProductCategory';
import    { ProductSubcategory } from './../models/ProductSubcategory/resolvers/ProductSubcategory';
import    { SignupStepResponse } from './../models/User/resolvers/SignupStepResponse';
import    { User } from './../models/User/resolvers/User';
import    { WorkingHours } from './../models/General/resolvers/WorkingHours';
import    { DateResolver } from 'graphql-scalars';
    export const resolvers: Resolvers = {
      Query: { business: Query_business,businesses: Query_businesses,drivers: Query_drivers,me: Query_me,order: Query_order,orders: Query_orders,ordersByStatus: Query_ordersByStatus,product: Query_product,productCategories: Query_productCategories,productCategory: Query_productCategory,products: Query_products,uncompletedOrders: Query_uncompletedOrders,users: Query_users },
      Mutation: { assignDriverToOrder: Mutation_assignDriverToOrder,cancelOrder: Mutation_cancelOrder,createBusiness: Mutation_createBusiness,createOrder: Mutation_createOrder,createProduct: Mutation_createProduct,createProductCategory: Mutation_createProductCategory,createUser: Mutation_createUser,deleteBusiness: Mutation_deleteBusiness,deleteProduct: Mutation_deleteProduct,deleteProductCategory: Mutation_deleteProductCategory,deleteUser: Mutation_deleteUser,initiateSignup: Mutation_initiateSignup,login: Mutation_login,resendEmailVerification: Mutation_resendEmailVerification,submitPhoneNumber: Mutation_submitPhoneNumber,updateBusiness: Mutation_updateBusiness,updateDriverLocation: Mutation_updateDriverLocation,updateOrderStatus: Mutation_updateOrderStatus,updateProduct: Mutation_updateProduct,updateProductCategory: Mutation_updateProductCategory,updateUser: Mutation_updateUser,updateUserNote: Mutation_updateUserNote,verifyEmail: Mutation_verifyEmail,verifyPhone: Mutation_verifyPhone },
      Subscription: { allOrdersUpdated: Subscription_allOrdersUpdated,orderStatusUpdated: Subscription_orderStatusUpdated,userOrdersUpdated: Subscription_userOrdersUpdated },
      AuthResponse: AuthResponse,
Business: Business,
Location: Location,
Order: Order,
OrderBusiness: OrderBusiness,
OrderItem: OrderItem,
Product: Product,
ProductCategory: ProductCategory,
ProductSubcategory: ProductSubcategory,
SignupStepResponse: SignupStepResponse,
User: User,
WorkingHours: WorkingHours,
Date: DateResolver
    }