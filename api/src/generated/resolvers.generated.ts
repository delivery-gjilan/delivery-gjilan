/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { hello as Query_hello } from './../models/General/resolvers/Query/hello';
import    { order as Query_order } from './../models/Order/resolvers/Query/order';
import    { user as Query_user } from './../models/User/resolvers/Query/user';
import    { users as Query_users } from './../models/User/resolvers/Query/users';
import    { createOrder as Mutation_createOrder } from './../models/Order/resolvers/Mutation/createOrder';
import    { createUser as Mutation_createUser } from './../models/User/resolvers/Mutation/createUser';
import    { Address } from './../models/User/resolvers/Address';
import    { Order } from './../models/Order/resolvers/Order';
import    { User } from './../models/User/resolvers/User';
    export const resolvers: Resolvers = {
      Query: { hello: Query_hello,order: Query_order,user: Query_user,users: Query_users },
      Mutation: { createOrder: Mutation_createOrder,createUser: Mutation_createUser },
      
      Address: Address,
Order: Order,
User: User
    }