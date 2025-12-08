/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { business as Query_business } from './../models/Business/resolvers/Query/business';
import    { businesses as Query_businesses } from './../models/Business/resolvers/Query/businesses';
import    { me as Query_me } from './../models/User/resolvers/Query/me';
import    { order as Query_order } from './../models/Order/resolvers/Query/order';
import    { orders as Query_orders } from './../models/Order/resolvers/Query/orders';
import    { ordersByStatus as Query_ordersByStatus } from './../models/Order/resolvers/Query/ordersByStatus';
import    { product as Query_product } from './../models/Product/resolvers/Query/product';
import    { productCategories as Query_productCategories } from './../models/ProductCategory/resolvers/Query/productCategories';
import    { productCategory as Query_productCategory } from './../models/ProductCategory/resolvers/Query/productCategory';
import    { products as Query_products } from './../models/Product/resolvers/Query/products';
import    { cancelOrder as Mutation_cancelOrder } from './../models/Order/resolvers/Mutation/cancelOrder';
import    { createBusiness as Mutation_createBusiness } from './../models/Business/resolvers/Mutation/createBusiness';
import    { createProduct as Mutation_createProduct } from './../models/Product/resolvers/Mutation/createProduct';
import    { createProductCategory as Mutation_createProductCategory } from './../models/ProductCategory/resolvers/Mutation/createProductCategory';
import    { deleteBusiness as Mutation_deleteBusiness } from './../models/Business/resolvers/Mutation/deleteBusiness';
import    { deleteProduct as Mutation_deleteProduct } from './../models/Product/resolvers/Mutation/deleteProduct';
import    { deleteProductCategory as Mutation_deleteProductCategory } from './../models/ProductCategory/resolvers/Mutation/deleteProductCategory';
import    { initiateSignup as Mutation_initiateSignup } from './../models/User/resolvers/Mutation/initiateSignup';
import    { login as Mutation_login } from './../models/User/resolvers/Mutation/login';
import    { submitPhoneNumber as Mutation_submitPhoneNumber } from './../models/User/resolvers/Mutation/submitPhoneNumber';
import    { updateBusiness as Mutation_updateBusiness } from './../models/Business/resolvers/Mutation/updateBusiness';
import    { updateOrderStatus as Mutation_updateOrderStatus } from './../models/Order/resolvers/Mutation/updateOrderStatus';
import    { updateProduct as Mutation_updateProduct } from './../models/Product/resolvers/Mutation/updateProduct';
import    { updateProductCategory as Mutation_updateProductCategory } from './../models/ProductCategory/resolvers/Mutation/updateProductCategory';
import    { verifyEmail as Mutation_verifyEmail } from './../models/User/resolvers/Mutation/verifyEmail';
import    { verifyPhone as Mutation_verifyPhone } from './../models/User/resolvers/Mutation/verifyPhone';
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
      Query: { business: Query_business,businesses: Query_businesses,me: Query_me,order: Query_order,orders: Query_orders,ordersByStatus: Query_ordersByStatus,product: Query_product,productCategories: Query_productCategories,productCategory: Query_productCategory,products: Query_products },
      Mutation: { cancelOrder: Mutation_cancelOrder,createBusiness: Mutation_createBusiness,createProduct: Mutation_createProduct,createProductCategory: Mutation_createProductCategory,deleteBusiness: Mutation_deleteBusiness,deleteProduct: Mutation_deleteProduct,deleteProductCategory: Mutation_deleteProductCategory,initiateSignup: Mutation_initiateSignup,login: Mutation_login,submitPhoneNumber: Mutation_submitPhoneNumber,updateBusiness: Mutation_updateBusiness,updateOrderStatus: Mutation_updateOrderStatus,updateProduct: Mutation_updateProduct,updateProductCategory: Mutation_updateProductCategory,verifyEmail: Mutation_verifyEmail,verifyPhone: Mutation_verifyPhone },
      
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