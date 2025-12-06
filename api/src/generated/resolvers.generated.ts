/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { business as Query_business } from './../models/Business/resolvers/Query/business';
import    { businesses as Query_businesses } from './../models/Business/resolvers/Query/businesses';
import    { order as Query_order } from './../models/Order/resolvers/Query/order';
import    { product as Query_product } from './../models/Product/resolvers/Query/product';
import    { productCategories as Query_productCategories } from './../models/ProductCategory/resolvers/Query/productCategories';
import    { productCategory as Query_productCategory } from './../models/ProductCategory/resolvers/Query/productCategory';
import    { productSubcategories as Query_productSubcategories } from './../models/ProductSubcategory/resolvers/Query/productSubcategories';
import    { productSubcategory as Query_productSubcategory } from './../models/ProductSubcategory/resolvers/Query/productSubcategory';
import    { products as Query_products } from './../models/Product/resolvers/Query/products';
import    { user as Query_user } from './../models/User/resolvers/Query/user';
import    { users as Query_users } from './../models/User/resolvers/Query/users';
import    { createBusiness as Mutation_createBusiness } from './../models/Business/resolvers/Mutation/createBusiness';
import    { createOrder as Mutation_createOrder } from './../models/Order/resolvers/Mutation/createOrder';
import    { createProduct as Mutation_createProduct } from './../models/Product/resolvers/Mutation/createProduct';
import    { createProductCategory as Mutation_createProductCategory } from './../models/ProductCategory/resolvers/Mutation/createProductCategory';
import    { createProductSubcategory as Mutation_createProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/createProductSubcategory';
import    { createUser as Mutation_createUser } from './../models/User/resolvers/Mutation/createUser';
import    { deleteBusiness as Mutation_deleteBusiness } from './../models/Business/resolvers/Mutation/deleteBusiness';
import    { deleteProduct as Mutation_deleteProduct } from './../models/Product/resolvers/Mutation/deleteProduct';
import    { deleteProductCategory as Mutation_deleteProductCategory } from './../models/ProductCategory/resolvers/Mutation/deleteProductCategory';
import    { deleteProductSubcategory as Mutation_deleteProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/deleteProductSubcategory';
import    { updateBusiness as Mutation_updateBusiness } from './../models/Business/resolvers/Mutation/updateBusiness';
import    { updateProduct as Mutation_updateProduct } from './../models/Product/resolvers/Mutation/updateProduct';
import    { updateProductCategory as Mutation_updateProductCategory } from './../models/ProductCategory/resolvers/Mutation/updateProductCategory';
import    { updateProductSubcategory as Mutation_updateProductSubcategory } from './../models/ProductSubcategory/resolvers/Mutation/updateProductSubcategory';
import    { Business } from './../models/Business/resolvers/Business';
import    { Location } from './../models/General/resolvers/Location';
import    { Order } from './../models/Order/resolvers/Order';
import    { OrderBusiness } from './../models/Order/resolvers/OrderBusiness';
import    { OrderItem } from './../models/Order/resolvers/OrderItem';
import    { Product } from './../models/Product/resolvers/Product';
import    { ProductCategory } from './../models/ProductCategory/resolvers/ProductCategory';
import    { ProductSubcategory } from './../models/ProductSubcategory/resolvers/ProductSubcategory';
import    { User } from './../models/User/resolvers/User';
import    { WorkingHours } from './../models/General/resolvers/WorkingHours';
import    { DateResolver } from 'graphql-scalars';
    export const resolvers: Resolvers = {
      Query: { business: Query_business,businesses: Query_businesses,order: Query_order,product: Query_product,productCategories: Query_productCategories,productCategory: Query_productCategory,productSubcategories: Query_productSubcategories,productSubcategory: Query_productSubcategory,products: Query_products,user: Query_user,users: Query_users },
      Mutation: { createBusiness: Mutation_createBusiness,createOrder: Mutation_createOrder,createProduct: Mutation_createProduct,createProductCategory: Mutation_createProductCategory,createProductSubcategory: Mutation_createProductSubcategory,createUser: Mutation_createUser,deleteBusiness: Mutation_deleteBusiness,deleteProduct: Mutation_deleteProduct,deleteProductCategory: Mutation_deleteProductCategory,deleteProductSubcategory: Mutation_deleteProductSubcategory,updateBusiness: Mutation_updateBusiness,updateProduct: Mutation_updateProduct,updateProductCategory: Mutation_updateProductCategory,updateProductSubcategory: Mutation_updateProductSubcategory },
      
      Business: Business,
Location: Location,
Order: Order,
OrderBusiness: OrderBusiness,
OrderItem: OrderItem,
Product: Product,
ProductCategory: ProductCategory,
ProductSubcategory: ProductSubcategory,
User: User,
WorkingHours: WorkingHours,
Date: DateResolver
    }