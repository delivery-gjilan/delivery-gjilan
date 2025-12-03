/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { hello as Query_hello } from './../schemas/General/resolvers/Query/hello';
import    { order as Query_order } from './../schemas/Order/resolvers/Query/order';
import    { user as Query_user } from './../schemas/User/resolvers/Query/user';
import    { users as Query_users } from './../schemas/User/resolvers/Query/users';
import    { createUser as Mutation_createUser } from './../schemas/User/resolvers/Mutation/createUser';
import    { Address } from './../schemas/User/resolvers/Address';
import    { Order } from './../schemas/Order/resolvers/Order';
import    { User } from './../schemas/User/resolvers/User';
    export const resolvers: Resolvers = {
      Query: { hello: Query_hello,order: Query_order,user: Query_user,users: Query_users },
      Mutation: { createUser: Mutation_createUser },
      
      Address: Address,
Order: Order,
User: User
    }