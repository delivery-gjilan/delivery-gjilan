/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { business as Query_business } from './../models/Business/resolvers/Query/business';
import    { businesses as Query_businesses } from './../models/Business/resolvers/Query/businesses';
import    { hello as Query_hello } from './../models/General/resolvers/Query/hello';
import    { order as Query_order } from './../models/Order/resolvers/Query/order';
import    { user as Query_user } from './../models/User/resolvers/Query/user';
import    { users as Query_users } from './../models/User/resolvers/Query/users';
import    { createBusiness as Mutation_createBusiness } from './../models/Business/resolvers/Mutation/createBusiness';
import    { createOrder as Mutation_createOrder } from './../models/Order/resolvers/Mutation/createOrder';
import    { createUser as Mutation_createUser } from './../models/User/resolvers/Mutation/createUser';
import    { deleteBusiness as Mutation_deleteBusiness } from './../models/Business/resolvers/Mutation/deleteBusiness';
import    { updateBusiness as Mutation_updateBusiness } from './../models/Business/resolvers/Mutation/updateBusiness';
import    { Business } from './../models/Business/resolvers/Business';
import    { Order } from './../models/Order/resolvers/Order';
import    { User } from './../models/User/resolvers/User';
    export const resolvers: Resolvers = {
      Query: { business: Query_business,businesses: Query_businesses,hello: Query_hello,order: Query_order,user: Query_user,users: Query_users },
      Mutation: { createBusiness: Mutation_createBusiness,createOrder: Mutation_createOrder,createUser: Mutation_createUser,deleteBusiness: Mutation_deleteBusiness,updateBusiness: Mutation_updateBusiness },
      
      Business: Business,
Order: Order,
User: User
    }