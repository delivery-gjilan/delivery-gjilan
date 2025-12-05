/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { business as Query_business } from './../models/Business/resolvers/Query/business';
import    { businesses as Query_businesses } from './../models/Business/resolvers/Query/businesses';
import    { categories as Query_categories } from './../models/Category/resolvers/Query/categories';
import    { category as Query_category } from './../models/Category/resolvers/Query/category';
import    { hello as Query_hello } from './../models/General/resolvers/Query/hello';
import    { order as Query_order } from './../models/Order/resolvers/Query/order';
import    { product as Query_product } from './../models/Product/resolvers/Query/product';
import    { productVariant as Query_productVariant } from './../models/ProductVariant/resolvers/Query/productVariant';
import    { productVariants as Query_productVariants } from './../models/ProductVariant/resolvers/Query/productVariants';
import    { products as Query_products } from './../models/Product/resolvers/Query/products';
import    { user as Query_user } from './../models/User/resolvers/Query/user';
import    { users as Query_users } from './../models/User/resolvers/Query/users';
import    { createBusiness as Mutation_createBusiness } from './../models/Business/resolvers/Mutation/createBusiness';
import    { createCategory as Mutation_createCategory } from './../models/Category/resolvers/Mutation/createCategory';
import    { createOrder as Mutation_createOrder } from './../models/Order/resolvers/Mutation/createOrder';
import    { createProduct as Mutation_createProduct } from './../models/Product/resolvers/Mutation/createProduct';
import    { createProductVariant as Mutation_createProductVariant } from './../models/ProductVariant/resolvers/Mutation/createProductVariant';
import    { createUser as Mutation_createUser } from './../models/User/resolvers/Mutation/createUser';
import    { deleteBusiness as Mutation_deleteBusiness } from './../models/Business/resolvers/Mutation/deleteBusiness';
import    { deleteCategory as Mutation_deleteCategory } from './../models/Category/resolvers/Mutation/deleteCategory';
import    { deleteProduct as Mutation_deleteProduct } from './../models/Product/resolvers/Mutation/deleteProduct';
import    { deleteProductVariant as Mutation_deleteProductVariant } from './../models/ProductVariant/resolvers/Mutation/deleteProductVariant';
import    { updateBusiness as Mutation_updateBusiness } from './../models/Business/resolvers/Mutation/updateBusiness';
import    { updateCategory as Mutation_updateCategory } from './../models/Category/resolvers/Mutation/updateCategory';
import    { updateProduct as Mutation_updateProduct } from './../models/Product/resolvers/Mutation/updateProduct';
import    { updateProductVariant as Mutation_updateProductVariant } from './../models/ProductVariant/resolvers/Mutation/updateProductVariant';
import    { Business } from './../models/Business/resolvers/Business';
import    { Category } from './../models/Category/resolvers/Category';
import    { Order } from './../models/Order/resolvers/Order';
import    { Product } from './../models/Product/resolvers/Product';
import    { ProductVariant } from './../models/ProductVariant/resolvers/ProductVariant';
import    { User } from './../models/User/resolvers/User';
    export const resolvers: Resolvers = {
      Query: { business: Query_business,businesses: Query_businesses,categories: Query_categories,category: Query_category,hello: Query_hello,order: Query_order,product: Query_product,productVariant: Query_productVariant,productVariants: Query_productVariants,products: Query_products,user: Query_user,users: Query_users },
      Mutation: { createBusiness: Mutation_createBusiness,createCategory: Mutation_createCategory,createOrder: Mutation_createOrder,createProduct: Mutation_createProduct,createProductVariant: Mutation_createProductVariant,createUser: Mutation_createUser,deleteBusiness: Mutation_deleteBusiness,deleteCategory: Mutation_deleteCategory,deleteProduct: Mutation_deleteProduct,deleteProductVariant: Mutation_deleteProductVariant,updateBusiness: Mutation_updateBusiness,updateCategory: Mutation_updateCategory,updateProduct: Mutation_updateProduct,updateProductVariant: Mutation_updateProductVariant },
      
      Business: Business,
Category: Category,
Order: Order,
Product: Product,
ProductVariant: ProductVariant,
User: User
    }